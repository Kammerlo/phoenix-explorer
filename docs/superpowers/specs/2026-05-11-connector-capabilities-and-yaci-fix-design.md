# Connector Capabilities + Yaci-Store Fix — Design

**Date:** 2026-05-11
**Branch:** `fix/yaci-store-direct`
**Scope:** Replace the coarse `FunctionEnum` capability system with a typed, per-method capability model; gate sidebar, routes, in-page elements, and search by capability; correct yaci-store connector against the live swagger.

## Motivation

The yaci-store direct connector is broken in two distinct ways:

1. **Wrong endpoints.** The connector calls paths that don't exist in yaci-store (e.g. `/addresses/{addr}/txs` instead of `/transactions`, `/assets/{id}` instead of `/assets/unit/{unit}` or `/assets/fingerprint/{fingerprint}`, `/governance/proposals/{tx}/{idx}` instead of `/governance/proposals/{tx}` without index).
2. **Endpoints that don't exist at all.** Yaci-store has no list endpoints for `/epochs`, `/pools`, `/assets`, or `/governance/dreps`, and no general `/addresses/{addr}` or `/pools/{poolId}` endpoint. A lot of UI features genuinely can't be served.

The current capability mechanism (`FunctionEnum`, returned by `ApiConnector.getSupportedFunctions()`) is too coarse: a single `TOKENS` flag claims yaci supports tokens, but yaci has no list and no holders endpoint, only detail-by-id.

We need a finer model that hides UI elements when the active connector can't supply them, plus a corrected yaci-store implementation.

## Goals

- Per-method capability declaration, one `Capability` constant per `ApiConnector` method.
- Compile-time guard: `Capability` constants are checked against real method names.
- Capability gating at four surfaces: sidebar, routes, in-page elements (tabs/cards), search categories.
- Provider switch at runtime refreshes gating without a reload.
- Yaci-store connector: every supported method calls a real endpoint with the correct schema; the rest are dropped from `getCapabilities()`.
- No tooltips or "not supported" banners — hidden items just disappear.
- Generic and extensible: works for any future connector. No yaci-specific hard-coding in the gating layer.

## Non-Goals

- No new logging, metrics, or telemetry around capability misses.
- No plugin-system capability gating (`PhoenixPlugin.manifest.requiresCapabilities?`) — left as a future extension.
- No automatic swagger-driven type codegen — yaci types are hand-maintained against the swagger.
- No revisit of `BlockfrostConnector` / `GatewayConnector` method-by-method capabilities beyond a 1:1 conversion of the existing `FunctionEnum` set to the new `Capability` set.
- No backwards-compatibility shim for `FunctionEnum` — it's removed.

## Architecture

### Capability model

```ts
// packages/frontend/src/commons/connector/types/Capability.ts
export const ALL_CAPABILITIES = [
  "getEpochs", "getEpoch",
  "getBlocksPage", "getBlocksByEpoch", "getBlockDetail", "getPoolBlocks",
  "getTxDetail", "getTransactions",
  "getWalletAddressFromAddress", "getAddressTxsFromAddress", "getWalletStakeFromAddress",
  "getStakeAddressRegistrations", "getStakeDelegations",
  "getPoolRegistrations", "getPoolList", "getPoolDetail",
  "getCurrentProtocolParameters",
  "getTokensPage", "getTokenDetail", "getTokenTransactions", "getTokenHolders", "getTokensByPolicy",
  "getGovernanceOverviewList", "getGovernanceDetail", "getGovernanceActionVotes",
  "getDreps", "getDrep", "getDrepVotes", "getDrepDelegates",
  "search", "getDashboardStats",
] as const;

export type Capability = typeof ALL_CAPABILITIES[number];

// Compile-time check: every Capability must be a real ApiConnector method.
// If you add an abstract method to ApiConnector without updating ALL_CAPABILITIES,
// TS reports an error here.
type AsyncMethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => Promise<unknown> ? K : never;
}[keyof T];

type _CapabilitiesAreMethodNames = Capability extends AsyncMethodNames<ApiConnector> ? true : never;
```

