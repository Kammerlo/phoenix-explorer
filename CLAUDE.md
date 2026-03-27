# Phoenix Explorer — Claude Code Knowledge Base

## Project Overview

Cardano blockchain explorer built with:
- **Frontend**: React 18.3, TypeScript, MUI v7, Redux Toolkit v2, React Router v7, Highcharts v11, react-icons v4.6, date-fns v4
- **Backend**: Node.js + Express 5, Blockfrost SDK v6
- **Shared**: `@shared/` package with DTOs and API types consumed by both frontend and backend
- **Monorepo**: `packages/frontend`, `packages/backend`, `packages/shared`
- **Build**: Vite with `@vitejs/plugin-react` (automatic JSX transform — **no `import React` needed** in component files)

---

## Architecture: Three-Connector System

Pages fetch data through an abstract `ApiConnector` class with three implementations:

| Connector | File | Description |
|-----------|------|-------------|
| Gateway | `src/commons/connector/GatewayConnector.ts` | Default — calls local Express backend |
| Blockfrost | `src/commons/connector/BlockfrostConnector.ts` | Direct Blockfrost API from browser |
| Yaci | `src/commons/connector/yaci/yaciConnector.ts` | Yaci Store API (full-featured, used in dev) |

**Usage pattern in all pages:**
```typescript
const apiConnector = ApiConnector.getApiConnector();
apiConnector.someMethod(...).then(data => { ... });
```

**Initialization:** `ConnectorFactory.ts` must be imported before `getApiConnector()` is called (done in `index.tsx`). The active connector is set via Redux store (`src/stores/`) and read by `ConnectorFactory`.

**All connectors use `Date.now()` (milliseconds) for `lastUpdated`** in `ApiReturnType`. This is important — see timestamp section below.

---

## Data Types

### `ApiReturnType<T>` (from `@shared/APIReturnType`)
```typescript
{
  data: T;
  total: number;
  currentPage: number;
  pageSize: number;
  lastUpdated: number;  // milliseconds (Date.now())
}
```

### Key DTOs (from `@shared/dtos/`)
- `Block` — `blockNo`, `hash`, `epochNo`, `epochSlotNo`, `txCount`, `size`, `time` (Unix seconds string), `slotLeader`, `poolTicker`, `poolName`
- `Transaction` / `TransactionDetail` — `tx.time` (Unix seconds string)
- `EpochOverview` — `outSum`, `fees`, `activeStake`, `rewardsDistributed` (all in lovelace as strings)
- `ITokenOverview` — list endpoint only returns: `policy`, `displayName`, `supply`, `fingerprint`, `metadata?.logo`, `metadata?.ticker`, `metadata?.decimals`
- `TokenDetail` — includes `analytics` array, `tokenType`, `txCount`, `createdOn` (NOT available from list endpoint)

---

## Timestamp Conventions

### Backend timestamps
- `Block.time` and `TransactionDetail.tx.time` are **Unix second timestamp strings** (e.g., `"1774371612"`)
- `lastUpdated` in all `ApiReturnType` responses is **milliseconds** (`Date.now()`)

### Formatting timestamps
Always use `formatDateTimeLocal(String(value))` from `src/commons/utils/helper.ts` for Unix second timestamps:
```typescript
import { formatDateTimeLocal } from "src/commons/utils/helper";
// handles both Unix second strings and ISO strings
formatDateTimeLocal(String(data?.time || ""))
```

### `FormNowMessage` / `getFromNow`
`FormNowMessage` in `src/components/commons/FormNowMessage/index.tsx` accepts a `time` number.
- `lastUpdated` is in **milliseconds**, so use `new Date(ts)` not `fromUnixTime(ts)`
- Fixed: detects ms vs seconds via `ts > 1e10 ? new Date(ts) : fromUnixTime(ts)`
- **Do not revert this fix** — reverting causes "56171 years ago" display

---

## Number Formatting

All ADA values from the API are in **lovelace** (1 ADA = 1,000,000 lovelace).

| Function | Usage | Output example |
|----------|-------|----------------|
| `formatADA(value)` | Large values in stat cards, banners, summaries | `"27.33B"` |
| `formatADAFull(value)` | Detail pages where precision matters | `"27,302,027.006280"` |
| `formatNumberTotalSupply(value, decimals)` | Token supply with custom decimals | `"1,000,000.000000"` |

