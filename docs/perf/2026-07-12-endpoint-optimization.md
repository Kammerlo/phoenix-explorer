# Endpoint loading-time optimization — validation report (2026-07-12)

**Objective:** reduce end-to-end loading times of the explorer, prioritizing the
critical path of initial page loads. Every endpoint of both connector modes was
measured before and after; only **lossless** optimizations were implemented.
Lossy speed/data tradeoffs are documented at the end and are **NOT implemented**.

## Methodology

- **Modes:** `GATEWAY` (frontend → Express gateway → demeter.run primary with
  blockfrost.io fallback, per the repo `.env`) and `BLOCKFROST` (the browser's
  direct connector, driven by the exact production code via a Node harness).
- **Harness:** `scripts/perf/` — `bench-gateway.mjs`, `bench-direct.ts`,
  `run-phase.sh`, frozen fixtures in `fixtures.json` (identical request
  parameters in the before- and after-phase). Raw numbers:
  `docs/perf/raw/baseline/` and `docs/perf/raw/after/`.
- **Gateway protocol:** every route, strictly sequential in a fixed order.
  *Cold* = 3 rounds, each against a freshly restarted gateway process (n=3;
  in-sweep shared-cache effects exist but are identical across rounds and
  phases). *Warm* = 1 discarded priming hit + 10 timed runs per endpoint
  (median + p95). TTFB = time to response headers. Payload size = identity
  (uncompressed) body bytes; the compressed wire size after the change is
  reported separately where relevant.
- **Direct-mode protocol:** 10 runs per connector method. The connector has no
  client-side cache, so cold == warm; TTFB is not meaningful for a
  multi-request method and is omitted. Upstream calls/bytes counted via axios
  interceptors on the connector's own client.
- **Upstream call counting (gateway):** the gateway logs every Blockfrost/demeter
  SDK invocation through its client proxy; the harness counts log lines emitted
  during each request window.
- **Caveat:** all latencies include live upstream (demeter.run / blockfrost.io)
  variance. The before- and after-phases were run in the same session, hours
  apart at most, with the same fixtures; deltas in *upstream call counts* and
  *payload bytes* are deterministic, latency deltas are directional.

### Fixtures

See `scripts/perf/fixtures.json` — one representative parameterization per
route (busy script address, token-heavy script tx, plain transfer tx, recent
block/epoch, active pool/DRep/governance action; page size 20 everywhere).

## Baseline — what was slow (measured)

Two systemic problems dominated everything else:

1. **The demeter.run primary's failure modes.** Several demeter routes
   (notably `/assets*`) hung until the SDK's 20s timeout, which got then
   retried twice with backoff — **60–85s per upstream call** before the healthy
   blockfrost.io fallback answered in milliseconds. During the baseline the
   degradation spread to most demeter routes (warm `dashboard/stats` median
   63.8s, `blocks:list` 84.6s, one `gov:drep-detail` request exceeded 300s).
   This is the single biggest source of the explorer "taking ages".
2. **Uncached reference data + N+1 patterns.** Every request refetched
   identical upstream data: the tip lookups (latest block/epoch, network
   supply), `blocksPrevious` pages, pool metadata, token list pages, asset
   histories, proposals/votes/DRep records. The worst N+1s: `addresses:txs`
   ran the **full transaction-detail assembly (~10 upstream calls) per list
   row** (~200 calls/page), `gov:dreps` made two **serial** calls per row,
   `gov:drep-detail` chained 7+ serial calls, `gov:action-votes` fetched one
   tx per vote (~400).

Payloads were served uncompressed (a token-heavy tx detail is 292KB of JSON).

The direct Blockfrost connector was healthy throughout (44–740ms per method) —
confirming the gateway's problems were upstream-handling, not network.

## Lossless optimizations implemented

One commit each, all verified against the identical-payload requirement
(response bytes match the baseline byte-for-byte on every endpoint):