On `ApiConnector`:

```ts
abstract getCapabilities(): ReadonlySet<Capability>;

has(c: Capability): boolean { return this.getCapabilities().has(c); }
hasAll(cs: readonly Capability[]): boolean { return cs.every((c) => this.has(c)); }
```

`getSupportedFunctions()` and `FunctionEnum` are removed.

### Dev-mode drift check

`ConnectorFactory.ts` calls `verifyCapabilityImplementations(connector)` once per constructed connector. For each `Capability`, the helper compares the subclass's method against `ConnectorBase.prototype` and emits `console.warn` if:

- A capability is declared but the method is inherited from `ConnectorBase` (i.e. unsupported default), or
- A capability is undeclared but the method is overridden.

Runs only when `import.meta.env.DEV` is true; never throws, never gates UI.

### Surface 1 — Sidebar

`menus.ts` becomes a function `buildMenus(connector: ApiConnector): Menu[]` instead of a module-level const. Menu items gain an optional `capability?: Capability | Capability[]` field. A `filterMenusByCapabilities` pass strips items whose capability is missing and collapses parent groups left with no visible children.

```ts
{ title: "Epochs", href: routers.EPOCH_LIST, capability: "getEpochs" },
{ title: "Tokens", href: routers.TOKEN_LIST, capability: "getTokensPage" },
{ title: "Pools",  href: routers.POOLS,      capability: "getPoolList" },
```

The Sidebar component uses a `useMenus()` hook that subscribes to the Redux `provider` slice, so provider switches refresh the sidebar without a reload. This also fixes a latent module-load-time snapshot bug.

### Surface 2 — Routes

`Routers.tsx` replaces `isSupportedElement(Component, FunctionEnum.X)` with `requireCapability(Component, "methodName")` (or `requireCapability(Component, ["a", "b"])` for multi-cap). Missing capability → `<NotFound />` fall-through, same UX as today.

Detail routes require only the *detail* method, not the list method, so direct URLs to detail pages (`/block/123`, `/token/asset1...`, `/governance-action/{tx}/{idx}`) keep working when only the detail capability is supported.

### Surface 3 — In-page elements

Two helpers in `commons/connector/capabilities/`:

```ts
useCapability(cap: Capability): boolean        // React hook, re-runs on provider change
withCapability<T>(cap, render, fallback?): T   // for tab-array filtering
```

Pages call `apiConnector.has("getX")` directly (synchronous, non-reactive) or `useCapability("getX")` (reactive across provider switches). Concrete adoption in this PR:

- `Home` page: hide the Native Tokens card when `getTokensPage` is missing; hide the Top Pools card when `getPoolList` is missing.
- Tab arrays on `PoolDetail`, `DrepDetail`, `TokenDetail`, `AddressDetail`: filter sections whose data fetch capability is missing.
- Per the user decision: hidden elements simply disappear. No tooltips, no greyed-out states, no notes.

### Surface 4 — Search

A small helper `filterSearchResultsByCapabilities(results, connector)` maps each `SearchResult.type` (`"epoch"`, `"block"`, `"transaction"`, `"address"`, `"stake"`, `"pool"`, `"drep"`, `"token"`, `"policy"`, `"gov_action"`) to the detail capability required to view it, and drops results whose detail page would 404. Applied as the final step in any search call site. Avoids the case where a connector's `search()` returns a result whose detail route is hidden.

## Yaci-store connector — fix list

Derived from the live swagger at `http://192.168.1.4:8080/v3/api-docs`. Yaci-store paths are prefixed with `/api/v1/`. The frontend's `baseUrl` already includes this prefix; verify per environment.

### Methods kept and fixed