**Rule: Use `formatADA` (abbreviated) for stat cards and banners.** `formatADAFull` returns full-precision strings that overflow layout at large values. Affected fields: `outSum`, `fees`, `activeStake`, `rewardsDistributed` in Epoch pages.

---

## Known Broken: `useFetchList` Hook

`src/commons/hooks/useFetchList.ts` — **completely non-functional**. The hook initializes state but the `refresh` function is `() => {}` (no-op). Any component using this hook will render but never receive data.

**Affected components (render but show empty/stale data):**
- `TokenAutocomplete` (used in AddressDetail)
- `GovernanceVotes`
- `VotesOverview`
- `PolicyTable`
- `ConstitutionalCommittees`
- `TokenTableData`

**Fix required:** Migrate these components to use `ApiConnector.getApiConnector()` directly with `useState` + `useEffect`, following the pattern used in `BlockList`, `Token`, `TransactionListPage`, etc.

---

## DetailHeader / ListOverview Grid Layout

`DetailHeader` renders `listOverview` items as a CSS grid (3 per row on md+). Each item has an optional `icon`.

**Known visual issue:** When an item with an icon appears in row 2+, the icon floats in the whitespace between the row above's value and its own label — visually "orphaned".

**Fix:** Remove icons from items whose labels are already descriptive (e.g., "Block", "Slot", "Epoch"). Only use icons for items where the icon adds clarity not provided by the label text.

---

## Token List vs Token Detail

The list endpoint (`GET /tokens` via `apiConnector.getTokensPage()`) **only returns**:
- `policy`, `displayName`, `supply`, `fingerprint`, `metadata?.logo`, `metadata?.ticker`, `metadata?.decimals`

Fields **only available from the detail endpoint** (do not show in list table):
- `tokenType` — always undefined from list
- `txCount` — always undefined from list
- `createdOn` — always undefined from list

Rendering columns for unavailable list fields produces permanently empty cells. Remove those columns or fetch detail data per-row (expensive — avoid).

---

## Analytics: Token Mint & Burn

Backend (`packages/backend/src/controller/token-controller.ts`) calls `API.assetsHistoryAll()` which returns events with `action: "minted" | "burned"`.

Analytics data enrichment:
```typescript
const delta = Number.parseInt(item.amount);
amount += delta;
activityData.push({
  date: tx.block_time,
  value: amount,           // cumulative supply
  mintAmount: item.action === "minted" ? delta : 0,
  burnAmount: item.action === "burned" ? Math.abs(delta) : 0,
});
```

Frontend `TokenAnalytics` component (`src/components/TokenDetail/TokenAnalytics/index.tsx`) supports two chart modes:
- **Supply**: AreaChart of cumulative supply over time
- **Mint & Burn**: ComposedChart with green mint bars + red burn bars

Stats sidebar: Total Minted, Total Burned (hidden for mint-only tokens), Peak Supply, Largest Single Mint.

---

## Styling Conventions

Three approaches exist in the codebase (inconsistent — being consolidated):
1. `styled()` components — primary pattern, files named `styles.ts` per component dir
2. MUI `sx` prop — growing usage for one-off layout
3. Inline `style={}` — avoid

**Theme access:** Always use `theme.palette.*` — never raw hex colors. Dark mode: check `theme.isDark`.

**Breakpoints** (8 defined, from `src/themes/breakpoints.ts`): xs, sm, md, lg, xl, xxl, fhd

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
All paginated pages pass pagination to the `Table` component:
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

---

## Routing

React Router v7. Routes defined in `src/Routers.tsx`. Route helpers in `src/commons/routers.ts`. Uses `useParams` and `useHistory` from `react-router-dom`.

Common detail route helpers:
```typescript
details.block(blockNoOrHash)   // /blocks/:id
details.epoch(epochNo)          // /epoch/:id
details.token(fingerprint)      // /token/:id
details.transaction(hash)       // /tx/:id
details.delegation(poolId)      // /pool/:id
details.address(address)        // /address/:id
```

**Never use `window.location.href` for navigation** — use React Router `useNavigate()` or `useHistory()`.

---

## Translation

Uses `react-i18next`. Most UI strings use `t("glossary.key")` or `t("common.key")`. Some newer components use hardcoded English strings — acceptable during development, should be extracted eventually.

