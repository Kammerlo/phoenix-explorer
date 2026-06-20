# Connectors

Phoenix Explorer talks to Cardano backends through an **abstract connector
layer**. Pages never call an HTTP client directly; they go through
`ApiConnector.getApiConnector()` and let the active connector translate the
request into whatever shape the configured backend expects.

This document describes the architecture and walks through how to add a new
connector.

---

## Architecture

```
┌──────────────────────┐
│  React page / hook   │
└──────────┬───────────┘
           │ ApiConnector.getApiConnector().someMethod(...)
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│ ConnectorBase        │◄────┤ ApiConnector         │
│ (concrete defaults)  │     │ (abstract interface) │
└──────────┬───────────┘     └──────────────────────┘
           │ extends
   ┌───────┴──────┬──────────────┬──────────────┬──────────────┐
   ▼              ▼              ▼              ▼              ▼
GatewayConnector  BlockfrostConnector  YaciConnector  OgmiosConnector  (your new connector)
   │              │              │              │
   ▼              ▼              ▼              ▼
Express gateway   Blockfrost     Yaci Store     Ogmios WebSocket
     │              REST API      REST API       + Kupo REST API
     ▼
Blockfrost SDK
```

### Source map

- `packages/frontend/src/commons/connector/ApiConnector.ts` — the abstract
  interface. One abstract method per feature (`getEpochs`, `getBlocksPage`, …).
  Consumers depend on this type, not any concrete class.
- `packages/frontend/src/commons/connector/ConnectorBase.ts` — concrete default
  implementation of every abstract method. Each default returns an
  "unsupported" envelope. Subclasses only override what they actually serve.
- `packages/frontend/src/commons/connector/ConnectorFactory.ts` — chooses the
  concrete connector based on the `phoenix_provider` cookie / env fallback, and
  wires it into `ApiConnector.getApiConnector()`. Must be imported for
  side-effects in `index.tsx` before any call site.
- `packages/frontend/src/commons/connector/<name>/` — per-connector folder with
  the implementation, `types/` (backend-specific response shapes), `mapper/`
  (backend → shared DTO translations), and any utilities.
- `packages/shared/src/dtos/*.dto.ts` — shared DTOs. Backends map to these.
- `packages/shared/src/helpers/envelope.ts` — the envelope helpers
  (`envelope`, `errorEnvelope`, `unsupportedEnvelope`).

### Contract: `ApiReturnType<T>`

Every connector method returns `Promise<ApiReturnType<T>>`. The envelope is
defined in `packages/shared/src/APIReturnType.ts`:

```ts
interface ApiReturnType<T> {
  data: T | null;
  error?: string | null;
  total?: number;          // list pagination
  totalPage?: number;
  currentPage?: number;
  pageSize?: number;
  lastUpdated: number;     // milliseconds (Date.now())
}
```

`lastUpdated` is **milliseconds**, never seconds. Consumers that render it via
`FormNowMessage` rely on the `ts > 1e10` heuristic and will display decades-ago
dates if you pass a Unix-second timestamp here.

### Feature gating

Each connector advertises the feature buckets it supports via
`getSupportedFunctions(): FunctionEnum[]`.  `Routers.tsx` uses this list to
decide which routes to register — routes for unsupported features fall through
to `NotFound`.

This is the **single source of truth** for gating. The `unsupported()` envelope
returned by default methods is a defensive fallback for call sites that bypass
the route gate (search results, deep links, background polling) — consumers see
a clean `{ data: null | [], error: "Not supported by current provider: …",
lastUpdated }` instead of a silent zero or an unhandled rejection.

### Provider selection at runtime

- `src/stores/provider.ts` owns the active provider config, persisted in the
  `phoenix_provider` cookie (1-year max-age, `SameSite=Lax`).
- `src/components/commons/ProviderSwitcher/` lets the user switch connectors at
  runtime — writes the cookie, dispatches the Redux slice, and forces a
  reload.
- Default on first load: env vars from the monorepo root `.env`
  (`REACT_APP_API_TYPE`, `REACT_APP_API_URL`) seed the cookie.

---

## Built-in connectors

