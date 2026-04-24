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
   ┌───────┴──────┬──────────────┬──────────────┐
   ▼              ▼              ▼              ▼
GatewayConnector  BlockfrostConnector  YaciConnector  (your new connector)
   │              │              │
   ▼              ▼              ▼
Express gateway   Blockfrost     Yaci Store
     │              REST API      REST API
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

### Feature support matrix

| `FunctionEnum` | Gateway | Blockfrost | Yaci |
|----------------|:-------:|:----------:|:----:|
| `EPOCH` | ✅ | ✅ | ✅ |
| `BLOCK` | ✅ | ✅ | ✅ |
| `TRANSACTION` | ✅ | ✅ | ✅ |
| `ADDRESS` | ✅ | ✅ | ✅ |
| `POOL` | ✅ | ✅ | ⚠️ (pool list/detail work; pool-blocks/saturation/ROS not populated) |
| `POOL_REGISTRATION` | ❌ | ✅ | ✅ |
| `TOKENS` | ✅ | ✅ | ✅ |
| `GOVERNANCE` | ✅ | ✅ | ⚠️ (detail present; vote stats + anchor metadata not populated) |
| `DREP` | ✅ | ✅ | ⚠️ (list/detail; vote totals not aggregated) |
| `PROTOCOL_PARAMETER` | ✅ | ✅ | ✅ |
| `STAKE_ADDRESS_REGISTRATION` | ❌ | ✅ | ✅ |
| `SMART_CONTRACT` | ❌ | ❌ | ❌ |
| `REWARDS` | ❌ | ❌ | ❌ |
| `STAKING_LIFECYCLE` | ❌ | ❌ | ❌ |
| `NETWORK_MONITORING` | ❌ | ❌ | ❌ |
| `SUSTAINABILITY_INDICATORS` | ❌ | ❌ | ❌ |
| Dashboard stats (no enum) | ✅ | ✅ | ⚠️ (Yaci lacks a network/supply endpoint; returns unsupported envelope) |

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
