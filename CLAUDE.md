# Phoenix Explorer — Claude Code Knowledge Base

## Project Overview

Cardano blockchain explorer (fork of `cardano-foundation/cf-explorer-frontend`, revived and actively maintained). Live deployment: [phoenix-explorer.org](https://phoenix-explorer.org).

- **Frontend**: React 18.3.1, TypeScript, MUI v7 (+ `@mui/lab`, `@mui/x-tree-view`), Redux Toolkit v2, React Router v7, Highcharts v11, react-icons v4.6, date-fns v4, Vite 5 (with `@vitejs/plugin-react`, automatic JSX transform — **no `import React` needed** in component files)
- **Gateway**: Node.js + Express 5, Blockfrost SDK v6, `ts-node-dev` in dev, `tsc` build → `dist/`
- **Shared**: `cardano-explorer-shared` package exposing DTOs and API types as `@shared/*`
- **Monorepo**: npm workspaces — `packages/frontend`, `packages/gateway`, `packages/shared`

```
phoenix-explorer/
├── packages/
│   ├── frontend/   # React SPA (Vite)
│   ├── gateway/    # Express 5 gateway (Blockfrost proxy + response cache)
│   └── shared/     # DTOs + API types + tx tag / epoch helpers
├── docs/
├── .github/workflows/docker-publish.yml
├── docker-compose.yml
├── .env.example
├── tsconfig.base.json
└── package.json    # workspaces: "packages/*"
```

Root `npm run dev` uses `concurrently` to run the `gateway` and `frontend` workspaces side-by-side. See [`package.json`](package.json).

---

## Architecture: Three-Connector System

Pages fetch data through an abstract `ApiConnector` class (`src/commons/connector/ApiConnector.ts`) with three implementations:

| Connector | Mode | File | When used |
|-----------|------|------|-----------|
| `GatewayConnector` | `GATEWAY` (default) | `src/commons/connector/gateway/gatewayConnector.ts` | Frontend → local Express gateway → Blockfrost. API key stays server-side; gateway adds response caching (NodeCache, 5 min TTL). |
| `BlockfrostConnector` | `BLOCKFROST` | `src/commons/connector/blockfrost/blockfrostConnector.ts` | Frontend → Blockfrost directly from the browser. API key visible in the JS bundle — quick local testing only. |
| `YaciConnector` | `YACI` | `src/commons/connector/yaci/yaciConnector.ts` | Frontend → [Yaci Store](https://github.com/bloxbean/yaci-store) REST API. Local devnet / private networks. Most feature-complete. |

**Usage pattern in all pages:**
```typescript
const apiConnector = ApiConnector.getApiConnector();
apiConnector.someMethod(...).then(data => { ... });
```

**Initialization:** `ConnectorFactory.ts` **must be imported for side effects** in [`index.tsx`](packages/frontend/src/index.tsx) as the first import — it registers a factory with `ApiConnector`. Without this, `getApiConnector()` throws.

**Connector selection:** `ConnectorFactory` reads `loadProviderConfig()` from `src/stores/provider.ts`. The active config lives in the `phoenix_provider` cookie (1-year `max-age`, `SameSite=Lax`). On first load, env defaults seed it. Changing the provider at runtime via the `ProviderSwitcher` UI (`src/components/commons/ProviderSwitcher/index.tsx`) writes a new cookie and re-dispatches the Redux slice. A one-time migration reads the old `phoenix_provider_config` localStorage key and moves it to the cookie.

**Feature gating:** Each connector returns `getSupportedFunctions(): FunctionEnum[]`. [`Routers.tsx`](packages/frontend/src/Routers.tsx) wraps each route with `isSupportedElement(Component, FunctionEnum.X)` so unsupported routes fall through to `NotFound` when the active connector can't serve them.

**All connectors use `Date.now()` (milliseconds) for `lastUpdated`** in `ApiReturnType`. See [Timestamp Conventions](#timestamp-conventions).

---

## Gateway (Express Server)

Entry point: [`packages/gateway/src/server.ts`](packages/gateway/src/server.ts) → `app.ts`.

### Routes mounted on `/api/*`

| Path | Controller | Notes |
|------|-----------|-------|
| `/api/epochs` | `epoch-controller.ts` | |
| `/api/blocks` | `block-controller.ts` | Pages through `blocksPrevious`; batches pool-metadata lookups; honours `skipMeta=true` for bulk/chart requests |
| `/api/transactions` | `transaction-controller.ts` | |
| `/api/tokens` | `token-controller.ts` | Detail includes mint/burn analytics via `API.assetsHistoryAll()` |
| `/api/governance` | `governance-controller.ts` | |
| `/api/addresses` | `address-controller.ts` | |
| `/api/pools` | `pool-controller.ts` | |
| `/api/protocol-params` | `protocol-params-controller.ts` | Returns a flat protocol-parameter object (see DTO shape in that file) |
| `/api/dashboard` | `dashboard-controller.ts` | `GET /api/dashboard/stats` — current epoch, latest block, supply, stake |
| `/api/search` | `search-controller.ts` | |

All handlers return `ApiReturnType<T>` where applicable, with `lastUpdated: Date.now()`.

### Config & cache

- [`config/env.ts`](packages/gateway/src/config/env.ts): loads `.env` from the **monorepo root** (`path.resolve(__dirname, "../../../../.env")`). Exposes `API_KEY`, `PORT` (default 3000), `HOST` (default `0.0.0.0`), `NETWORK` (default `mainnet`).
- [`config/blockfrost.ts`](packages/gateway/src/config/blockfrost.ts): singleton `BlockFrostAPI` instance.
- [`config/cache.ts`](packages/gateway/src/config/cache.ts): `NodeCache` with 5-minute default TTL. Helpers: `getEpoch`, `getBlock`, `getTransactions`, `getTxMetadata`, `getUtxos`, `getTxDetail`, `fetchAddressTotal`.

### TypeScript paths

`tsconfig.json` (dev) aliases `@shared/*` → `../shared/src/*`. `tsconfig.build.json` aliases `@shared/*` → `../shared/dist/*` so the compiled output imports from the shared package's **built** files. In the Docker runtime stage, `packages/shared/dist` is copied to `node_modules/@shared` — enums emit real JS that must be resolvable at runtime.

---

## Frontend Structure

### Stores (Redux Toolkit + redux-persist)

[`src/stores/index.tsx`](packages/frontend/src/stores/index.tsx) combines four slices:

| Slice | File | Persistence |
|-------|------|-------------|
| `system` | `system.ts` | not persisted |
| `toast` | `toast.ts` | not persisted |
| `theme` | `theme.ts` | `redux-persist` to localStorage, `blacklist: ["isDark"]` |
| `provider` | `provider.ts` | **cookie** `phoenix_provider` (not redux-persist) |

Each slice exports a `setStore*` hook that the combined store calls after `configureStore`, so dispatchers outside React components can still reach the store.

### Routing

[`src/Routers.tsx`](packages/frontend/src/Routers.tsx) uses `React.lazy` + `<Suspense>` for every page. Route paths and helpers live in [`src/commons/routers.ts`](packages/frontend/src/commons/routers.ts). Uses `react-router-dom` v7 (`useParams`, `useNavigate`). **Never use `window.location.href` for in-app navigation.**

Detail route helpers:
```typescript
details.block(blockNoOrHash)        // /block/:blockId
details.epoch(epochNo)              // /epoch/:epochId
details.token(fingerprint)          // /token/:tokenId
details.transaction(hash)           // /transaction/:trxHash
details.delegation(poolId)          // /pool/:poolId
details.address(address)            // /address/:address
details.stake(stakeId)              // /stake-address/:stakeId
details.policyDetail(policyId)      // /policy/:policyId
details.drep(drepId)                // /drep/:drepId
details.governanceAction(tx, idx)   // /governance-action/:txHash/:index
details.governanceActionList()      // /governance-actions
```

### Plugin system

[`src/plugins/`](packages/frontend/src/plugins/) — slot-based runtime extension points.

- `PluginSlotName` (in `types.ts`): `"transaction-detail"`, `"address-detail"`, `"token-detail"`, `"block-detail"`, `"governance-detail"`, `"drep-detail"`, `"pool-detail"`, `"home-dashboard"`, `"global-sidebar"`.
- `PhoenixPlugin` = `{ manifest, Component, onLoad?, onUnload? }`. `manifest.metadataLabels?: number[]` lets a plugin declare CIP metadata labels it can decode (e.g. `[721]` = CIP-25).
- `pluginRegistry` (singleton in `PluginRegistry.ts`) — `register`, `unregister`, `getPluginsForSlot`, `getPluginsForMetadataLabel`, enabled-state toggle persisted under localStorage key `phoenix_plugin_enabled_state`.
- `registerAllPlugins()` in `registerPlugins.ts` is called from [`App.tsx`](packages/frontend/src/App.tsx) on module load. Sample plugins live in `plugins/samples/` (`cip25-nft-viewer`, `cf-reeve-viewer`).
- `PluginSlotRenderer` takes `slot`, `context` ({ `data`, `network`, `apiConnector` }) and renders all enabled plugins for that slot.
- `PluginManager` page at route `/plugins` lets the user toggle enabled plugins.

### Themes

[`src/themes/`](packages/frontend/src/themes/) — MUI theme customisation.

**Breakpoints** (8, from [`breakpoints.ts`](packages/frontend/src/themes/breakpoints.ts)): `xs` 0, `sm` 600, `md` 900, `lg` 1200, `laptop` 1440, `xl` 1536, `hd` 1710, `fhd` 1920.

**Palette:** `primary`, `secondary`, plus custom buckets (`primary.100..500`, `primary.dark`, `primary.iconBorder`) and a parallel `primaryDarkmode` set. Dark mode is gated by `theme.isDark` (custom flag on the theme).

**Theme access:** Always use `theme.palette.*` / `theme.isDark` — never raw hex. `theme.palette.divider` does **not** exist in `CustomPalette`; use:
```typescript
theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e0e0e0"
```

### Vite build

[`vite.config.ts`](packages/frontend/vite.config.ts):
- `envDir: rootDir` → Vite reads the **monorepo root** `.env`. Variables must be prefixed `REACT_APP_` to be exposed.
- `base: "/"`, `build.outDir: "build"`, target `esnext`.
- `@vitejs/plugin-react` with `@emotion/react` JSX import source + `@emotion/babel-plugin`.
- `vite-tsconfig-paths` resolves the `@shared/*` TS path alias.
- `vite-plugin-svgr` lets you `import X from "./foo.svg?react"` as a component.

Frontend build output: `packages/frontend/build/`.

---

## Data Types

### `ApiReturnType<T>` (from `@shared/APIReturnType`)
```typescript
{
  data: T | null;
  error?: string | null;
  total?: number;
  totalPage?: number;
  currentPage?: number;
  pageSize?: number;
  lastUpdated: number;  // milliseconds (Date.now())
}
```
Only `data` and `lastUpdated` are required; the rest are optional pagination fields.

### Key DTOs (from `@shared/dtos/`)

| DTO | File | Notes |
|-----|------|-------|
| `Block` | `block.dto.ts` | `blockNo`, `epochNo`, `epochSlotNo`, `slotNo`, `hash`, `slotLeader?`, `time` (Unix seconds **string**), `txCount`, `size?`, `poolName?`, `poolTicker?`, `poolView?`, `previousBlock?`, `nextBlock?` |
| `Transaction` | `transaction.dto.ts` | Includes `tags?: TxTag[]` pre-computed by the gateway |
| `TransactionDetail` | `transaction.dto.ts` | Deep shape: `tx`, `summary`, `utxOs`, `mints`, `delegations`, `withdrawals`, `poolCertificates`, `stakeCertificates`, `metadata`, etc. |
| `TxTag` | `transaction.dto.ts` | `"transfer" \| "token" \| "mint" \| "stake" \| "pool" \| "script" \| "governance"` |
| `EpochOverview` | `epoch.dto.ts` | `outSum`, `fees`, `activeStake`, `rewardsDistributed` (all in lovelace); `status: EpochStatus` |
| `EpochStatus` | `epoch.dto.ts` | `FINISHED \| REWARDING \| IN_PROGRESS \| SYNCING` |
| `ITokenOverview` | `token.dto.ts` | List endpoint returns only a subset — see [Token List vs Detail](#token-list-vs-token-detail) |
| `PoolDetail`, `PoolOverview` | `pool.dto.ts` | |
| `Drep`, `DrepDelegates` | `drep.dto.ts` | |
| `AddressDetail`, `StakeAddressDetail` | `address.dto.ts` | |
| `GovernanceActionListItem`, `GovernanceActionDetail`, `GovActionVote` | `GovernanceOverview.ts` | |
| `SearchResult` | `seach.dto.ts` | *(typo in filename — `seach`, not `search`)* |

### Helpers (`@shared/helpers/`)

- [`txTags.ts`](packages/shared/src/helpers/txTags.ts): `computeTxTags(tx)` derives `TxTag[]` from Blockfrost tx counts. `computeTotalLovelaceOutput` sums lovelace-unit outputs. **Shared between gateway controllers and `BlockfrostConnector`** so both produce the same `tags` values.
- [`epochHelpers.ts`](packages/shared/src/helpers/epochHelpers.ts): `getEpochStatus`, `getEpochProgress`, `computeEpochSlotNo`, and the constant `MAINNET_EPOCH_MAX_SLOT = 432000`.

### `DashboardStats` (frontend-only)

Defined in [`src/components/Home/DashboardStats/index.tsx`](packages/frontend/src/components/Home/DashboardStats/index.tsx), not in `@shared`. Consumed by both the Home page and `ApiConnector.getDashboardStats()`.

---

## Timestamp Conventions

### Gateway timestamps
- `Block.time` and `TransactionDetail.tx.time` are **Unix second timestamp strings** (e.g. `"1774371612"`)
- `lastUpdated` in all `ApiReturnType` responses is **milliseconds** (`Date.now()`)

### Formatting timestamps
Always use `formatDateTimeLocal(String(value))` from [`src/commons/utils/helper.ts`](packages/frontend/src/commons/utils/helper.ts) for Unix second timestamps:
```typescript
import { formatDateTimeLocal } from "src/commons/utils/helper";
formatDateTimeLocal(String(data?.time || ""))   // accepts both Unix-second strings and ISO strings
```

### `FormNowMessage` / `getFromNow`
`FormNowMessage` in [`src/components/commons/FormNowMessage/index.tsx`](packages/frontend/src/components/commons/FormNowMessage/index.tsx) accepts a `time: number`.
- `lastUpdated` is in **milliseconds**, so use `new Date(ts)` not `fromUnixTime(ts)`.
- The component auto-detects via `ts > 1e10 ? new Date(ts) : fromUnixTime(ts)`.
- **Do not revert this branch** — reverting causes "56171 years ago" display.

---

## Number Formatting

All ADA values from the API are in **lovelace** (1 ADA = 1,000,000 lovelace). Helpers live in [`src/commons/utils/helper.ts`](packages/frontend/src/commons/utils/helper.ts).

| Function | Use for | Example output |
|----------|---------|----------------|
| `formatADA(value)` | Stat cards, banners, summaries, table cells | `"27.33B"` |
| `formatADAFull(value)` | Detail pages where full precision matters | `"27,302,027.006280"` |
| `formatNumberTotalSupply(value, decimals)` | Token supply with custom decimals | `"1,000,000.000000"` |
| `numberWithCommas(value)` | Generic number formatting | `"1,234,567.89"` |
| `formatPrice(value)` | Large-number abbreviation for non-ADA counts | `"1.23M"` |
| `exchangeADAToUSD(value, rate, isFull?)` | Price conversion | |

**Rule: Use `formatADA` (abbreviated) for cards, banners, and table cells.** `formatADAFull` returns full-precision strings (~20 chars) that overflow layouts at large values. Affected fields: `outSum`, `fees`, `activeStake`, `rewardsDistributed` in Epoch pages.

All ADA arithmetic should go through `BigNumber.js` to avoid float rounding — the codebase wraps `BigNumber.config({ EXPONENTIAL_AT: [-50, 50] })` at load.

---

## Known Broken: `useFetchList` Hook

[`src/commons/hooks/useFetchList.ts`](packages/frontend/src/commons/hooks/useFetchList.ts) is **completely non-functional**. The hook initialises state but `refresh` is `() => {}`. Any component using it will render but never receive data.

**Affected components (render but show empty/stale data):**
- `TokenAutocomplete` (used in `AddressDetail`)
- `GovernanceVotes`
- `VotesOverview`
- `PolicyTable`
- `ConstitutionalCommittees`
- `TokenTableData`

**Fix:** Migrate to `ApiConnector.getApiConnector()` directly with `useState` + `useEffect`, as in `BlockList`, `Token`, `TransactionListPage`, etc.

---

## Page Patterns

### Standard page structure
```typescript
const MyPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [fetchData, setFetchData] = useState<ApiReturnType<T[]>>();
  const apiConnector = ApiConnector.getApiConnector();

  useEffect(() => {
    document.title = "Page Title | Cardano Explorer";
    apiConnector.someMethod(params).then(data => {
      setFetchData(data);
      setLoading(false);
    });
  }, []);

  return (
    <Container sx={{ pt: 3, pb: 6 }}>
      <Box mb={2}>
        <Typography variant="h5" fontWeight={700} component="h1">Page Title</Typography>
      </Box>
      {/* content */}
    </Container>
  );
};
```

### Pagination pattern
```typescript
pagination={{
  ...pageInfo,
  total: fetchData?.total || 0,
  page: fetchData?.currentPage || 0,
  size: fetchData?.pageSize || pageInfo.size,
  onChange: (page, size) => updateData({ page, size }),
  hideLastPage: true
}}
```

### Never put `ApiConnector.getApiConnector()` in a `useCallback` dependency array
It is a stable singleton. Including it causes an infinite fetch loop.

---

## Styling Conventions

Three approaches coexist (being consolidated):
1. `styled()` components — primary pattern, usually in sibling `styles.ts` files
2. MUI `sx` prop — one-off layout tweaks
3. Inline `style={}` — avoid

CSS `@keyframes` work inside MUI `sx`:
```tsx
sx={{
  "@keyframes livePulse": { "0%, 100%": { boxShadow: "..." }, "50%": { boxShadow: "..." } },
  animation: "livePulse 2s ease-in-out infinite"
}}
```

For horizontally scrollable containers: `overflowX: "auto"` + custom `"&::-webkit-scrollbar"` styles via `sx`.

---

## Translation

`react-i18next`. Keys live in `packages/frontend/public/locales/`. Most UI uses `t("glossary.key")` / `t("common.key")`. Newer components sometimes use hardcoded English strings — acceptable during development; extract before release.

---

## Table Component

[`src/components/commons/Table/index.tsx`](packages/frontend/src/components/commons/Table/index.tsx) — shared table with:
- `columns: Column<T>[]` — headers + cell renderers, `minWidth` per column (wide enough for content; "Created At" needs ≥ `"170px"`)
- `data: T[]`
- `total: { title: string; count: number }` — shown above the table
- `onClickRow`, `rowKey` (string or function)
- `pagination` — see pattern above
- `tableWrapperProps` — pass `{ sx: { overflowX: "auto" } }` for wide tables

---

## Token List vs Token Detail

`apiConnector.getTokensPage()` returns only:
- `policy`, `displayName`, `supply`, `fingerprint`, `metadata?.logo`, `metadata?.ticker`, `metadata?.decimals`

Fields available **only** from the detail endpoint:
- `tokenType`, `txCount`, `createdOn`, `analytics`, `numberOfHolders`, `volumeIn24h`, `totalVolume`

Rendering list columns for detail-only fields produces permanently empty cells. Remove those columns or fetch detail per row (expensive — avoid).

---

## Analytics: Token Mint & Burn

Gateway [`token-controller.ts`](packages/gateway/src/controller/token-controller.ts) calls `API.assetsHistoryAll()` and enriches each event with cumulative supply:

```typescript
const delta = Number.parseInt(item.amount);
amount += delta;
activityData.push({
  date: tx.block_time,
  value: amount,                      // cumulative supply
  mintAmount: item.action === "minted" ? delta : 0,
  burnAmount: item.action === "burned" ? Math.abs(delta) : 0,
});
```

Frontend [`TokenAnalytics`](packages/frontend/src/components/TokenDetail/TokenAnalytics/index.tsx) supports two chart modes:
- **Supply** — AreaChart of cumulative supply over time
- **Mint & Burn** — ComposedChart with green mint bars + red burn bars

Stats sidebar: Total Minted, Total Burned (hidden for mint-only tokens), Peak Supply, Largest Single Mint.

---

## Dashboard Block Chain Visualizer

`BlockChainVisualizer` in [`src/pages/Home/index.tsx`](packages/frontend/src/pages/Home/index.tsx) + [`src/components/Home/BlockChainVisualizer/`](packages/frontend/src/components/Home/BlockChainVisualizer/).

- Horizontal scroll — newest block on the **left**, scroll right → older
- Each `BlockChainCard` (168 px wide): fill bar, block #, tx count, relative age, pool ticker
- `BlockChainConnector` renders a thin horizontal line; shows `+N` badge when the `blockNo` gap > 0
- Latest block highlighted with a blue border and a pulsing green "live" dot

Refresh pattern:
```typescript
const doFetch = useCallback(() => {
  ApiConnector.getApiConnector().getBlocksPage({ page: "1", size: "20" }).then(...)
}, []);
useEffect(() => {
  doFetch();
  const id = setInterval(doFetch, 30_000);   // 30 s
  return () => clearInterval(id);
}, [doFetch]);
```

### Block fill — canonical constant
`BLOCK_MAX_SIZE = 90_112` bytes. Used in both `BlockChainCard` (Home) and `BlockFillBarMini/Full` ([`src/components/commons/BlockFillBar/index.tsx`](packages/frontend/src/components/commons/BlockFillBar/index.tsx)). Keep in sync if the protocol max ever changes.

### Saturation fix (PoolList)
Blockfrost `live_saturation` is a **0–1 fraction**. The `SaturationBar` component and the Home pool table must multiply by 100 before passing to `LinearProgress` or width calculations. `formatPercent(value)` expects 0–1.

---

## Protocol Parameters — Structure & Playground

### Page & Components
- **Page**: [`src/pages/ProtocolParameters/index.tsx`](packages/frontend/src/pages/ProtocolParameters/index.tsx) — fetches live params via `apiConnector.getCurrentProtocolParameters()`, splits into 4 groups (Network, Economic, Technical, Governance), passes each to `GroupProtocoParameters`.
- **Group card**: [`src/components/ProtocolParameters/GroupProtocolParameters/GroupProtocolParameters.tsx`](packages/frontend/src/components/ProtocolParameters/GroupProtocolParameters/GroupProtocolParameters.tsx) — parameter cards + tooltips. Accepts `playgroundComponent?: React.ReactNode`; if provided, an "Open Playground" toggle appears and MUI `Collapse` reveals it.
- **Detail drawer**: `DetailViewGroupProtocol` — right-side drawer with full explanatory text per group.

### Playground components ([`src/components/ProtocolParameters/Playground/`](packages/frontend/src/components/ProtocolParameters/Playground/))

| File | Group | Simulations |
|------|-------|-------------|
| `EconomicPlayground.tsx` | Economic | Transaction Fee Calculator; Epoch Rewards (rho/tau split); UTxO Min ADA |
| `TechnicalPlayground.tsx` | Technical | Pool Saturation (nOpt/k); Pledge Influence (a0) |
| `NetworkPlayground.tsx` | Network | Block Throughput / TPS; Script Execution Budget |
| `GovernancePlayground.tsx` | Governance | Timeline converter (epochs → days/months/years) + deposit cost simulator |

### Design patterns
- Sliders start at the live on-chain value (passed via props).
- A MUI `Chip` shows the live value whenever the slider diverges.
- An `IoRefresh` reset link snaps the slider back.
- Only `@mui/material` primitives (Slider, LinearProgress, Chip, Collapse, Grid, Paper) — no extra chart lib.
- Playground panels are `unmountOnExit` → state resets each re-open.
- Playground is **not rendered** while `loading`, to avoid seeding simulators with `0` / `NaN`.

### Cardano constants used in simulations
```
TOTAL_ADA_SUPPLY    = 45_000_000_000    // max supply
CIRCULATING         ≈ 37_000_000_000
RESERVES            ≈  8_000_000_000
ACTIVE_STAKE        ≈ 26_000_000_000
LOVELACE_PER_ADA    = 1_000_000
EPOCHS_PER_YEAR     ≈ 73
MAINNET_EPOCH_DAYS  = 5
AVG_BLOCK_TIME_SECONDS = 20             // slot 1 s, ~5 % leadership rate
```

---

## DetailHeader / ListOverview Grid Layout

`DetailHeader` renders `listOverview` items as a CSS grid (3 per row at md+). Each item has an optional `icon`.

**Known visual issue:** An icon on an item in row 2+ floats in the whitespace between the row above's value and its own label ("orphaned").

**Fix:** Remove icons from items whose labels are already descriptive (e.g. "Block", "Slot", "Epoch"). Keep icons only where they add meaning beyond the label.

---

## Dependencies of Note

| Package | Purpose | Notes |
|---------|---------|-------|
| `highcharts` + `highcharts-react-official` | Charts (pie, area, line) | Primary charting lib |
| `recharts` | Secondary charts | Used in `TokenAnalytics` ComposedChart — retained for mixed bar/line renders |
| `framer-motion` | Animations | Installed, lightly used |
| `bignumber.js` | Precise math for ADA/lovelace | Always use for ADA arithmetic |
| `date-fns` + `date-fns-tz` | Dates | Prefer over `moment` |
| `moment` / `moment-timezone` | Legacy dates | Present but should be replaced with `date-fns` |
| `react-i18next` | i18n | Keys in `packages/frontend/public/locales/` |
| `react-icons` | Icons (IoFlask, CgClose, etc.) | Prefer `react-icons/io5` (Ionicons v5) |
| `axios` + `axios-case-converter` | HTTP (connector layer) | `case-converter` auto-maps snake_case ↔ camelCase |
| `redux-persist` | Persist `theme` slice | Note: `provider` slice uses a cookie, **not** redux-persist |
| `qs` | Querystring parsing | Used in `useFetchList` and pagination helpers |
| `@cardano-foundation/cardano-connect-with-wallet` (+ `-core`) | Wallet integration | |
| `@cardano-foundation/cf-flat-decoder-ts` | Decodes Plutus flat-encoded scripts | Used for script viewers |
| `cardano-addresses` | Cardano address parsing / derivation | |
| `cbor-x` | CBOR encode/decode | Parses on-chain metadata / script blobs |
| `@textea/json-viewer` | Collapsible JSON viewer | Used in metadata / governance detail views |
| `@mui/lab` / `@mui/x-tree-view` | MUI extensions | Tree view for nested data |
| `lodash` | Utility library | Tree-shake via `lodash/<fn>` imports |
| `sass` | SCSS compilation | Vite handles `.scss` imports |
| `react-use` | React hooks grab-bag | |
| `react-countup` | Animated number counter | Dashboard stat cards |
| `react-circular-progressbar` | Circular progress | Epoch progress indicators |

---

## Docker & CI

### Images (Docker Hub)

| Image | Dockerfile | Port |
|-------|-----------|------|
| `kammerlo/phoenix-explorer:main` | `packages/frontend/Dockerfile.frontend` | 80 (nginx) |
| `kammerlo/phoenix-explorer-gateway:main` | `packages/gateway/Dockerfile.gateway` | 3000 (Express) |

Frontend nginx proxies `/api/*` to a service named `gateway` on port 3000 (see [`packages/frontend/nginx.conf`](packages/frontend/nginx.conf)).

### docker-compose.yml
Both services declare `image:` **and** `build:` — `docker compose up` pulls from Hub, `docker compose up --build` rebuilds locally. Tag overridable via `IMAGE_TAG` env var (defaults to `main`). See [`docker-compose.yml`](docker-compose.yml).

### GitHub Actions
[`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml) builds both Dockerfiles via matrix and pushes `:main` on every push to `main` (or via `workflow_dispatch`). Uses GHA cache. Requires repo secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.

### Dockerfile conventions
- Multi-stage: `node:20-alpine` build stage → small runtime stage (nginx for frontend, `node:20-alpine` + `USER node` for gateway)
- Manifests copied before source so `npm ci --workspaces` layer caches across source changes
- BuildKit cache mount (`--mount=type=cache,target=/root/.npm`) reuses the npm download cache
- Frontend build-args (`REACT_APP_*`) are written into a root `.env` (Vite's `envDir: rootDir`) before `npm run build`
- Gateway runtime copies `packages/shared/dist` to `node_modules/@shared` so `require('@shared/...')` resolves (TS enums emit real JS that can't be inlined)

---

## Environment Variables

Root `.env` (loaded by both the Vite build and the Express gateway; Gateway reads it via `dotenv` from the monorepo root):

### Gateway
| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `API_KEY` | — | Yes (when `REACT_APP_API_TYPE=GATEWAY`) | Blockfrost project key. Prefix must match `NETWORK`. |
| `NETWORK` | `mainnet` | No | `mainnet` \| `preprod` \| `preview` |
| `PORT` | `3000` | No | |
| `HOST` | `0.0.0.0` | No | |

### Frontend (all prefixed `REACT_APP_`)
| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_TYPE` | `GATEWAY` | `GATEWAY` \| `YACI` \| `BLOCKFROST` |
| `REACT_APP_API_URL` | `http://localhost:3000/api` | Base URL for the active provider |
| `REACT_APP_NETWORK` | `mainnet` | Label shown in UI |
| `REACT_APP_BLOCKFROST_API_KEY` | — | Only when `REACT_APP_API_TYPE=BLOCKFROST` (exposed to browser) |
| `REACT_APP_API_URL_COIN_GECKO` | CoinGecko markets endpoint | ADA price data source |
| `REACT_APP_ADA_HANDLE_API` | — | Optional. Endpoint for resolving [ADA Handle](https://adahandle.com/) names. Consumed via `ADA_HANDLE_API`/`API_ADA_HANDLE_API` in [`src/commons/utils/constants.ts`](packages/frontend/src/commons/utils/constants.ts) and `useADAHandle`. |

See [`.env.example`](.env.example) at the repo root.

---

## Package Scripts

Root:
```bash
npm run dev          # gateway + frontend via concurrently
```

Per-workspace:
```bash
# Frontend
npm run dev --workspace=frontend      # Vite dev server
npm run build --workspace=frontend    # Production build → packages/frontend/build/

# Gateway
npm run dev --workspace=gateway       # ts-node-dev with hot reload
npm run build --workspace=gateway     # tsc → packages/gateway/dist/

# Shared
npm run build --workspace=cardano-explorer-shared   # tsc → packages/shared/dist/
```

---

## Common Issues Fixed

| Issue | Root cause | Fix |
|-------|-----------|-----|
| "56171 years ago" in `FormNowMessage` | `lastUpdated` is ms but `fromUnixTime()` expects seconds | Detect `ts > 1e10` → use `new Date(ts)` |
| Raw Unix timestamps in Block / Tx detail | `data?.time` rendered directly as string | Wrap with `formatDateTimeLocal(String(value))` |
| Orphaned icons in transaction / block detail | Icon appears between grid rows in `DetailHeader` | Remove icons from descriptive list items |
| ADA values overflowing Epoch banner / cards / tables | `formatADAFull` returns full precision (~20 chars) | Use `formatADA` (abbreviated) for stat cards and table cells |
| Empty Type / TxCount / CreatedAt on Token list | Not returned by the list endpoint | Remove those columns |
| "Created At" column truncated in Block list | `minWidth` was `"130px"` | Increase to `"170px"` + `overflowX: "auto"` |
| Missing page titles on list pages | Typography heading not added | `<Typography variant="h5" fontWeight={700} component="h1">` |
| `theme.palette.divider` TS error | Not in `CustomPalette` | Use `alpha(secondary.light, ...)` / `primary[200]` |
| Infinite re-render in `TabOverview` | API call directly in component body | Wrap in `useEffect(() => { ... }, [deps])` |
| `BlockFillBarFull` missing | Only `BlockFillBarMini` was exported | Add `BlockFillBarFull` to `BlockFillBar/index.tsx` |
| Saturation bar invisible | `SaturationBar` treated 0–1 fraction as 0–100 | Multiply by 100 for width pct; pass raw value to `formatPercent` |
| Gateway dashboard showing empty stats | Cookie `baseUrl` missing `/api` suffix | Gateway routes are mounted at `/api/*` — base URL must include it |
