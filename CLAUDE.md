# Phoenix Explorer — Claude Code Knowledge Base

## Project Overview

Cardano blockchain explorer built with:
- **Frontend**: React 18, TypeScript, MUI v6, Redux Toolkit v1, React Router v5, recharts, BigNumber.js
- **Backend**: Node.js + NestJS, Blockfrost SDK
- **Shared**: `@shared/` package with DTOs and API types consumed by both frontend and backend
- **Monorepo**: `packages/frontend`, `packages/backend`, `packages/shared`

---

## Architecture: Three-Connector System

Pages fetch data through an abstract `ApiConnector` class with three implementations:

| Connector | File | Description |
|-----------|------|-------------|
| Gateway | `src/commons/connector/GatewayConnector.ts` | Default — calls local Node.js backend |
| Blockfrost | `src/commons/connector/BlockfrostConnector.ts` | Direct Blockfrost API from browser |
| Yaci | `src/commons/connector/YaciConnector.ts` | Yaci DevKit for local development |

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

React Router v5 (not yet upgraded to v6). Routes defined in `src/Routers.tsx`. Route helpers in `src/commons/routers.ts`.

Common detail route helpers:
```typescript
details.block(blockNoOrHash)   // /blocks/:id
details.epoch(epochNo)          // /epoch/:id
details.token(fingerprint)      // /token/:id
details.transaction(hash)       // /tx/:id
details.delegation(poolId)      // /pool/:id
details.address(address)        // /address/:id
```

**Never use `window.location.href` for navigation** — use React Router `useNavigate()` (or `useHistory()` in v5).

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
| `recharts` | Charts (analytics, epoch progress) | Already installed |
| `framer-motion` | Animations | Already installed, not widely used yet |
| `BigNumber.js` | Precise numeric math for ADA values | Always use for ADA arithmetic |
| `date-fns` | Date utilities | Use instead of moment (moment is deprecated) |
| `moment` / `moment-timezone` | Legacy date handling | Present but should be replaced with date-fns |
| `react-i18next` | Internationalization | Translation keys in `public/locales/` |
| `lodash` | Utilities | Available, use sparingly |

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
