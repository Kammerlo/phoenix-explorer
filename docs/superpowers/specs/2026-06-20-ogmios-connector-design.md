# Design: Ogmios + Kupo Connector

**Date:** 2026-06-20
**Status:** Proposed — awaiting review
**Branch:** `feat/ogmios-support`

## 1. Summary

Add **Ogmios + Kupo** as a fourth data backend for Phoenix Explorer, available two ways:

1. **Direct connect** — a new frontend `OgmiosConnector` (provider type `OGMIOS`) that talks to an Ogmios HTTP endpoint (+ Kupo) straight from the browser.
2. **Gateway** — the existing Express gateway gains an **Ogmios-only mode**: when `OGMIOS_URL` is configured it serves the endpoints Ogmios/Kupo can answer and returns HTTP 501 for the rest (mirroring the existing `POOL_API === null` stub), instead of talking to Blockfrost.

Ogmios is a thin JSON-RPC bridge to a Cardano node's **local ledger state** — not a chain indexer. It answers "what is the current state of the ledger" (protocol parameters, epoch, stake pools, DReps, active governance proposals, treasury/reserves, an address's current UTxO set). It has **no historical index**: no block lists, no tx-by-hash, no transaction history, no token mint history. Kupo adds a lightweight UTxO/asset index that unlocks token holders and tokens-by-policy. The connector therefore implements a **subset** of `ApiConnector` (~16 of 30 capabilities), and the capability-gating layer (`getCapabilities()` → `requireCapability()` in `Routers.tsx`) already makes partial connectors first-class — unsupported routes fall through to `NotFound`, exactly like Yaci today.

### Locked decisions

| Decision | Choice |
|---|---|
| Backend scope | **Ogmios + Kupo** |
| Transport | **HTTP POST** (stateless JSON-RPC; no WebSocket) |
| Gateway role | **Selectable backend** — Ogmios-only mode when `OGMIOS_URL` is set |
| Implementation breadth | **Everything feasible** (all ~16 full/partial capabilities in one pass) |
| Test data | **Real recorded fixtures** from the provided live mainnet endpoints, replayed via mocked transport in CI |

## 2. Goals / Non-goals

**Goals**
- A correct, honest Ogmios+Kupo connector usable both directly and via the gateway.
- A single source of truth for Ogmios/Kupo querying + mapping (`@shared/ogmios`) consumed by both surfaces — no drift (the codebase already does this for `txTags`/`epochHelpers`).
- A real test suite covering shared mappers/services (currently `shared` and `gateway` have **zero** tests), gateway controllers, and the frontend connector.
- Small, in-scope improvements to docs/config encountered along the way.

**Non-goals**
- Historical data (blocks/txs/history) — explicitly out, gated off.
- WebSocket / chain-sync / mempool streaming.
- Changing the existing Blockfrost/Yaci connectors' behavior.
- Bech32/CIP-129 encoding correctness beyond what the DTOs need (best-effort; flagged where relevant).

## 3. Capability contract

`getCapabilities()` is the single source of truth. The connector advertises exactly the methods below; everything else inherits `ConnectorBase`'s unsupported default and its route gates to `NotFound`.

### Served by Ogmios (live ledger state)