| Method | Yaci-store path | Notes |
|---|---|---|
| `getBlocksPage` | `GET /blocks` | Verify `BlocksPage` schema (`blocks`, `total`, `totalPages`). |
| `getBlocksByEpoch` | `GET /blocks/epoch/{epoch}` | Same schema. |
| `getBlockDetail` | `GET /blocks/{numberOrHash}` | Accepts either number or hash. |
| `getPoolBlocks` | `GET /blocks/pool/{poolId}` | New impl — currently not wired. |
| `getTransactions` | `GET /txs` (paged) or `GET /blocks/{block}/txs` | Two code paths preserved. |
| `getTxDetail` | `GET /txs/{txHash}` + `/utxos` + `/metadata` + `/witnesses` + `/withdrawals` | Compose from sub-endpoints. |
| `getAddressTxsFromAddress` | `GET /addresses/{address}/transactions` | Path rename from `/txs`. |
| `getStakeAddressRegistrations` | `GET /stake/registrations` or `/deregistrations` | Verify schema. |
| `getStakeDelegations` | `GET /stake/delegations` | Verify schema. |
| `getPoolRegistrations` | `GET /pools/registrations` or `/retirements` | Verify schema. |
| `getCurrentProtocolParameters` | `GET /epochs/latest/parameters` | Verify schema; mapper untouched if shape stable. |
| `getTokenDetail` | `GET /assets/unit/{unit}` or `/assets/fingerprint/{fingerprint}` | Detect input format (asset1… → fingerprint path; hex → unit path). |
| `getTokenTransactions` | `GET /assets/{unit}/transactions` | Requires unit (policyId+assetName hex), not fingerprint. |
| `getGovernanceOverviewList` | `GET /governance/proposals` | Verify pagination shape. |
| `getGovernanceDetail` | `GET /governance/proposals/{txHash}` | Index parameter ignored — yaci uses txHash alone. |
| `getGovernanceActionVotes` | `GET /governance/proposals/{txHash}/{indexInTx}/votes` | Path correction from `/voting_procedures`. |
| `getDrepDelegates` | `GET /governance/delegation-votes/drep/{dRepId}` | Path correction. |
| `getDrepVotes` | `GET /governance/votes` filtered by drep | Path correction. |
| `getDashboardStats` | Composed from `/blocks/latest` + `/epochs/latest` + `/epochs/latest/parameters` | Reduced — fields yaci can't supply are left null. |
| `search` | Per-category probes against above endpoints | Categories the connector can't serve (e.g. epoch lookup) are dropped from result types. |

### Methods declared unsupported (removed from `getCapabilities()`)

`getEpochs`, `getEpoch`, `getWalletAddressFromAddress`, `getWalletStakeFromAddress`, `getTokensPage`, `getTokenHolders`, `getTokensByPolicy`, `getPoolList`, `getPoolDetail`, `getDreps`, `getDrep`.

These inherit `ConnectorBase`'s default-unsupported impl, which returns `unsupportedEnvelope(methodName)` — used as a defensive backstop for any call site that bypasses gating.

### Schemas and mappers

`yaci/types.ts` is regenerated by hand from the swagger `components.schemas` block. Invented types (`YaciAsset`, `YaciPool`, `YaciDrep`) that don't match the swagger are removed. Mappers under `yaci/mapper/` are updated so:

- Required numeric fields that yaci doesn't return are left `null` on the DTO (not `?? 0` silently) so the UI can detect them.
- `lastUpdated` stays in milliseconds per existing convention.
- Time fields keep using Unix-second strings to match the rest of the codebase (`Block.time`, etc.).

### Resulting yaci-store sidebar

Dashboard, Blockchain → Blocks, Transactions, Governance Actions. Epochs / Tokens / Pools / DReps are hidden. Detail pages (e.g. `/block/N`, `/token/asset1…`, `/governance-action/{tx}/{idx}`) still resolve when reached by direct URL because their detail capabilities are supported.

## File-level shape

### New files