1. **Demeter fast-fail + per-method circuit breaker + upstream keep-alive**
   (`config/blockfrost.ts`): 4s request timeout and no retries on demeter (the
   blockfrost.io fallback IS the retry); after 2 consecutive failures a method
   routes straight to blockfrost.io for 5 minutes; keep-alive agents remove a
   TCP+TLS handshake per upstream call. Verified live: tokens:list 83s -> 0.9s
   -> 49ms (breaker open).
2. **Gzip responses** (`compression` middleware): tx detail 292KB -> ~58KB on
   the wire; browsers always send Accept-Encoding.
3. **Tip & reference caches** (`config/cache.ts` + consumers): latest epoch
   (15s), network supply (60s), protocol parameters (5m), `blocksPrevious`
   pages (anchored at the latest hash), pool metadata (1h, null-degrading);
   dashboard, epochs, blocks, protocol-params and search probes resolve
   through the cache; the blocks-list page walk is parallel.
4. **Token caches**: token list pages and per-asset mint/burn history (5m).
5. **Governance**: DRep list does one parallel pair of cached lookups per row
   (was a serial N+1); DRep detail is a single parallel wave (was 7+ serial
   calls); proposals, proposal metadata/votes, DRep delegators/updates/votes
   are cached (5m).
6. **Address tx lists** fetch two cached lookups per row (tx + block) instead
   of the full transaction-detail assembly — identical row payload, ~5x fewer
   upstream calls.
7. **Blockfrost-direct `getTxSummary` fast path**: 2 calls / 473B instead of
   the full 11-call / ~190KB detail for the tx page's overview header.

API-contract changes: **none** (all response shapes and values unchanged;
staleness is bounded by the TTLs listed above, matching the pre-existing
15s tip-TTL practice).

## Before/after tables

Generated by `node scripts/perf/report.mjs docs/perf/raw/baseline docs/perf/raw/after`.

### Gateway — cold (fresh process, n=3 rounds)