| Capability | Ogmios query | Coverage notes |
|---|---|---|
| `getCurrentProtocolParameters` | `queryLedgerState/protocolParameters` | ✅ Full |
| `getDashboardStats` | `queryNetwork/blockHeight` + `queryNetwork/tip` + `queryLedgerState/epoch` + `treasuryAndReserves` + `liveStakeDistribution` + `eraSummaries` | ✅ Structure complete; **degraded sub-fields**: current-epoch `txCount`/`blkCount` and latest-block `txCount`/`size` are not observable from local state → `0`; supply derived (max = 45e15 lovelace constant; total = max − reserves; circulating ≈ total − treasury; `locked` = `0`). Block/epoch times derived from slot via `eraSummaries`. |
| `getEpoch` | `queryLedgerState/epoch` + `eraSummaries` | ⚠️ **Current epoch only**; `txCount`/`blkCount`/`outSum` not available → `0`; times/`epochSlotNo` derived. Historical epochs gate off. |
| `getPoolList` | `queryLedgerState/stakePools` (`includeStake`) | ✅ id/pledge/cost/margin/live-stake/saturation; `poolName`/`tickerName` best-effort from `metadata.url`; `lifetimeBlock` = `0`. |
| `getPoolDetail` | `queryLedgerState/stakePools` (filtered) | ⚠️ Params + live stake + owners/relays/metadata; no block history/ROS/delegator count → `0`. |
| `getDreps` | `queryLedgerState/delegateRepresentatives` | ✅ id, `activeVoteStake`=`stake.ada.lovelace`, `delegators`=`delegators.length`, status; anchor best-effort. Vote breakdown not available. |
| `getDrep` | `queryLedgerState/delegateRepresentatives` (filter) | ⚠️ Single DRep from the list. |
| `getGovernanceOverviewList` | `queryLedgerState/governanceProposals` | ⚠️ **Active proposals only**; `status` = `ACTIVE`, `expiredEpoch` = `until.epoch`. No enacted/expired history. |
| `getGovernanceDetail` | `queryLedgerState/governanceProposals` (filter) | ⚠️ Active proposals only; `votesStats` aggregated from `votes[]`; anchor metadata best-effort. |
| `getGovernanceActionVotes` | `queryLedgerState/governanceProposals` (votes embedded) | ⚠️ Active proposals only; one `GovActionVote` per `votes[]` issuer. |
| `getWalletStakeFromAddress` | `queryLedgerState/rewardAccountSummaries` | ⚠️ Delegation pool + rewards available; `rewardWithdrawn` not available → `0`; no tx history. |
| `getWalletAddressFromAddress` | `queryLedgerState/utxo` (`addresses` filter) | ✅ ADA balance + token holdings aggregated from the address's UTxO set; `txCount` = `0` (no history). |

### Served by Kupo (UTxO/asset index)

| Capability | Kupo query | Coverage notes |
|---|---|---|
| `getTokenHolders` | `/matches/{policy}.{name}?unspent` | ✅ Aggregate holders by address; **heavy for popular tokens** (note in UI/limits). |
| `getTokensByPolicy` | `/matches/{policy}.*?unspent` | ⚠️ Enumerate assets under a policy + supply; off-chain metadata best-effort. |
| `getTokenDetail` | `/matches/{policy}.{name}?unspent` | ⚠️ Supply + holder count; CIP-25/registry metadata best-effort (likely omitted initially). |
| `search` | dispatch by input shape (Ogmios + Kupo) | ⚠️ Best-effort existence resolution: `addr…`→address, `stake…`→stake, `pool1…`→pool, `drep1…`→drep, 56-hex→policy. |

### Gated off (no index in Ogmios or Kupo)

`getEpochs`, `getBlocksPage`, `getBlocksByEpoch`, `getBlockDetail`, `getPoolBlocks`, `getTxDetail`, `getTransactions`, `getAddressTxsFromAddress`, `getTokensPage`, `getTokenTransactions`, `getStakeAddressRegistrations`, `getStakeDelegations`, `getPoolRegistrations`, `getDrepVotes`, `getDrepDelegates`.

## 4. Architecture

### 4.1 Shared core — `@shared/ogmios/` (single source of truth)

Both surfaces (frontend connector, gateway controllers) produce **identical shared-DTO responses from identical logic**. To prevent drift, that logic lives once in `@shared`, layered:

```
packages/shared/src/ogmios/
├── client.ts        # OgmiosClient + KupoClient — transport only.
│                    #   OgmiosClient.query(method, params?) → JSON-RPC over HTTP POST.
│                    #   KupoClient.matches(pattern, opts) / health() → REST GET.
│                    #   Both take (baseUrl, fetchImpl, headers?) — fetch is INJECTED.
├── types/           # Real Ogmios/Kupo response shapes (confirmed against live mainnet).
├── mappers/         # PURE raw→DTO functions (one file per mapper, unit-tested).
├── services/        # Orchestration: (clients, params) → ApiReturnType<T>.
│                    #   Calls client, maps, wraps via envelope()/errorEnvelope().
│                    #   These are the functions BOTH surfaces call.
└── __fixtures__/    # Real recorded responses (replayed in tests).
```

**Transport injection.** `client.ts` defines a minimal `FetchLike` type and accepts a `fetch` implementation in the constructor — no dependency on `axios`/`ws` and no DOM lib in `shared`'s tsconfig. Browser passes `window.fetch.bind(window)`; gateway passes Node 18+ global `fetch`; tests pass a mock. (`shared/tsconfig.json` keeps its current `lib` defaults.)

**Service layer is the payoff.** Because the gateway runs Ogmios-only and the direct connector serve the same responses, a service function like `getDashboardStats(ogmios, kupo, params): Promise<ApiReturnType<DashboardStats>>` is called verbatim by:
- the connector method: `getDashboardStats() { return ogmiosService.getDashboardStats(this.ogmios, this.kupo); }`
- the gateway controller: `res.json(await ogmiosService.getDashboardStats(OGMIOS, KUPO))`

Each surface method/handler becomes ~1 line. Mapping, envelope creation, and error handling exist in exactly one place.

**Note on `@shared` scope.** This expands `@shared` beyond pure DTOs to include a client + services. This is deliberate and consistent with the existing precedent (`helpers/txTags.ts` holds logic shared between gateway controllers and `BlockfrostConnector`). The justification is the codebase's own stated value: one source of truth to prevent drift.

### 4.2 Frontend — direct `OGMIOS` connector

- `packages/frontend/src/commons/connector/ogmios/ogmiosConnector.ts` extends `ConnectorBase`. Constructs `OgmiosClient`/`KupoClient` with browser `fetch`, delegates every method to `@shared/ogmios/services`, declares the §3 capability set.
- `stores/provider.ts`: add `"OGMIOS"` to `ProviderType`; extend `ProviderConfig` with an optional `kupoUrl?: string` (Ogmios + Kupo are two services).
- `commons/connector/ConnectorFactory.ts`: add the `OGMIOS` branch (`new OgmiosConnector(config.baseUrl, config.kupoUrl)`).
- `components/commons/ProviderSwitcher/index.tsx`: add an "Ogmios + Kupo (Direct)" option with **two** URL fields (Ogmios URL + Kupo URL). Direct mode embeds any auth in the URL (demeter-style subdomain), same browser-exposure tradeoff as Blockfrost-direct.
- `getTokenDetail` returns `TProtocolParam`-free DTOs; the only structural-cast point is `getCurrentProtocolParameters`, where the shared `ProtocolParams` object is returned as `ApiReturnType<TProtocolParam>` (the two shapes are structurally identical — see §5.1).

### 4.3 Gateway — Ogmios-only mode

- `packages/gateway/src/config/ogmios.ts` (mirrors `config/blockfrost.ts`): builds `OGMIOS`/`KUPO` clients from env, `null` when unset, with a startup banner. `IS_OGMIOS_ACTIVE = !!OGMIOS_URL`.
- `config/env.ts`: add `OGMIOS_URL`, `KUPO_URL`.
- `config/blockfrost.ts`: relax the startup throw so the gateway may boot with **only** Ogmios configured (today it throws unless Blockfrost or Demeter is set). When `IS_OGMIOS_ACTIVE`, Blockfrost/Demeter config is optional and its client is not required.
- `app.ts`: **mode-select at mount time** to keep existing Blockfrost controllers untouched (zero regression risk):
  - `IS_OGMIOS_ACTIVE` → mount thin **Ogmios controllers** (`controller/ogmios/*`) for the served endpoints; mount a shared `unsupportedRouter` (HTTP 501 `unsupportedEnvelope`) catch-all for the rest.
  - else → today's Blockfrost controller mounts, unchanged.