```
packages/frontend/src/commons/connector/
├── types/
│   └── Capability.ts                          # ALL_CAPABILITIES, Capability type, type guard
└── capabilities/
    ├── filterMenus.ts
    ├── filterSearchResults.ts
    ├── requireCapability.tsx                  # replaces isSupportedElement
    ├── useCapability.ts                       # React hook
    ├── verifyCapabilityImplementations.ts     # dev-mode drift check
    ├── filterMenus.test.ts
    ├── filterSearchResults.test.ts
    ├── requireCapability.test.tsx
    └── useCapability.test.tsx
```

### Modified files

```
packages/frontend/src/
├── commons/
│   ├── connector/
│   │   ├── ApiConnector.ts                    # add getCapabilities/has/hasAll; remove getSupportedFunctions
│   │   ├── ConnectorBase.ts                   # no functional change (defaults stay)
│   │   ├── ConnectorFactory.ts                # call verifyCapabilityImplementations in dev
│   │   ├── blockfrost/blockfrostConnector.ts  # FunctionEnum set → Capability set (1:1)
│   │   ├── gateway/gatewayConnector.ts        # FunctionEnum set → Capability set (1:1)
│   │   ├── yaci/
│   │   │   ├── yaciConnector.ts               # substantial rewrite per fix list
│   │   │   ├── types.ts                       # regenerated against swagger
│   │   │   └── mapper/*.ts                    # mappers updated for current schema
│   │   └── types/FunctionEnum.ts              # FunctionEnum removed; POOL_TYPE kept
│   └── menus.ts                               # const menus → function buildMenus(connector)
├── Routers.tsx                                # isSupportedElement → requireCapability
└── components/
    ├── commons/Layout/Sidebar/                # useMenus() hook instead of module-level menus
    └── (in-page tab arrays per Surface 3)     # filter by useCapability
```

### Deleted

- `commons/connector/connector-helpers.ts` if `isSupportedElement` lives there — folded into `requireCapability.tsx`.

## Error handling

`ConnectorBase.request()` and `requestList()` already wrap every connector method in try/catch and emit `errorEnvelope(...)`. No change. Endpoints that yaci-store 404s / 500s on surface via the existing error envelope path.

A UI element that bypasses gating (deep link, plugin, stale cache) and calls an unsupported method hits `ConnectorBase`'s default-unsupported impl, which returns `unsupportedEnvelope("methodName")`. No throw. Pages already render `error` from `ApiReturnType` via `<FetchDataErr />` / `<Alert>`.

## Provider switch behaviour

- Redux `provider` slice is the source of truth (already cookie-persisted via `phoenix_provider`).
- `useCapability(cap)` reads via `useSelector` on the provider slice. Provider switch → re-render → updated capability set → updated visibility.
- `Sidebar` calls `useMenus()` per render rather than importing a module-level constant. Provider switch → new menu list.
- If the user is on a route that becomes unsupported after switching providers, the route's `requireCapability` falls through to `<NotFound />` on next render. Acceptable per existing UX.

## Testing

Jest tests fitting the existing `*.test.tsx` pattern:

- `Capability.ts` — type test compiles (no runtime test).
- `ConnectorBase.test.ts` — `has()` / `hasAll()` membership against a fixture subclass.
- `filterMenus.test.ts` — entries hidden when capability missing; parent collapses when all children hidden.
- `filterSearchResults.test.ts` — search results filtered against fixture capability sets.
- `requireCapability.test.tsx` — renders element vs. `NotFound`.
- `useCapability.test.tsx` — re-renders on provider slice change.
- `verifyCapabilityImplementations.test.ts` — warns on drift, silent when aligned.
- `yaciConnector.test.ts` — one happy-path test per fixed method against mocked axios responses keyed to swagger schemas; one assertion per unsupported method that it inherits the default `unsupportedEnvelope` and that `getCapabilities()` excludes it.

## Open questions

None blocking. Plugin-system capability gating (`requiresCapabilities` on `PhoenixPlugin.manifest`) is intentionally deferred.
