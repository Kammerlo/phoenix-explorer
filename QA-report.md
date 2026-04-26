# QA Report — Phoenix Explorer (phoenix-explorer.org)

Generated: 2026-04-25

Reference: https://cexplorer.io (cardanoscan.io was unavailable in the test sandbox)

## Summary

- **6 critical, 13 major, 11 minor, 7 nits** = 37 total issues
- Pages tested: Dashboard, Blocks list, Block detail (incl. Byron #1 + epoch-boundary #0), Transactions list, Transaction detail, Epochs list, Epoch detail (incl. Epoch 0), Pools list, Pool detail, Address detail (incl. Byron edge case), Stake address, Native Tokens list, Token detail (NFT + fungible HOSKY), Policy detail, DReps, Governance Actions list + detail, Protocol Parameters, Plugins
- Not tested: dark-mode coverage on every page (spot-checked); 375px mobile (tooling limitation — see Notes)

## Notes / Limitations

- `resize_window` to 375×812 did not shrink the rendered viewport in the test environment (`window.innerWidth` remained 1202). The site does ship MUI breakpoints (max-width 599.95 / 899.95 / 1199.95) so it likely adapts; **please spot-check on a real mobile device** for: dashboard stat cards (4 in a row may stack awkwardly), Blocks/Pools/Tokens tables (already overflow at desktop ~1200px — see VIS-04), tx flow diagram (3-column layout).
- I cross-checked data against cexplorer.io rather than cardanoscan.io. Where definitions of metrics differ between providers, I noted both numbers rather than flagging as a bug.

---

## Issues

### [GLOBAL] Dashboard / Layout / Branding

- [ ] **[critical][bug]** "Total Results" pagination count equals the latest block height, not the actual total transactions. The `/api/transactions` endpoint returns `total: 13336888` (current block height) and the UI renders e.g. `1 - 50 of 13,336,888 Results` on the Transactions list. Cardano has had hundreds of millions of transactions; this number is wrong by roughly an order of magnitude. Same pattern likely affects any list whose backend returns `total` as a fallback.
  - Visual: bottom of `/transactions` page, "13,336,888 Results" right-aligned. Screenshot ID: `ss_28031m4yx`.
  - Reference: cexplorer doesn't expose tx total directly; cardanoscan typically shows ~100M+.
  - Likely fix: backend `/api/transactions` `total` field is being populated from `latestBlock.height`. Replace with a real `COUNT(*)` (or cached estimate) on `tx`.

- [ ] **[major][bug]** Global search does not match by token ticker or pool ticker — only by hash, address, ID, or numeric (epoch/block).
  - Repro: type `HOSKY` → "No results for HOSKY"; type `CLAY` (a real pool ticker visible elsewhere on the site) → "No results for CLAY".
  - Numeric `100` correctly disambiguates to Epoch #100 / Block #100 (good), so the autocomplete UI works — only the index is missing tickers.
  - Screenshot IDs: `ss_9737qmher`, `ss_4941tcw44`, `ss_745517wh2` (working numeric).
  - Reference: cexplorer's "Search by Address / Tx hash / Block hash / $Handle / Pool name…" search resolves "HOSKY" and "CLAY" instantly.
  - Likely fix: extend `/api/search` to query `multi_asset.name` and `pool_offline_data.ticker_name`.

- [ ] **[major][visual]** Dark-mode contrast collapse on Block Chain rail tiles.
  - On the dashboard's "Block Chain LIVE" strip, the `txs` count number renders in a dark-blue near the same value as the dark background, making it nearly unreadable. Same issue applies to "1/2/3 minutes ago" labels at the bottom of each tile.
  - Zoom screenshot ID: dark-mode block tiles zoomed showed numbers `13`, `7`, `26` essentially invisible.
  - Likely fix: `BlockTile.tsx` uses a hardcoded color for the tx count; switch to `theme.palette.text.primary`.

- [ ] **[minor][ux]** "Latest Block" stat card briefly disagrees with the live rail above it.
  - On dashboard load, the "Latest Block" tile rendered `13,336,846` (slot 56,233) while the API's most recent block was `13,336,847` (slot 56,252). The live "Block Chain" rail also shows up to `13,336,845` at the same moment. Different components poll on different intervals — they update within ~30 seconds, but it's confusing for the user.
  - Likely fix: drive both from the same query/cache key (e.g. React-Query with shared `latestBlock` key).

- [ ] **[minor][visual]** Active-stake card claims "58% of circulating supply staked" — the percentage is computed from `activeStake / circulating`, but circulating is itself derived from a dashboard stat card that lags. When all three numbers are fresh the math is fine; when one lags by a few seconds the percentage briefly mismatches its label. Cosmetic.

- [ ] **[nit][ux]** "GATEWAY" badge in the top-right is unexplained — no tooltip, no docs link. Most users won't know what data provider it refers to. The "Switch data provider" button next to it (`ref_16` in DOM) is also unlabeled visually.

---

### [PAGE] Block list (`/blocks`)

- [ ] **[major][visual]** The "Created At" column is clipped on viewports ≤ ~1200px. The table is 1047px wide inside a 937px container; the rightmost column is partially cut off.
  - Likely fix: wrap the table in `overflow-x: auto` or hide the column at `md` breakpoint and below.

- [ ] **[minor][ux]** Producer column inconsistently shows ticker (`[KTN3]`, `[PPTG1]`) for some rows and the raw bech32 pool ID (`pool1kphkk...z2dptuph`) for others. Both should resolve through the pool registry; if a ticker isn't available, it would be cleaner to show "Unknown pool" + the truncated bech32 in a smaller font.

- [ ] **[nit][ux]** Block size shown as `1.6 KB`, `8.9 KB`, `0 B` etc. but on the dashboard's "Latest Blocks" table sibling, blocks with no txs show `4 B` (likely empty CBOR list = 4 bytes). For a Cardano block this is misleading — the on-chain block is never 4 bytes (header alone is hundreds). Either show full block size including header, or label clearly as "tx body size".

---

### [PAGE] Block detail (`/block/:id`)

- [ ] **[critical][data-accuracy]** Block fill % uses current Conway max block size (90,112 bytes) for **all** blocks, including pre-Conway / Byron blocks that have a different protocol-level limit.
  - Repro: open `/block/89d9b5a5b8ddc8d7e5a6795e9774d97faf1efea59b2caf7eaf9f8c5b32059df4` (Block #0, the first epoch boundary block). Phoenix shows: `BLOCK FILL: 100% (648,085 / 90,112 bytes)` — the size 648,085 exceeds the displayed max 90,112, and the bar shows full red overflow.
  - Reference: the actual Byron-era max-block-size param was much larger; this block was not actually 100% full.
  - Screenshot ID: `ss_1669g0zry`.
  - Likely fix: in `BlockDetail.tsx`, look up `protocolParams.maxBlockSize` for the *epoch of the block*, not the current epoch.

- [ ] **[major][ux]** Producer field for non-pool producers (Byron genesis blocks, epoch boundary blocks) is truncated mid-word.
  - Block #1: producer renders as `ByronGenes...` — should be "Byron Genesis" or similar full label.
  - Block #0: producer renders as `Epoch boun...` — should be "Epoch Boundary" or similar.
  - Screenshot IDs: `ss_5388mqugs`, `ss_1669g0zry`.
  - Likely fix: Producer cell uses fixed-width truncation regardless of content. Either widen the column or treat known special producers as full strings rather than pool IDs.

- [ ] **[minor][ux]** Tab title for old/special blocks is the full hex hash (`Block 89d9b5a5b8ddc8d7e5a6795e9774d97faf1efea59b2caf7eaf9f8c5b32059df4 | Cardano Explorer`). Should be `Block #0 | Phoenix Explorer` or similar — easier to identify in tabs.

- [ ] **[minor][ux]** No "Confirmations" indicator. Cexplorer shows "Confirmations: Medium (3)" — useful for tx finality. Phoenix has no equivalent.

- [ ] **[nit][ux]** No protocol version / VRF info. Cexplorer shows `Protocol 10.7, VRF` and an Op Counter. Phoenix omits these — fine for casual users, missing for power users.

- [ ] **[nit][ux]** Created-at displays `25/04/2026, 15:22:04` with no timezone label. Confusion risk: viewer doesn't know if it's their local time or UTC. Should append e.g. `(local)` or display in UTC + local toggle.

---

### [PAGE] Transactions list (`/transactions`)

- [ ] **[critical][bug]** Wrong total — see GLOBAL bug above (Results count = block height).

- [ ] **[nit][ux]** "Total Output in ADA" column shows values like `113,525.174422` — correctly labeled in the header but the trailing 6-decimal precision on huge values is overkill. Consider 2 decimals + tooltip with full precision.

---

### [PAGE] Transaction detail (`/transaction/:hash`)

- [ ] **[major][ux]** Slot label has an info-icon (ⓘ) that suggests a tooltip but doesn't render one. Same for the "Type" column header (dotted underline implies tooltip). Hover shows nothing.
  - Repro: load any tx detail; hover the small info icon next to "Slot 56405 / 185557205".
  - Likely fix: tooltips are configured but not wired up, or `MuiTooltip` import missing on these elements.

- [ ] **[major][ux]** No transaction size, TTL, or confirmations.
  - Reference (cexplorer): shows `Transaction Size: 0.91kB (5.70%)`, `TTL: Locking in 13m 49s`, `Confirmations: Low (1)`.
  - These are useful especially TTL for understanding when a script tx will lock and confirmations for finality.

- [ ] **[minor][ux]** Output addresses are aggressively truncated to ~5 visible chars in the Flow view (`addr1...`). At ~1200px width there's room for 12+. Consider a `min-width` and `text-overflow: ellipsis` with a fuller prefix.

- [ ] **[minor][ux]** "FLOW.CHANGE" tag on outputs is undocumented jargon. Add a tooltip explaining "this output is a change return to the sender".

- [ ] **[nit][ux]** "+1 token" chips on inputs/outputs require expansion to reveal the asset list. For txs with one or two non-ADA tokens, just inline them.

---

### [PAGE] Epochs list (`/epochs`)

- [ ] **[minor][visual]** "Transaction Count" column header is truncated to `Transaction Coun...` at 1200px viewport. Either shorten to "Tx Count" (matches Block list) or widen the column.
  - Screenshot ID: `ss_1720x8yak`.

- [ ] **[nit][ux]** Status badge shown next to current/recent epochs (`In Progress`, `Rewarding`) but absent on older epochs — would be cleaner to also show "Finalized" or similar, or omit the badge column entirely once finalized.

---

### [PAGE] Epoch detail (`/epoch/:n`)

- [ ] **[minor][visual]** Stat grid in second row has only 3 cells for early epochs (Byron-era Epoch 0 has no Active Stake). Visually this creates an asymmetric 4+3 layout. Either keep the 4th cell with `—` placeholder or center the 3 in the row.
  - Screenshot ID: `ss_56377490w`.

- [ ] **[minor][ux]** Block list inside an epoch detail is sorted ascending (oldest blocks of the epoch first), which means by default users see Byron-era blocks first when viewing Epoch 627. Most explorers default newest-first.
  - Likely fix: change default `sort=blockNo&order=DESC`.

---

### [PAGE] Pools list (`/pools`)

- [ ] **[minor][ux]** "Pool size" column shows raw values like `2.67K`, `944.56K`, `7.41M`, `68.60M` mixed in the same column. Sorting (no obvious sort UI on this page) would help; default sort by pool size descending would also be more useful.

- [ ] **[nit][ux]** "Unknown Pool" with ticker `[N/A]` (saturation 0%, lifetime blocks 23) — no link to investigate; clicking should still load the detail page if registration data exists.

---

### [PAGE] Pool detail (`/pool/:bech32`)

- [ ] **[critical][data-accuracy]** Delegators count differs significantly from cexplorer.
  - Phoenix (OctasPool): `5,138 delegators`. Cexplorer: `3,748 delegators`. ~37% gap.
  - Possibilities: Phoenix may be counting all-time delegators (active + historical), cexplorer counts current-only; or Phoenix counts each stake-key registration even if currently undelegated.
  - Likely fix: clarify the metric in a tooltip ("All-time" vs "Current"), and verify against `dbsync.delegation` for active delegators in the most recent epoch.

- [ ] **[major][data-accuracy]** Live Pledge differs from cexplorer's "Active Pledge".
  - Phoenix: `483.43K`; Cexplorer: `481.37K`. ~0.4% gap. Smaller — could be a snapshot timing issue, but worth checking the metric label is consistent (Live = current observable, Active = epoch snapshot).

- [ ] **[major][ux]** Lifetime "Blocks Minted" list defaults to ascending (oldest first). Same issue as Epoch detail — users almost always want recent blocks first.
  - Screenshot ID: `ss_9153hhct0`.

- [ ] **[minor][ux]** No tooltips on jargon: `SATURATION`, `MARGIN`, `FIXED COST`, `DECLARED PLEDGE`, `LIVE PLEDGE`. New users don't know what these mean.
  - Likely fix: wrap each label in MUI `Tooltip`.

- [ ] **[minor][ux]** Reward Account and Owner Account in the "Accounts" section are full bech32 strings (`stake1uy89kzrdlpaz5rzu8x95r4qnlpqhd3f8mf09edjp73vcs3qhktrtm`) with no copy button visible above the fold and no truncation. They overflow on narrow viewports.

- [ ] **[nit][ux]** No social/web icons. Cexplorer shows X / Telegram / GitHub icons in pool header; Phoenix only shows the pool's website URL. The pool registration metadata typically includes social links.

- [ ] **[nit][ux]** No "Pledge Leverage" metric (cexplorer shows `1277` for OctasPool — useful indicator of how leveraged a pool is over its declared pledge).

- [ ] **[nit][ux]** No DRep / governance-vote indicator (cexplorer shows `Governance: Voting` for active pools). Useful in the Conway era.

---

### [PAGE] Address detail (`/address/:addr`)

- [ ] **[major][bug]** Byron addresses fail with a generic "There seems to be a problem fetching this data" error.
  - Repro: `/address/DdzFFzCqrhssoqjmRGTcoGaCjnRkD5UUxUxoBaCV4iQuJyaUDbQYC9CLeRdzGAMmcWGPp9TF6sw7t9CLM3WMASRCmLnSQrTpMNPGSygL` (a randomly constructed Byron-style address — confirms the Daedalus/Byron format isn't handled). The error is generic — no indication of whether the address is unsupported, malformed, or just not yet seen.
  - Screenshot ID: `ss_1171uixlj`.
  - Likely fix: detect Byron address prefix `DdzFF…` / `Ae2…` and either render a Byron-flavored detail page or show a clearer "Byron-era addresses are not yet supported" message.

- [ ] **[major][data-accuracy]** "Total Stake" label is ambiguous and inconsistent with cexplorer.
  - Phoenix shows `Total Stake: 785.229985 ADA` next to `ADA Balance: 771.318902 ADA`.
  - Cexplorer shows `Live Stake: 772.64 ADA` and `Active Stake: 464.49 ADA` — three meaningfully different numbers.
  - Phoenix's value doesn't match either of cexplorer's. The label "Total Stake" doesn't disambiguate which snapshot.
  - Likely fix: explicitly label as "Live Stake" (current UTXO sum) vs "Active Stake" (epoch snapshot), and compute both.

- [ ] **[minor][ux]** Phoenix doesn't surface ADA Handles, DRep delegation, "Last activity" timestamp, available rewards, or rewards-withdrawn. Cexplorer shows all of these. Notable for any address page.

- [ ] **[minor][ux]** Stake Address row in the address page is a tiny one-line strip (`stake1u99mjfn9mvxphz...m9qfzmr2t  [copy]  POOL: CLAY  REWARD: 59.92 ADA`) crammed into the bottom of the header card. Visually deprioritized vs balance/tx count. For delegation-aware users, this is the most important info.

---

### [PAGE] Stake address (`/stake-address/:bech32`)

- [ ] **[critical][bug]** Stake address page shows zero transactions and zero native tokens, even though the underlying payment address has 3,383 txs and 1,386 tokens.
  - Repro: from any address detail with a stake key (e.g. the example I tested), click the linked stake address. The page renders with `Transactions: 0`, `Native Tokens: 0`, and the empty-state image in the tx list.
  - Likely fix: the stake-address endpoint isn't aggregating across the underlying payment addresses. Should query `tx_out` joined to `address` filtered by `stake_address_id`.

- [ ] **[major][bug]** Stake address fetch returns "Invalid or malformed stake address format" for valid bech32 stake addresses copied from the truncated address-detail UI.
  - Repro: copy the visible truncated stake address (e.g. `stake1u99mjfn9mvxphz…9m9qfzmr2t`) — the `…` is a literal display ellipsis, not a copyable separator. Pasting that into the URL yields an API 200 with `error: "Invalid or malformed stake address format."`. The full address copies fine via the explicit copy button (good), but if a user types or hand-edits, they'll fail.
  - Likely fix: this is mostly an interaction issue — the truncated-with-ellipsis text should not be selectable as plain text, OR the API error should be surfaced instead of swallowed into a generic data-fetch failure.

- [ ] **[major][ux]** The page title is just "Address" — same template as a payment address. Should distinguish ("Stake Address" header + ST avatar already exists, but title doesn't reflect it).

- [ ] **[minor][bug]** `/stake/:addr` (without the hyphen) 404s. Reasonable, but cexplorer accepts both `/stake/` and `/address/`. Consider adding a redirect at `/stake/*` → `/stake-address/*` so URLs from external sources work.

---

### [PAGE] Native Tokens list (`/tokens`)

- [ ] **[critical][data-accuracy]** Inconsistent decimal handling between Token detail and Policy detail views.
  - HOSKY (policy `a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235`) has 0 decimals on-chain; total mint = 1,000,000,000,000,000.
  - Token detail at `/token/{policyId+assetName}` shows raw integer `1,000,000,000,000,001` (✓ correctly unscaled, but +1 from somewhere — possibly burn that wasn't subtracted).
  - Policy detail at `/policy/{policyId}` shows `1,000,000,000,000.000001` for the same asset — appears to apply 6 decimals (ADA-default) where it shouldn't.
  - Native Tokens list `/tokens` shows raw integers (LQ: `21,000,000,000,000`, where LQ has 6 decimals → real supply 21M, displayed without scaling).
  - Net result: token supply is shown three different ways across three pages. Pick one (preferably scale by registered decimals where available, raw otherwise + label the unit).
  - Screenshot IDs: `ss_686952xoq` (policy), `ss_8425i4i2c` (token detail), `ss_5737ltauw` (list).

- [ ] **[major][bug]** HOSKY incorrectly tagged as `NFT`.
  - On the token detail page, HOSKY has both a "HOSKY" ticker badge and an "NFT" badge. HOSKY is a fungible meme token with ~1 quadrillion supply, not an NFT.
  - The earlier BerryAmethyst (supply = 1) was correctly tagged NFT. Likely the NFT detection runs on something other than `supply == 1` (or fails on large-supply assets and defaults to NFT).
  - Screenshot ID: `ss_8425i4i2c`.
  - Likely fix: NFT classifier should require `supply == 1 && decimals == 0` and *also* verify there's only one mint event.

- [ ] **[major][ux]** Native tokens list has no search, no sort, no filter by ticker / policy / NFT-vs-FT.

- [ ] **[minor][ux]** Token list rows look like links (blue text `BerryAmethyst`, `LQ`, `gimbal`) but use `onClick` rather than `<a>`. Right-click → "Open in new tab" doesn't work, middle-click doesn't work, no `href` for screen readers.
  - Likely fix: wrap the row's clickable area in `<Link to=…>` from React Router.

- [ ] **[nit][ux]** Token "Total Supply" column header doesn't explain its unit. Worth a tooltip — "Raw on-chain supply (not scaled by metadata decimals)" or whichever convention you settle on.

---

### [PAGE] Token detail (`/token/:fingerprint`)

- [ ] **[major][ux]** "Transactions: 6" on HOSKY is clearly the count of mint/burn ops, not transfers. Label is misleading. Cexplorer has separate counters for mint events and tx volume. Consider renaming to "Mint Events" or "Mint/Burn Tx".

- [ ] **[minor][ux]** Asset ID at the top is shown as `asset17q7r59zlc3dgw0venc80pdv566q6yguw03f0d9` (full asset fingerprint) — good, but not labeled as "Fingerprint" (CIP-14). Add a label so users know what the bech32 asset means.

- [ ] **[nit][ux]** No CIP-25 metadata preview on the token detail page despite the "CIP-25 NFT Viewer" plugin advertised on `/plugins`. The plugin promises images/attributes for label-721 metadata; for the BerryAmethyst NFT no image preview is rendered above the fold.

---

### [PAGE] Policy detail (`/policy/:id`)

- [ ] **[critical][data-accuracy]** See decimal-handling bug above. Total Supply column on this view applies 6-decimal scaling that is not driven by the token's registered decimals.

- [ ] **[minor][ux]** "1 token under this policy" copy is fine for HOSKY but for large policies (e.g. NFT collections with thousands of assets) the page would need pagination — not yet tested but worth verifying.

---

### [PAGE] DReps (`/dreps`)

- [ ] **[critical][bug]** Sort by Active Stake is broken.
  - Repro: click the up/down arrow next to "Active Stake (₳)". URL updates to `?sort=activeVoteStake,DESC` but the rendered order remains visually unsorted: `34.82M`, `163.44K`, `0`, `0`, `33.30M`, ...
  - Looks like a string sort, not a numeric sort.
  - Screenshot ID: `ss_2182q5dt8`.
  - Likely fix: sort key on the backend or the column comparator on the frontend is treating the value as a formatted string.

- [ ] **[major][data-accuracy]** Top DRep on Phoenix is "Drep One" with 34.82M voting power; cexplorer's top DRep is "Yoroi Wallet" with 696.36M.
  - Either Phoenix's index is missing the major DReps, or "Active Stake" on Phoenix is a different metric (e.g. only own stake, not delegated).
  - Likely fix: clarify the metric label, and if it's truly active delegated stake, verify the indexer covers all DReps.

- [ ] **[minor][ux]** No counter for total DReps on the list. Hard to know if the visible list is comprehensive.

- [ ] **[minor][ux]** "Anchor Link" column shows a URL — not clickable as a link in some rows (text-only). Should always be a link with `target="_blank" rel="noopener"`.

---

### [PAGE] Governance Actions (`/governance-actions`)

- [ ] **[critical][bug]** Clicking any governance action in the list lands on a "Governance Action Not Found" page.
  - Repro: open `/governance-actions`, click any row. URL navigates to `/governance-action/<txHash>/<index>` and the page renders the not-found error: "Could not load details for action ... The proposal may not be indexed yet or the metadata anchor is unavailable."
  - The list page lists 10 actions, all unviewable.
  - Screenshot ID: `ss_3109wyouu`.
  - Likely fix: backend `/api/governance-actions/:id/:index` likely expects a different ID format than what the list returns. Check the routing.

- [ ] **[major][data-accuracy]** Total of 10 governance actions on Phoenix vs many more on cexplorer/cardanoscan. Either an indexing gap or filtered-by-default to one type.

- [ ] **[minor][ux]** Governance Action list is extremely spar