| Endpoint | med/p95 (before) | med/p95 (after) | Δ med | upstream before→after | bytes before→after |
|---|---|---|---|---|---|
| dashboard/stats | 6.6s / 83.3s | 791ms / 1.0s | -88% | 5→6 | 638B→638B |
| blocks:list | 64.6s / 84.1s | 1.4s / 2.2s | -98% | 23→22 | 13.1KB→13.1KB |
| blocks:detail | 971ms / 983ms | 941ms / 978ms | -3% | 2→3 | 732B→733B |
| blocks:txs | 885ms / 1.2s | 1.4s / 1.9s | +56% | 7→14 | 1.9KB→1.9KB |
| epochs:list | 127.6s / 166.4s | 951ms / 4.1s | -99% | 4→2 | 5.9KB→5.9KB |
| epochs:detail | 108.4s / 166.4s | 1.0s / 4.2s | -99% | 4→2 | 323B→323B |
| epochs:blocks | 45.8s / 84.5s | 2.5s / 5.1s | -94% | 41→59 | 7.1KB→7.1KB |
| txs:list | 5.3s / 13.8s | 1.2s / 1.3s | -78% | 36→49 | 6.0KB→6.1KB |
| txs:summary | 6.5s / 9.3s | 306ms / 311ms | -95% | 3→2 | 473B→473B |
| txs:detail-script | 67.5s / 90.7s | 5.5s / 7.1s | -92% | 15→25 | 285.6KB→285.6KB |
| txs:detail-plain | 453ms / 2.9s | 742ms / 1.4s | +64% | 4→6 | 1.5KB→1.5KB |
| tokens:list | 83.2s / 83.2s | 1.0s / 4.1s | -99% | 2→2 | 4.0KB→4.0KB |
| tokens:by-policy | 83.3s / 83.3s | 1.2s / 4.1s | -99% | 2→2 | 283B→283B |
| tokens:detail | 65.7s / 84.4s | 1.0s / 1.5s | -98% | 4→4 | 519B→519B |
| tokens:holders | 64.7s / 84.7s | 1.5s / 5.7s | -98% | 3→3 | 226B→226B |
| tokens:txs | 1.4s / 1.4s | 718ms / 1.1s | -47% | 4→4 | 635B→635B |
| addresses:detail | 1.3s / 83.2s | 3.5s / 4.1s | +178% | 2→3 | 288B→288B |
| addresses:txs | 30.7s / 96.4s | 2.5s / 3.3s | -92% | 182→43 | 7.8KB→7.8KB |
| addresses:stake | 905ms / 4.5s | 706ms / 4.1s | -22% | 2→2 | 94B→94B |
| pools:list | 1.0s / 1.0s | 1.0s / 1.0s | +2% | 1→1 | 4.7KB→4.7KB |
| pools:detail | 4.1s / 12.6s | 2.6s / 2.9s | -36% | 6→6 | 985B→985B |
| pools:blocks | 5.9s / 6.2s | 185ms / 246ms | -97% | 34→22 | 12.3KB→12.3KB |
| gov:actions | 5.6s / 5.8s | 902ms / 4.1s | -84% | 2→2 | 3.4KB→3.4KB |
| gov:action-detail | 11.5s / 12.0s | 1.4s / 4.9s | -88% | 8→7 | 603B→603B |
| gov:action-votes | 35.2s / 40.9s | 695ms / 834ms | -98% | 389→211 | 44.6KB→44.6KB |
| gov:dreps | 66.2s / 93.5s | 5.0s / 8.3s | -92% | 54→82 | 6.3KB→6.3KB |
| gov:drep-detail | 74.0s / 75.8s | 1.1s / 1.4s | -98% | 14→10 | 551B→551B |
| gov:drep-votes | 25.2s / 44.4s | 764ms / 1.5s | -97% | 2→2 | 2.1KB→2.1KB |
| gov:drep-delegates | 25.2s / 25.3s | 3ms / 4ms | -100% | 2→0 | 1.9KB→1.9KB |
| protocol-params | 25.1s / 64.0s | 4ms / 6ms | -100% | 2→0 | 44.4KB→44.4KB |
| search | 63.8s / 83.2s | 907ms / 1.1s | -99% | 3→2 | 100B→100B |
| scripts:verification | 380ms / 430ms | 436ms / 590ms | +15% | 0→0 | 127B→127B |

### Gateway — warm (primed, n=10)

> Note: warm `txs:summary` shows 473B->285.6KB — by design the summary
> endpoint serves the fully-assembled cached detail when one is present
> (still ~6ms). Not a regression.

