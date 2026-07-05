Make Phoenix Explorer the best usable open-source Cardano explorer: clean, extensible code; a rock-solid connector architecture; a fast transaction experience; and UIs that are dynamic and explanatory without being noisy. Work autonomously in phases, verify everything with evidence, and keep the app deployable at every step.

## Read first
- `CLAUDE.md` (root) — architecture, conventions, and design language. It is authoritative: three-connector system, envelope helpers, Section Storytelling primitives, theme rules (no raw hex, `theme.isDark`), timestamp + ADA formatting rules, `Table`/pagination patterns.
- `docs/connectors.md` and `docs/local-development.md`.

## North star
A newcomer understands any page in seconds; a developer extends any connector in minutes; every page feels instant on repeat visits and acceptable cold. Complete but simple — progressive disclosure over walls of detail.

## Workstream 1 — Performance (highest priority)
The transaction-detail call is the worst offender. Recent fixes added `getAsset` caching + `setTxDetail` (cold ~45s → ~6s, repeat ~0ms) — continue that work:
1. `packages/gateway/src/service/transactionService.ts#fetchTransactionDetail`: the top-level fetches (block, utxos, metadata, redeemers) and the certificate blocks (delegations, withdrawals, stakes, pool certs, MIRs) run **sequentially** — parallelize independent calls with `Promise.all`. Target: cold p50 ≤ 3s for token-heavy txs (upstream latency-bound; measure, don't guess).
2. `packages/gateway/src/controller/transaction-controller.ts` GET "": walks blocks **serially** and fetches `API.txs(txHash)` **per hash serially**. Parallelize per-block and per-tx fetches; cache block→tx-hash lists. This makes the Transactions list page crawl.
3. Audit every controller/connector for the anti-pattern documented in CLAUDE.md ("Transaction Detail Performance"): per-item `API.*ById` calls in loops → route through cached, deduped `config/cache.ts` helpers. Add helpers where missing.
4. Frontend: tx page should render progressively (overview first, tabs/flow hydrate as data arrives) instead of blocking on the full detail; keep skeletons (`LoadingWrapper`).
5. Measure before/after with timers (fresh-process cold + warm) and record numbers in the final report.

## Workstream 2 — Connector architecture (make it *the* concept)
Non-negotiable invariant: **all three connectors (Gateway, Blockfrost-direct, Yaci) expose the same API and return the same DTO shapes**, feature-gated via capabilities when a provider genuinely can't serve something.
1. Kill duplication: `blockfrostConnector.getTxDetail` hand-mirrors the gateway's `transactionService` (summary map, cert mapping, utxo mapping). Extract the shared assembly into `packages/shared/src/helpers/` as pure, casing-agnostic functions with injected resolvers — exactly the pattern already proven by `@shared/helpers/contracts.ts#buildContracts` and `txTags.ts`. Gateway and browser connectors must consume the same helper.
6. Normalize error/envelope handling: every connector method goes through `ConnectorBase.request/requestList` + `@shared/helpers/envelope` — no hand-rolled `{ data, lastUpdated }`.
2. Tighten `ConnectorBase`/capability gating: advertised capabilities must match reality per connector; unsupported paths degrade gracefully (empty + friendly message), never crash or dead-end.
3. Close Yaci gaps where yaci-store actually provides data (check its REST API before declaring unsupported).
4. Add connector-parity unit tests: same fixture in (snake_case and camelCase) → same DTO out across connectors, for tx detail at minimum.

## Workstream 3 — Code quality & reusability
1. Prefer extraction over duplication: promote repeated UI patterns into `src/components/commons/` (CLAUDE.md lists the existing primitives — reuse `LoadingWrapper`, `AdaAmount`, `buildPaginationConfig`, `ResponsiveTableWrapper`, `CopyButton` etc. before writing new ones). If a second feature adopts the Section Storytelling primitives, promote `ProtocolParameters/Common/` as CLAUDE.md prescribes.
2. Consolidate style approaches toward `styled()` + `sx` (no inline `style={}`), remove dead code on sight (CLAUDE.md "Removed" lists), prefer `date-fns` over `moment` in touched files.
3. Pure logic gets unit tests (jest): keep the pattern used for `plutusData`, `uplc`, `contracts.helper`, `yaci.contracts`. Note: many legacy *component* suites fail for pre-existing harness reasons — do not regress the passing set; fixing the harness further is welcome but secondary.
4. Keep TypeScript honest: `shared` and `gateway` must pass `tsc`; frontend must pass `vite build`. New code follows the DTO-first pattern (`@shared/dtos`).

## Workstream 4 — UI: dynamic, explanatory, simple
1. Follow the established language: plain-English lead + progressive disclosure (Raw ⇄ Decoded toggles, expanders for depth) as done in `SmartContractDetails`. Explanations must never bury the data.
2. Every list/detail page: proper skeletons, empty states, and actionable error states (see the Yaci connection-error hint pattern in `yaciConnector.ts`) — no blank screens, no raw error dumps.
3. Consistency pass: `formatADA` in cells/cards, `formatADAFull` only in detail contexts; `formatDateTimeLocal` for timestamps; `Column.hideBelow` for mobile tables; i18n keys (`t(key, defaultValue)` form) for new strings.
4. Anything visual you add must respect `useReducedMotion`, both themes via `theme.isDark`/`accentColor`, and mobile breakpoints. Zero raw hex (grep before finishing).

## Guardrails
- Never break the deployed GATEWAY path or the hosted build; graceful degradation everywhere.
- Don't invent data: if a provider can't serve a field, gate it — don't fake it.
- No new heavy dependencies without clear justification (bundle is already large; code-splitting improvements welcome).
- Keep CLAUDE.md updated as you change architecture (it is the team's memory).
- Commit in reviewable, phase-sized increments with clear messages; never commit secrets (`.env`).

## Definition of done (evidence, not assertions)
- Builds green: `npm run build --workspace=cardano-explorer-shared`, `--workspace=gateway`, `--workspace=frontend`.
- Jest: all currently-passing suites still pass + new tests for extracted helpers and parity.
- Measured numbers: tx-detail cold/warm and tx-list timings before vs after (fresh process).
- Live smoke test against mainnet (GATEWAY) **and** a Yaci devnet (`/local-yaci` proxy or provider switcher): home, blocks, tx list, a token-heavy script tx (flow + Contracts tab), an address page — screenshots for UI changes, light/dark where relevant.
- Short final report: what changed, measured improvements, parity matrix (method × connector), and follow-ups deliberately left out.