---

## Table Component

`src/components/commons/Table/index.tsx` — shared table with:
- `columns: Column<T>[]` — defines headers and cell renderers
- `data: T[]`
- `total: { title: string; count: number }` — shown above table
- `onClickRow` — row click handler
- `rowKey` — string field name or function
- `pagination` — pagination config
- `tableWrapperProps` — sx overrides for table wrapper (add `overflowX: "auto"` for wide tables)

Column `minWidth` must be wide enough for content — "Created At" columns need at least `"170px"`.

---

## Common Issues Fixed

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| "56171 years ago" in FormNowMessage | `lastUpdated` is ms but `fromUnixTime()` expects seconds | Detect `ts > 1e10` → use `new Date(ts)` |
| Raw Unix timestamps in Block/Tx detail | `data?.time` rendered directly as string | Wrap with `formatDateTimeLocal(String(value))` |
| Orphaned icons in transaction/block detail | Icon appears between grid rows in DetailHeader | Remove icons from descriptive list items |
| ADA values overflowing Epoch banner/cards | `formatADAFull` returns full precision (~20 chars) | Use `formatADA` (abbreviated) for stat cards |
| Empty Type/TxCount/CreatedAt on Token list | These fields not returned by list endpoint | Remove those columns |
| "Created At" column truncated in Block list | `minWidth` was `"130px"` | Increased to `"170px"` + added `overflowX: "auto"` |
| Missing page titles on list pages | Typography heading not added | Add `<Typography variant="h5" fontWeight={700} component="h1">` |

---

## Dependencies of Note

| Package | Purpose | Notes |
|---------|---------|-------|
| `highcharts` + `highcharts-react-official` | Charts (pie, area, line) | Primary charting library — **not recharts** |
| `framer-motion` | Animations | Already installed, not widely used yet |
| `BigNumber.js` | Precise numeric math for ADA values | Always use for ADA arithmetic |
| `date-fns` | Date utilities | Use instead of moment (moment is deprecated) |
| `moment` / `moment-timezone` | Legacy date handling | Present but should be replaced with date-fns |
| `react-i18next` | Internationalization | Translation keys in `public/locales/` |
| `react-icons` | Icons (IoFlask, CgClose, etc.) | Use `react-icons/io5` for modern Ionicons |
| `lodash` | Utilities | Available, use sparingly |
| `axios` | HTTP client (frontend connector layer) | Used inside connector implementations |

---

## Protocol Parameters — Structure & Playground

### Page & Components
- **Page**: `src/pages/ProtocolParameter/index.tsx` — fetches live params via `apiConnector.getCurrentProtocolParameters()`, splits into 4 groups (Network, Economic, Technical, Governance), passes each to `GroupProtocoParameters`.
- **Group card**: `src/components/ProtocolParameters/GroupProtocolParameters/GroupProtocolParameters.tsx` — renders parameter cards with tooltips. Accepts optional `playgroundComponent?: React.ReactNode` prop; if provided, an "Open Playground" toggle appears and MUI `Collapse` reveals it below the cards.
- **Detail drawer**: `DetailViewGroupProtocol` — right-side drawer with full explanatory text per group, opened via "here" link.

### Playground Components (`src/components/ProtocolParameters/Playground/`)

| File | Group | Simulations |
|------|-------|-------------|
| `EconomicPlayground.tsx` | Economic | Transaction Fee Calculator; Epoch Rewards (rho/tau split); UTxO Min ADA |
| `TechnicalPlayground.tsx` | Technical | Pool Saturation (nOpt/k); Pledge Influence (a0) |
| `NetworkPlayground.tsx` | Network | Block Throughput / TPS; Script Execution Budget |
| `GovernancePlayground.tsx` | Governance | Timeline converter (epochs → days/months/years) + deposit cost simulator |

### Playground Design Patterns
- Each playground is seeded with live on-chain values via props from the page.
- Sliders let users deviate from the real value; a MUI `Chip` badge shows the real on-chain value whenever the slider diverges.
- A reset link (`IoRefresh` icon) snaps any slider back to the live protocol value.
- All simulations use only `@mui/material` primitives (Slider, LinearProgress, Chip, Collapse, Grid, Paper) — no additional chart library needed for simple visualisations.
- Playground panels are `unmountOnExit` so state resets each time they're re-opened.
- Playground is **not rendered** while `loading` is true to avoid seeding simulators with `0`/`NaN`.