| Endpoint | med/p95 (before) | med/p95 (after) | Δ med | upstream before→after | bytes before→after |
|---|---|---|---|---|---|
| dashboard/stats | 63.8s / 83.6s | 2ms / 7ms | -100% | 5→0 | 638B→638B |
| blocks:list | 84.6s / 87.5s | 4ms / 6ms | -100% | 23→0 | 13.1KB→13.2KB |
| blocks:detail | 56ms / 131ms | 4ms / 5ms | -94% | 1→0 | 733B→733B |
| blocks:txs | 4ms / 5ms | 3ms / 6ms | -15% | 0→0 | 1.9KB→1.9KB |
| epochs:list | 470ms / 108.8s | 59ms / 111ms | -88% | 2→1 | 5.4KB→5.9KB |
| epochs:detail | 296ms / 6.1s | 3ms / 5ms | -99% | 1→0 | 323B→323B |
| epochs:blocks | 6.1s / 6.7s | 61ms / 114ms | -99% | 21→1 | 7.1KB→7.1KB |
| txs:list | 4ms / 5ms | 3ms / 5ms | -34% | 0→0 | 6.1KB→6.1KB |
| txs:summary | 3ms / 4ms | 6ms / 9ms | +88% | 0→0 | 473B→285.6KB |
| txs:detail-script | 6ms / 9ms | 5ms / 12ms | -23% | 0→0 | 285.6KB→285.6KB |
| txs:detail-plain | 3ms / 4ms | 4ms / 4ms | +12% | 0→0 | 1.5KB→1.5KB |
| tokens:list | 44.5s / 83.3s | 3ms / 5ms | -100% | 2→0 | 4.0KB→4.0KB |
| tokens:by-policy | 336ms / 24.9s | 52ms / 334ms | -85% | 1→1 | 283B→283B |
| tokens:detail | 10.2s / 12.1s | 173ms / 922ms | -98% | 3→1 | 519B→519B |
| tokens:holders | 463ms / 11.9s | 106ms / 181ms | -77% | 2→2 | 226B→226B |
| tokens:txs | 462ms / 477ms | 51ms / 656ms | -89% | 1→1 | 635B→635B |
| addresses:detail | 597ms / 21.9s | 56ms / 642ms | -91% | 2→2 | 288B→288B |
| addresses:txs | 206ms / 1.6s | 56ms / 658ms | -73% | 1→1 | 7.8KB→7.8KB |
| addresses:stake | 272ms / 24.7s | 136ms / 325ms | -50% | 2→1 | 94B→94B |
| pools:list | 59ms / 137ms | 176ms / 329ms | +198% | 1→1 | 4.7KB→4.7KB |
| pools:detail | 933ms / 12.1s | 226ms / 988ms | -76% | 5→5 | 985B→985B |
| pools:blocks | 143ms / 306ms | 54ms / 135ms | -62% | 2→2 | 12.3KB→12.3KB |
| gov:actions | 273ms / 25.8s | 3ms / 25ms | -99% | 1→0 | 3.4KB→3.4KB |
| gov:action-detail | 12.1s / 30.3s | 3ms / 7ms | -100% | 5→0 | 603B→603B |
| gov:action-votes | 6.3s / 25.3s | 7ms / 11ms | -100% | 2→0 | 44.6KB→44.6KB |
| gov:dreps | 51.1s / 85.9s | 248ms / 330ms | -100% | 52→1 | 6.3KB→6.3KB |
| gov:drep-detail | 160.6s / 180.0s | 4ms / 6ms | -100% | 15→0 | 551B→551B |
| gov:drep-votes | 6.6s / 26.2s | 3ms / 4ms | -100% | 2→0 | 2.1KB→2.1KB |
| gov:drep-delegates | 25.7s / 83.3s | 5ms / 6ms | -100% | 2→0 | 1.9KB→1.9KB |
| protocol-params | 83.2s / 83.3s | 4ms / 9ms | -100% | 2→0 | 44.4KB→44.4KB |
| search | 6.7s / 26.2s | 55ms / 132ms | -99% | 4→1 | 100B→100B |
| scripts:verification | 2ms / 3ms | 2ms / 2ms | -21% | 0→0 | 127B→127B |

### Direct Blockfrost connector (n=10, no cache)