| Connector | Env | Backend | Strengths | Trade-offs |
|-----------|-----|---------|-----------|-----------|
| `GatewayConnector` | `GATEWAY` (default) | local Express gateway → Blockfrost | API key hidden server-side, cheap response caching (NodeCache, 5 min), pool-metadata batching | needs the gateway running |
| `BlockfrostConnector` | `BLOCKFROST` | Blockfrost REST API direct | no server component | API key is shipped in the JS bundle; local/demo use only |
| `YaciConnector` | `YACI` | [Yaci Store](https://github.com/bloxbean/yaci-store) REST API | devnet-friendly, works offline / on private networks | no built-in CDN; some endpoints partial coverage — see feature matrix |
| `OgmiosConnector` | `OGMIOS` | [Ogmios](https://ogmios.dev) WebSocket + [Kupo](https://cardanosolutions.github.io/kupo) REST API | lightweight node companion — no full indexer required; protocol params, current epoch, dashboard, pools, dreps, governance, address/stake balances, token holders; works in private/devnet environments | live-state only — all historical endpoints (blocks, transactions, epoch history, address tx history) return unsupported; Kupo must be running separately with `--match "*"` for token-by-policy/holder endpoints |

### Feature support matrix

| `FunctionEnum` | Gateway | Blockfrost | Yaci | Ogmios |
|----------------|:-------:|:----------:|:----:|:------:|
| `EPOCH` | ✅ | ✅ | ✅ | ⚠️ (current epoch only; history unsupported) |
| `BLOCK` | ✅ | ✅ | ✅ | ❌ |
| `TRANSACTION` | ✅ | ✅ | ✅ | ❌ |
| `ADDRESS` | ✅ | ✅ | ✅ | ⚠️ (balance/UTxOs only; tx history unsupported) |
| `POOL` | ✅ | ✅ | ⚠️ (pool list/detail work; pool-blocks/saturation/ROS not populated) | ⚠️ (list/detail only; blocks/history/ROS unsupported) |
| `POOL_REGISTRATION` | ❌ | ✅ | ✅ | ❌ |
| `TOKENS` | ✅ | ✅ | ✅ | ⚠️ (detail + holders/by-policy via Kupo; mint/burn history unsupported) |
| `GOVERNANCE` | ✅ | ✅ | ⚠️ (detail present; vote stats + anchor metadata not populated) | ⚠️ (active proposals list; historical votes unsupported) |
| `DREP` | ✅ | ✅ | ⚠️ (list/detail; vote totals not aggregated) | ⚠️ (list/detail; vote history unsupported) |
| `PROTOCOL_PARAMETER` | ✅ | ✅ | ✅ | ✅ |
| `STAKE_ADDRESS_REGISTRATION` | ❌ | ✅ | ✅ | ❌ |
| `SMART_CONTRACT` | ❌ | ❌ | ❌ | ❌ |
| `REWARDS` | ❌ | ❌ | ❌ | ❌ |
| `STAKING_LIFECYCLE` | ❌ | ❌ | ❌ | ❌ |
| `NETWORK_MONITORING` | ❌ | ❌ | ❌ | ❌ |
| `SUSTAINABILITY_INDICATORS` | ❌ | ❌ | ❌ | ❌ |
| Dashboard stats (no enum) | ✅ | ✅ | ⚠️ (Yaci lacks a network/supply endpoint; returns unsupported envelope) | ⚠️ (current epoch + tip only; supply/stake from Ogmios; historical unsupported) |

### Ogmios + Kupo

`OgmiosConnector` (`src/commons/connector/ogmios/ogmiosConnector.ts`) is a
**live-state-only** connector. It talks to an
[Ogmios](https://ogmios.dev) node-companion (WebSocket → JSON-RPC) for chain
state, and optionally to a [Kupo](https://cardanosolutions.github.io/kupo/)
UTxO-index REST API for address and token queries.

**What it serves:**

- Protocol parameters (current)
- Current epoch (number, progress, slot counts)
- Dashboard stats (tip block, current epoch, circulating supply, active stake)
- Pool list and detail (live stake, saturation; no block history, no ROS)
- DRep list and detail (live voting power; no vote history)
- Active governance proposals
- Address balance and UTxOs (via Kupo)
- Stake address balance (via Kupo)
- Token detail + holders / by-policy (via Kupo — requires `--match "*"`)
- Search (address and stake address lookups only)

**What it does NOT serve** (returns `unsupported` envelope / HTTP 501):

- Historical data: epoch list, block list/detail, transaction list/detail,
  address transaction history, token mint/burn history
- Stake or pool registration/retirement certificates
- Rewards, staking lifecycle, smart contracts

#### Gateway mode

Set `OGMIOS_URL` (and optionally `KUPO_URL`) in your root `.env`. The Express
gateway will forward eligible queries to Ogmios/Kupo and respond with HTTP 501
for any historical endpoint it cannot answer. `REACT_APP_API_TYPE` stays
`GATEWAY`; no change to the frontend cookie is needed.

```bash
OGMIOS_URL=https://your-ogmios-endpoint
KUPO_URL=https://your-kupo-endpoint
```

#### Direct browser mode

Set `REACT_APP_API_TYPE=OGMIOS` to bypass the gateway and have the frontend
connect directly to Ogmios and Kupo. Ogmios must have CORS enabled (or be
proxied) for this to work from the browser.

```bash
REACT_APP_API_TYPE=OGMIOS
REACT_APP_API_URL=https://your-ogmios-endpoint
REACT_APP_KUPO_URL=https://your-kupo-endpoint
```

#### Kupo indexing requirement

Token holder and by-policy endpoints require Kupo to be running with a
wildcard match pattern so it indexes all UTxOs:

```bash
kupo --match "*" ...
```

Without the wildcard pattern Kupo only indexes the addresses you told it to
watch, and token-holder / by-policy queries will return empty results.

#### Running against a local Ogmios + Kupo

```sh
# ogmios (assuming a running cardano-node)
ogmios --node-socket /path/to/node.socket --node-config /path/to/config.json

# kupo (wildcard, in-memory, against the same node)
kupo --node-socket /path/to/node.socket --node-config /path/to/config.json \
     --match "*" --in-memory

# then start the explorer against Ogmios directly
REACT_APP_API_TYPE=OGMIOS \
REACT_APP_API_URL=http://localhost:1337 \
REACT_APP_KUPO_URL=http://localhost:1442 \
npm run dev
```

---

## Adding a new connector

### 1. Pick a name and add an env value

Register the new type in the `phoenix_provider` config type and
`ConnectorFactory.ts`. Add an entry to `.env.example` documenting the base URL
and any credentials the backend needs.

### 2. Scaffold the folder

```
packages/frontend/src/commons/connector/<name>/
├── <name>Connector.ts     # extends ConnectorBase
├── mapper/                # backend → shared DTO functions
│   └── <BackendType>ToSharedDto.ts
└── types/                 # backend response shapes
    └── index.ts
```

### 3. Extend `ConnectorBase`, not `ApiConnector`

```ts
import { ConnectorBase } from "../ConnectorBase";
import { FunctionEnum } from "../types/FunctionEnum";

export class MyConnector extends ConnectorBase {
  constructor(baseUrl: string) {
    super(baseUrl);
  }

  getSupportedFunctions(): FunctionEnum[] {
    return [FunctionEnum.EPOCH, FunctionEnum.BLOCK /* only what you serve */];
  }

  async getEpochs(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<EpochOverview[]>> {
    return this.requestList<EpochOverview>(async () => {
      const r = await fetch(`${this.baseUrl}/epochs?${qs.stringify(pageInfo)}`).then(r => r.json());
      return {
        data: r.epochs.map(mapToEpochOverview),
        extras: { total: r.total, totalPage: r.totalPages }
      };
    });
  }
}
```

**Rules:**

1. Only override methods you actually implement. Anything unimplemented falls
   through to `ConnectorBase`'s `unsupported()` default — list methods return
   `{ data: [], error }`, object methods return `{ data: null, error }`.
2. Use `this.request(fn)` for object-returning methods and
   `this.requestList(fn)` for list-returning methods. Do not write your own
   `try { … } catch { return { error, lastUpdated: Date.now() } }`.
3. Return domain DTOs from `@shared/dtos/*.dto.ts`. Never let a backend-native
   type leak into consumer code.
4. **Do not** call `Date.now()` yourself — the envelope helpers do it for you.

### 4. Register in `ConnectorFactory.ts`

```ts
case ApiType.MY_BACKEND:
  return new MyConnector(config.baseUrl);
```

### 5. Add to `ProviderSwitcher`

Append an option in `src/components/commons/ProviderSwitcher/index.tsx` so
users can pick the new backend at runtime.

### 6. Smoke-test

With the connector cookie set, at minimum each of these pages should render
without console errors:

- `/` (home + dashboard stats)
- `/blocks` (list + pagination)
- `/block/<number>` (detail)
- `/transactions` (list)
- `/transaction/<hash>` (detail)
- every entry in your `getSupportedFunctions()` list

If a page renders empty, check the error message in the envelope — an
`"unsupported"` string means the method is falling through to
`ConnectorBase`'s default; either implement the method or remove the
`FunctionEnum` from `getSupportedFunctions()`.

---

## Testing & troubleshooting

### Running against a local Yaci Store

```sh
docker run -p 8080:8080 bloxbean/yaci-store:latest
# or use bloxbean/yaci-devkit for a full devnet
REACT_APP_API_TYPE=YACI REACT_APP_API_URL=http://localhost:8080/api/v1 npm run dev
```

### "Not supported by current provider: …" in the UI

A defensive-fallback message. Either the call site bypassed route gating
(e.g., a search result linking to an unsupported feature), or your
`getSupportedFunctions()` list claims the feature but the method isn't
overridden. Grep for the method name in your connector.

### "56171 years ago" in `FormNowMessage`

Your envelope put `lastUpdated` in seconds. Must be milliseconds
(`Date.now()`). The shared helpers (`envelope`, `errorEnvelope`,
`unsupportedEnvelope`) enforce this — use them.

### Envelopes without `data` in list responses

`ConnectorBase.getFooList` defaults to `{ data: [], error, lastUpdated }`.
`getFoo` (object) defaults to `{ data: null, error, lastUpdated }`. Consumers
should handle both cases — check `error` first, then use `data ?? defaultValue`
at the call site.