- Ogmios controllers are thin: each calls the matching `@shared/ogmios/services` function and `res.json`s the result. The frontend `GatewayConnector` is unchanged — it hits `/api/*` and gets shared DTOs regardless of backend.

## 5. Mapping notes (grounded in live mainnet responses)

Real shapes differ from the published docs; these are confirmed against the provided endpoints.

### 5.1 Protocol parameters → flat `ProtocolParams` (≅ `TProtocolParam`)

Ogmios `protocolParameters` uses nested envelopes and ratio strings. Mapper rules:
- Lovelace is nested: `minFeeConstant.ada.lovelace`, `stakeCredentialDeposit.ada.lovelace`, `stakePoolDeposit.ada.lovelace`, `minStakePoolCost.ada.lovelace`, `minUtxoDepositConstant.ada.lovelace`, `governanceActionDeposit.ada.lovelace`, `delegateRepresentativeDeposit.ada.lovelace`.
- Byte sizes nested: `maxBlockBodySize.bytes`, `maxBlockHeaderSize.bytes`, `maxTransactionSize.bytes`, `maxValueSize.bytes`.
- **Ratio strings** `"n/m"` → decimal numbers: `stakePoolPledgeInfluence` ("3/10"→0.3) → `a0`; `monetaryExpansion` ("3/1000"→0.003) → `rho`; `treasuryExpansion` ("1/5"→0.2) → `tau`; `scriptExecutionPrices.memory`/`.cpu` → `priceMem`/`priceStep`; pool `margin` "1/100"→0.01. A `parseRatio("n/m"): number` helper (pure, unit-tested) handles these.
- Field name map: `minFeeCoefficient`→`minFeeA`, `minFeeConstant`→`minFeeB`, `desiredNumberOfStakePools`→`nOpt`, `minUtxoDepositCoefficient`→`coinsPerUTxOByte`, `stakePoolRetirementEpochBound`→`eMax`/`maxEpoch`, `governanceActionLifetime`→`govActionLifetime`, `governanceActionDeposit`→`govActionDeposit`, `delegateRepresentativeDeposit`→`drepDeposit`, `delegateRepresentativeMaxIdleTime`→`drepActivity`, `constitutionalCommitteeMinSize`→`ccMinSize`, `constitutionalCommitteeMaxTermLength`→`ccMaxTermLength`, `version.major/minor`→`protocolMajor/protocolMinor`.
- `plutusCostModels` (`{"plutus:v1":[…],…}`) → `costModels: JSON.stringify(...)` (matches the gateway's existing protocol-params controller output exactly).
- The returned object is structurally identical to the gateway's current flat `Record` and to the frontend ambient `TProtocolParam`.

### 5.2 Dashboard stats → `DashboardStats`

- `latestBlock`: height = `queryNetwork/blockHeight` (number); `tip` returns `{slot, id}` (**`id` is the block hash, not `hash`**); `time` derived from `slot` via `eraSummaries`; `txCount`/`size` not observable → `0`.
- `currentEpoch.no` = `queryLedgerState/epoch` (number); start/end times + `progressPercent` derived from `eraSummaries` + tip slot; `txCount`/`blkCount`/`outSum` → `0`/`null`.
- `supply`: `max` = `45_000_000_000_000_000` lovelace (constant); `total` = max − `reserves.ada.lovelace`; `circulating` = total − `treasury.ada.lovelace`; `locked` = `"0"`. (All string lovelace.)
- `stake.live` = sum of `liveStakeDistribution`; `stake.active` = sum of `stakePools[].stake` (or omit if too heavy → live only). Degradations documented in code comments.

### 5.3 Stake pools → `PoolOverview` / `PoolDetail`

`stakePools` result is a **map keyed by bech32 pool id**; each value: `{ id, vrfVerificationKeyHash, pledge.ada.lovelace, cost.ada.lovelace, margin ("1/100"), rewardAccount, owners[], relays[{type,hostname,port}], metadata{url,hash}, stake.ada.lovelace }`.
- `PoolOverview`: `poolId`=id, `declaredPledge`=pledge, `poolSize`=stake, `saturation`=`stake / (totalActiveStake / nOpt)`, `poolName`/`tickerName` best-effort from `metadata.url` JSON, `lifetimeBlock`=0, `id`=synthetic index.
- `PoolDetail`: + `cost`, `margin` (parsed), `vrfKey`, `rewardAccounts`/`ownerAccounts`, `relays`, `homepage`/`description`/`iconUrl` from fetched metadata; `delegators`/`reward`/`ros`/`epochBlock`/`lifetimeBlock`=0.

### 5.4 DReps → `Drep`

`delegateRepresentatives[]`: `{ type ("registered"|predefined), from, id (hex cred), mandate.epoch, deposit.ada.lovelace, stake.ada.lovelace, delegators[{from,credential}], metadata? }`.
- `drepHash`=id; `drepId`= bech32/CIP-129 (best-effort; a small bech32 helper in `shared`, flagged risk — fall back to hex if unavailable); `activeVoteStake`/`votingPower`=stake; `delegators`=delegators.length; `status`=ACTIVE for `registered`; `anchorUrl`/`anchorHash` from metadata when present.

### 5.5 Governance proposals → `GovernanceActionListItem` / `…Detail` / `GovActionVote`

`governanceProposals[]`: `{ proposal{transaction.id,index}, deposit, returnAccount, metadata{url,hash}, action{type,…}, since{epoch}, until{epoch}, votes[{issuer{role,from,id},vote}] }`.
- ListItem: `txHash`=transaction.id, `index`, `type`=action.type (mapped to display string), `status`=ACTIVE, `expiredEpoch`=until.epoch.
- Detail: + `votesStats` (aggregate `votes[]` by `issuer.role`); `anchorUrl/Hash` from metadata; `depositReturn`=returnAccount.
- Votes: one `GovActionVote` per issuer; `voterType` map: `constitutionalCommittee`→`constitutional_committee`, `delegateRepresentative`→`drep`, `stakePoolOperator`→`spo`.

### 5.6 Address → `AddressDetail`; stake → `StakeAddressDetail`; Kupo → holders

- `AddressDetail`: Ogmios `utxo` (addresses filter) returns the UTxO set; sum `value.ada.lovelace` → `balance`; aggregate `value` assets → `tokens[]`; `txCount`=0.
- `StakeAddressDetail`: `rewardAccountSummaries` → delegate pool id + rewards; `rewardWithdrawn`=0 (verify shape during impl).
- `TokenHolder[]`: Kupo `/matches/{unit}?unspent` → group by `address`, sum quantity, compute `ratio`. **Kupo match object** (per Kupo docs, verify against live index): `{ transaction_id, output_index, address, value{coins,assets}, datum_hash, created_at{slot_no,header_hash}, spent_at }`.

## 6. Testing strategy

The user explicitly requires "a proper testing suite." Current state: only `frontend` has Jest; `shared` and `gateway` have none.

- **Add Jest + ts-jest** to `packages/shared` and `packages/gateway`. Add a root `test` script running all three workspaces. CI/local: `npm test`.
- **Fixtures**: record **real** responses from the provided live endpoints into `@shared/ogmios/__fixtures__/` (a small, committed, gitignored-secret-free capture script run once during implementation). Tests replay fixtures via a mocked `FetchLike` — no live dependency in CI, fully reproducible.
- **Shared — mappers (TDD, the heart of correctness):** one `describe` per mapper, asserting exact DTO output from each fixture, plus pure-helper tests (`parseRatio`, supply derivation, slot→time). Mappers are written test-first.
- **Shared — clients:** `OgmiosClient`/`KupoClient` with a mocked `fetch` — JSON-RPC envelope shape, params passthrough, HTTP-error and JSON-RPC-error propagation.
- **Shared — services:** mock the clients, assert the full `ApiReturnType` envelope (data + pagination + error path).
- **Gateway:** `supertest` against the Express app with the Ogmios/Kupo HTTP layer mocked — assert (a) Ogmios mode serves correct DTOs for served endpoints, (b) Ogmios mode returns 501 for gated endpoints, (c) Blockfrost mode (no `OGMIOS_URL`) is unchanged.
- **Frontend connector:** unit-test `OgmiosConnector` with a mocked `fetch` — capability set, service delegation, envelope wrapping; reuse the existing `verifyCapabilityImplementations` drift test.
- **Optional live smoke test:** a separate, opt-in (env-gated, skipped in CI) test that hits the real endpoints to catch upstream shape drift.

## 7. Config & secrets

- New env (root `.env`, documented in `.env.example` with **placeholders only**):
  - Gateway: `OGMIOS_URL`, `KUPO_URL`.
  - Frontend direct mode: `REACT_APP_API_TYPE=OGMIOS`, `REACT_APP_API_URL` = the Ogmios endpoint (seeds `ProviderConfig.baseUrl`, consistent with the other providers), and a new `REACT_APP_KUPO_URL` (seeds `ProviderConfig.kupoUrl`).
- The provided demeter Ogmios/Kupo **API keys are secrets**: used only for the one-time fixture capture and any local smoke test, stored only in the gitignored root `.env`, never committed. `.env.example` shows placeholder URLs.

## 8. In-scope improvements (encountered along the way)

- `@shared/ogmios` as the shared client+mapper+service core (DRY).
- `docs/connectors.md`: add an Ogmios column to the feature matrix + an "Ogmios + Kupo" section; document the Ogmios-only gateway mode.
- `.env.example`: Ogmios/Kupo section.
- Relax `config/blockfrost.ts` startup so an Ogmios-only gateway can boot.

## 9. Risks & open questions

- **Kupo index config (highest risk).** The demeter shared Kupo returned empty `/matches` for a HOSKY query and empty `/patterns`. Its match configuration may be restricted. Token holders / tokens-by-policy depend on Kupo indexing the relevant patterns. Mitigation: verify `/patterns` + a known-good match early in implementation; if the shared Kupo is restricted, document the requirement (run Kupo with `--match "*"`) and keep the Kupo-backed capabilities behind that verification (gate them off if the index can't serve them).
- **DRep `drepId` bech32/CIP-129 encoding.** Needs a small bech32 encoder in `shared`. Fall back to hex `drepHash` if not feasible; flagged, not blocking.
- **Heavy queries.** Unfiltered `stakePools` (~3000) and popular-token holder aggregation are large. Paginate in the service layer (slice mapped results by `pageInfo`) and note limits in the UI.
- **`rewardAccountSummaries` exact shape** not live-verified (needs a stake credential hex). Verify during implementation.
- **Era/slot→time math.** Reuse `eraSummaries`; cross-check against `epochHelpers` constants.

## 10. Build sequence (high level; expanded by the implementation plan)

1. **Shared core scaffolding** — `client.ts` (`FetchLike`, `OgmiosClient`, `KupoClient`), `types/`, Jest setup for `shared`. Tests for clients.
2. **Mappers (TDD)** — protocol params (+`parseRatio`), dashboard/supply, pools, dreps, governance, address, stake, token/holders. Fixture capture script. Pure-function tests.
3. **Services** — one per capability, returning `ApiReturnType<T>`; pagination; service tests with mocked clients.
4. **Frontend connector** — `OgmiosConnector`, provider type/config, factory, ProviderSwitcher; connector tests.
5. **Gateway Ogmios mode** — `config/ogmios.ts`, env, `blockfrost.ts` startup relax, `controller/ogmios/*`, `unsupportedRouter`, `app.ts` mode-select; Jest setup for `gateway`; supertest tests.
6. **Docs/config + capability matrix** — `docs/connectors.md`, `.env.example`, root `test` script.
7. **Verification** — full `npm test`, frontend build, optional live smoke test, manual smoke of served routes.