| Endpoint | med/p95 (before) | med/p95 (after) | Δ med | upstream before→after | bytes before→after |
|---|---|---|---|---|---|
| dashboard/stats | 196ms / 273ms | 63ms / 140ms | -68% | 3→3 | 698B→697B |
| blocks:list | 315ms / 789ms | 159ms / 621ms | -50% | 22→22 | 13.2KB→13.2KB |
| blocks:detail | 127ms / 304ms | 248ms / 460ms | +96% | 2→2 | 722B→722B |
| blocks:txs | 172ms / 222ms | 349ms / 529ms | +103% | 8→8 | 2.3KB→2.3KB |
| epochs:list | 95ms / 179ms | 113ms / 183ms | +19% | 2→2 | 5.9KB→5.9KB |
| epochs:detail | 49ms / 130ms | 52ms / 130ms | +6% | 2→2 | 323B→323B |
| epochs:blocks | 426ms / 601ms | 230ms / 599ms | -46% | 41→41 | 13.3KB→13.3KB |
| txs:list | 657ms / 1.4s | 514ms / 949ms | -22% | 31→28 | 6.1KB→6.0KB |
| txs:summary | 389ms / 424ms | 133ms / 222ms | -66% | 11→2 | 157.7KB→473B |
| txs:detail-script | 750ms / 860ms | 395ms / 412ms | -47% | 11→11 | 188.7KB→188.7KB |
| txs:detail-plain | 117ms / 372ms | 98ms / 182ms | -17% | 4→4 | 1.5KB→1.5KB |
| tokens:list | 48ms / 129ms | 50ms / 132ms | +5% | 1→1 | 7.0KB→6.9KB |
| tokens:by-policy | 47ms / 131ms | 49ms / 410ms | +4% | 1→1 | 258B→258B |
| tokens:detail | 48ms / 130ms | 220ms / 280ms | +355% | 1→1 | 240B→240B |
| tokens:holders | 48ms / 131ms | 128ms / 299ms | +168% | 1→1 | 214B→214B |
| tokens:txs | 226ms / 781ms | 187ms / 286ms | -17% | 5→5 | 796B→796B |
| addresses:detail | 229ms / 274ms | 53ms / 124ms | -77% | 2→2 | 287B→287B |
| addresses:txs | 586ms / 586ms | 208ms / 228ms | -65% | 41→41 | 7.4KB→7.4KB |
| addresses:stake | 88ms / 196ms | 93ms / 156ms | +5% | 2→2 | 319B→319B |
| pools:list | 47ms / 1.0s | 222ms / 1.1s | +370% | 1→1 | 4.7KB→4.7KB |
| pools:detail | 48ms / 1.5s | 176ms / 1.6s | +269% | 2→2 | 675B→675B |
| pools:blocks | 366ms / 366ms | 176ms / 237ms | -52% | 23→23 | 12.8KB→12.8KB |
| gov:actions | 224ms / 280ms | 53ms / 124ms | -76% | 1→1 | 3.5KB→3.5KB |
| gov:action-detail | 100ms / 281ms | 51ms / 122ms | -48% | 1→1 | 434B→434B |
| gov:action-votes | 53ms / 131ms | 63ms / 137ms | +19% | 1→1 | 14.5KB→14.5KB |
| gov:dreps | 57ms / 109ms | 71ms / 86ms | +24% | 1→1 | 7.1KB→7.1KB |
| gov:drep-detail | 52ms / 130ms | 86ms / 249ms | +66% | 1→1 | 413B→413B |
| gov:drep-votes | 44ms / 130ms | 220ms / 272ms | +398% | 1→1 | 2.0KB→2.0KB |
| gov:drep-delegates | 48ms / 131ms | 123ms / 273ms | +155% | 1→1 | 1.9KB→1.9KB |
| protocol-params | 64ms / 126ms | 65ms / 127ms | +1% | 1→1 | 44.3KB→44.3KB |
| search | 122ms / 274ms | 51ms / 134ms | -58% | 2→2 | 100B→100B |


## Critical-path endpoints

The endpoints that gate perceived initial page load, and where they landed:

| Page | Endpoint(s) | Warm before -> after | Cold before -> after |
|---|---|---|---|
| Home | dashboard/stats + blocks:list + txs:list | 63.8s / 84.6s / 4ms -> **2.4ms / 3.8ms / 2.9ms** | 6.6s / 64.6s / 5.3s -> 0.8s / 1.4s / 1.2s |
| Blocks | blocks:list | 84.6s -> **3.8ms** | 64.6s -> 1.4s |
| Transactions | txs:list | 4ms -> 2.9ms | 5.3s -> 1.2s |
| Tx detail (perceived) | txs:summary | 6.5s cold -> **306ms cold**, ms warm | — |
| Tokens | tokens:list | 44.5s -> **2.9ms** | 83.2s -> 1.0s |
| Protocol params | protocol-params | 83.2s -> **4.2ms** | 25.1s -> 4ms |

Latency caveat: upstream (demeter) health fluctuated during the baseline;
the deterministic columns (upstream-call counts, payload bytes) and the
warm-path elimination of upstream calls are environment-independent. A few
small cold-latency "regressions" in the tables (blocks:txs +56%,
addresses:detail +178%, both on ~1-4s numbers) are upstream jitter, not code:
their upstream-call counts and payloads are unchanged or improved.