### Key Cardano Constants Used in Simulations
```
TOTAL_ADA_SUPPLY = 45_000_000_000   // max supply
CIRCULATING ≈ 37_000_000_000        // approx
RESERVES ≈ 8_000_000_000            // TOTAL - CIRCULATING
ACTIVE_STAKE ≈ 26_000_000_000       // approx mainnet active stake
LOVELACE_PER_ADA = 1_000_000
EPOCHS_PER_YEAR ≈ 73
MAINNET_EPOCH_DAYS = 5
AVG_BLOCK_TIME_SECONDS = 20         // slot 1s, ~5% leadership rate
```

---

## Dashboard Block Chain Visualizer

`BlockChainVisualizer` lives in `src/pages/Home/index.tsx` as a self-contained component.

### Design
- Horizontal scroll: newest block on the **left**, scroll right → older blocks
- Each `BlockChainCard` (168 px wide) shows: fill bar at top, block #, tx count, relative age, pool ticker
- `BlockChainConnector` renders a thin horizontal line between cards; shows `+N` badge when `blockNo` gap > 0 (i.e. fetched pages skipped blocks)
- Latest block is highlighted with a blue border and a pulsing green dot ("live" indicator)

### Refresh pattern
```typescript
const doFetch = useCallback(() => {
  ApiConnector.getApiConnector().getBlocksPage({ page: "1", size: "20" }).then(...)
}, []);

useEffect(() => {
  doFetch();
  const id = setInterval(doFetch, 30_000); // every 30 s
  return () => clearInterval(id);
}, [doFetch]);
```
Do **not** put `ApiConnector.getApiConnector()` in the `useCallback` dependencies array — it is a stable singleton.

### Styling conventions applied
- `theme.palette.divider` does **not** exist in `CustomPalette`. Use the project border pattern instead:
  ```typescript
  theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e0e0e0"
  ```
- CSS `@keyframes` work inside MUI `sx` objects:
  ```tsx
  sx={{
    "@keyframes livePulse": { "0%, 100%": { boxShadow: "..." }, "50%": { boxShadow: "..." } },
    animation: "livePulse 2s ease-in-out infinite"
  }}
  ```
- Horizontal scrollable containers: add `overflowX: "auto"` + custom scrollbar styles via `"&::-webkit-scrollbar"` in `sx`.

### Block fill — canonical constant
`BLOCK_MAX_SIZE = 90_112` bytes. Used in both `BlockChainCard` (Home) and `BlockFillBarMini/Full` (`src/components/commons/BlockFillBar/index.tsx`). Keep in sync if the protocol max ever changes.

### Saturation fix (PoolList)
Blockfrost `live_saturation` is a **0–1 fraction**. The `SaturationBar` component and the Home pool table must multiply by 100 before passing to LinearProgress or width calculations. `formatPercent(value)` already expects 0–1.

### Common issues fixed in this session
| Bug | Root cause | Fix |
|-----|-----------|-----|
| `theme.palette.divider` TS error | `CustomPalette` doesn't extend MUI `Palette` completely | Use `alpha(secondary.light, ...)` / `primary[200]` pattern |
| Infinite re-render in `TabOverview` | API call directly in component body (not in `useEffect`) | Wrap in `useEffect(() => { ... }, [search])` |
| Accidental circular import | `gatewayConnector.ts` imported `Epoch` page component | Remove stray import |
| `BlockFillBarFull` missing | Only `BlockFillBarMini` was exported | Added `BlockFillBarFull` to `BlockFillBar/index.tsx` |
| Saturation bar invisible | `SaturationBar` treated 0–1 fraction as 0–100 | Multiply by 100 in pct calculation; pass raw value to `formatPercent` |
| `formatADAFull` overflow in epoch table | Full precision (~20 chars) overflows 100–120 px column | Use `formatADA` (abbreviated) for table cells too, not just banners |

---

## Package Scripts

From monorepo root or `packages/frontend`:
```bash
npm run dev          # start frontend dev server
npm run build        # production build
npm run test         # run tests
```

Backend: `packages/backend`
```bash
npm run start:dev    # NestJS dev server with watch
```