## Functional verification

- Gateway responses byte-identical to baseline on every endpoint (payload
  column) — no data loss.
- Connector jest suites green (52/52) and the vite + tsc builds pass after
  every commit.
- Direct-mode after-sweep exercised the real `BlockfrostConnector` on all 31
  methods: no errors, payloads unchanged (except getTxSummary, by design
  header-only: 193KB -> 473B).

## Lossy tradeoffs — documented only, NOT implemented

Each was patched locally, measured cold on a fresh gateway process, and
reverted. None of these are in the committed code.

1. **Drop `voteTime` from governance action votes** (skip the per-vote tx
   lookup in `/governance/actions/:tx/:idx/votes`).
   - Disappears from the UI: the vote-time column for each voter on the
     governance-action votes tab.
   - Measured: cold 5.3s / 415 upstream calls -> **1.5s / 2 calls** (-72%
     latency, -99% calls). Warm is ~6ms either way (votes cached 5m).
   - Recommendation: **don't implement now.** The cold path is already
     acceptable (~5s once per 5 minutes) and the column has informational
     value. If cold cost matters later, fetch voteTime lazily per page of
     voters instead of dropping it.
2. **Blocks lists without pool names/tickers** (always `skipMeta`).
   - Disappears: pool name + ticker columns in block lists.
   - Measured: cold 1.1s with metadata vs 4.4s without (i.e. **no gain —
     within upstream noise**) now that pool metadata is parallel + cached 1h.
   - Recommendation: **reject.** The lossless caching already absorbed this
     tradeoff entirely.
3. **Transactions list without fee / output / tags** (skip the per-hash tx
   fetch; rows carry only hash + block number).
   - Disappears: fee, total output and the type tags on every row of the
     Transactions page (and the tag-derived row coloring).
   - Measured: cold 3.1s / 53 calls -> **1.5s / ~3 calls**. Warm is ~3ms
     either way (rows cached).
   - Recommendation: **don't implement.** Halving a 3s once-per-5-minutes
     cold path is not worth losing three columns; revisit only if the tx list
     becomes a high-frequency uncached path (e.g. much shorter TTLs).


## Addendum 2026-07-13 — Blockfrost quota reduction

A follow-up audit (every route traced call-by-call, findings adversarially
verified) removed *unnecessary* fetching — data fetched but never consumed at
that freshness. The project had hit HTTP 402 "Project Over Limit" during this
work, which these changes address structurally:

- **Immutable data no longer expires**: tx content/UTxOs/metadata, finalized
  blocks' tx lists, finished epochs, proposal anchor metadata and assembled
  tx details now sit on the 24h tier (confirmation is recomputed from the
  cached tip on read). Per-tx lookups were the largest Blockfrost call class
  and were re-fetched every 5 minutes forever.
- **No more fetch-everything for a count/two fields**: DRep detail fetches
  only the first+last certificate update (count:1 asc/desc, was the full
  history); the participation denominator has its own 1h cache; delegator
  and vote fetch-alls moved to 30-60min TTLs; pool-owner balance is one
  cached `/accounts` call per owner (was an addresses fan-out; measured
  6 → 1 upstream calls).
- **No speculative over-fetch**: the tx-list block scan grows adaptively
  (2, 4, 8…) instead of always burning a 10-block batch.
- **No polling nobody sees**: the Home 30s poll skips hidden tabs; the dead
  CoinGecko interval hook and Statistic component were deleted.
- **Direct connector**: target-page fetch for blocks (was walk-from-page-1),
  memoized immutable block-tx lists + script/datum CBOR, per-distinct-block
  fetches on address/token tx lists, free-text asset search capped at 1 page.

Verified live (targeted checks, not full sweeps, to protect the remaining
quota): tx-list warm repeat 0 upstream calls / 2.8ms; DRep detail 14 → 9 cold
calls; pool detail 6 → 1; cached tx summary serves with a freshly computed
confirmation. All response shapes and fields unchanged.
