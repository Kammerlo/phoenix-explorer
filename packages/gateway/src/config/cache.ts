import NodeCache from "node-cache";
import {components} from "@blockfrost/openapi";
import {API, POOL_API} from "./blockfrost";
import {TransactionDetail} from "@shared/dtos/transaction.dto";

export const cache = new NodeCache({
  stdTTL: 300 // 5 minutes (default time to live for cache entries)
});

// TTL tiers. Chain data is immutable once on-chain, but anything derived from
// the tip (latest block, tx lists that include very recent blocks) needs a
// short window so the explorer stays live.
const DEFAULT_TTL = 300; // 5 minutes
const ASSET_TTL = 3600; // 1 hour — asset metadata is heavy but effectively stable
const IMMUTABLE_TTL = 86_400; // 24 hours — content-addressed by hash, never changes
const TIP_TTL = 15; // seconds — the chain tip advances every ~20s

// Every helper below funnels through cachedFetch: cache hit → in-flight dedupe →
// fetch + store. The in-flight map guarantees that N concurrent requests for the
// same key (e.g. 50 parallel tx lookups on one list page) trigger exactly one
// upstream call. `onError` lets a helper degrade to a fallback value with its
// own (usually shorter) TTL instead of failing the whole request.
const inFlight = new Map<string, Promise<unknown>>();

async function cachedFetch<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
  onError?: (err: unknown) => { value: T; ttl: number }
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== undefined) return cached as T;

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const request = (async () => {
    try {
      const value = await fetcher();
      cache.set(key, value, ttl);
      return value;
    } catch (err) {
      if (!onError) throw err;
      console.warn(`cachedFetch(${key}) failed -`, (err as Error)?.message);
      const fallback = onError(err);
      cache.set(key, fallback.value, fallback.ttl);
      return fallback.value;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, request);
  return request;
}

export function fetchAddressTotal(address: string): Promise<components["schemas"]["address_content_total"]> {
  return cachedFetch(`address-total-${address}`, DEFAULT_TTL, () => API.addressesTotal(address));
}

export function getEpoch(epochNo: string): Promise<components["schemas"]["epoch_content"]> {
  return cachedFetch(`epoch-${epochNo}`, DEFAULT_TTL, () => API.epochs(Number.parseInt(epochNo)));
}

export function getBlock(blockHash: string): Promise<components["schemas"]["block_content"]> {
  return cachedFetch(`block-${blockHash}`, DEFAULT_TTL, () => API.blocks(blockHash));
}

export function getLatestBlock(): Promise<components["schemas"]["block_content"]> {
  return cachedFetch("block-latest", TIP_TTL, () => API.blocksLatest());
}

export function getLatestEpoch(): Promise<components["schemas"]["epoch_content"]> {
  return cachedFetch("epoch-latest", TIP_TTL, () => API.epochsLatest());
}

// Network-wide supply/stake figures move slowly; a minute of staleness is
// invisible on the dashboard but removes an upstream call per page load.
export function getNetwork(): Promise<components["schemas"]["network"]> {
  return cachedFetch("network", 60, () => API.network());
}

export function getLatestParameters(): Promise<components["schemas"]["epoch_param_content"]> {
  return cachedFetch("epoch-latest-params", DEFAULT_TTL, () => API.epochsLatestParameters());
}

// A blocksPrevious page is anchored at a specific block hash, so the cached
// window stays internally consistent; the anchor (latest hash) rotates with
// the tip, naturally expiring the whole set.
export function getBlocksPrevious(
  anchorHash: string,
  page: number,
  count: number
): Promise<components["schemas"]["block_content_array"]> {
  return cachedFetch(`blocks-prev-${anchorHash}-${page}-${count}`, DEFAULT_TTL, () =>
    API.blocksPrevious(anchorHash, { page, count })
  );
}

// Pool display metadata (name/ticker) is effectively static. blockfrost.io
// only (demeter has no /pools/*); resolves to null when unavailable so block
// lists degrade to blank pool names instead of failing.
export function getPoolMetadata(
  poolId: string
): Promise<components["schemas"]["pool_metadata"] | null> {
  return cachedFetch(
    `pool-meta-${poolId}`,
    ASSET_TTL,
    async () => (POOL_API ? await POOL_API.poolMetadata(poolId) : null),
    () => ({ value: null, ttl: DEFAULT_TTL })
  );
}

// The tx-hash list of a block never changes once the block is on-chain.
export function getBlockTxs(heightOrHash: number | string): Promise<string[]> {
  return cachedFetch(`block-txs-${heightOrHash}`, DEFAULT_TTL, () => API.blocksTxs(heightOrHash));
}

export function getTransactions(txHash: string): Promise<components["schemas"]["tx_content"]> {
  return cachedFetch(`tx-${txHash}`, DEFAULT_TTL, () => API.txs(txHash));
}

export function getTxMetadata(txHash: string): Promise<components["schemas"]["tx_content_metadata"]> {
  return cachedFetch(`tx-metadata-${txHash}`, DEFAULT_TTL, () => API.txsMetadata(txHash));
}

export function getUtxos(txHash: string): Promise<components["schemas"]["tx_content_utxo"]> {
  return cachedFetch(`utxos-${txHash}`, DEFAULT_TTL, () => API.txsUtxos(txHash));
}

export function getTxDetail(txHash: string): TransactionDetail | undefined {
  return cache.get(`tx-detail-${txHash}`) as TransactionDetail | undefined;
}

// Persist the fully-assembled transaction detail so repeat views are instant.
// Only `confirmation` drifts over time, so a short TTL keeps it acceptably fresh.
export function setTxDetail(txHash: string, detail: TransactionDetail) {
  cache.set(`tx-detail-${txHash}`, detail, DEFAULT_TTL);
}

// Asset metadata is fetched once per distinct asset (a single tx references the
// same asset many times across its UTxOs). Degrades to a minimal record on error
// so one odd asset can't fail the whole tx; the short fallback TTL lets a
// transient failure recover.
export function getAsset(unit: string): Promise<components["schemas"]["asset"]> {
  return cachedFetch(
    `asset-${unit}`,
    ASSET_TTL,
    () => API.assetsById(unit),
    () => ({
      value: { asset: unit, policy_id: unit.slice(0, 56) } as unknown as components["schemas"]["asset"],
      ttl: DEFAULT_TTL
    })
  );
}

// Token list pages and per-asset mint/burn history (powers the supply chart).
export function getAssetsPage(
  page: number,
  count: number
): Promise<components["schemas"]["assets"]> {
  return cachedFetch(`assets-page-${page}-${count}`, DEFAULT_TTL, () => API.assets({ page, count }));
}

export function getAssetHistory(unit: string): Promise<components["schemas"]["asset_history"]> {
  return cachedFetch(`asset-history-${unit}`, DEFAULT_TTL, () => API.assetsHistoryAll(unit));
}

// Governance lookups. Proposals/votes/DRep records change slowly relative to
// page views; metadata endpoints 404 for anchors without off-chain documents,
// hence the null fallbacks.
export function getProposalsPage(page: number, count: number) {
  return cachedFetch(`gov-proposals-${page}-${count}`, DEFAULT_TTL, () =>
    API.governance.proposals({ page, count })
  );
}

export function getProposal(txHash: string, index: number) {
  return cachedFetch(`gov-proposal-${txHash}-${index}`, DEFAULT_TTL, () =>
    API.governance.proposal(txHash, index)
  );
}

export function getProposalMetadata(txHash: string, index: number) {
  return cachedFetch(
    `gov-proposal-meta-${txHash}-${index}`,
    DEFAULT_TTL,
    () => API.governance.proposalMetadata(txHash, index),
    () => ({ value: null, ttl: DEFAULT_TTL })
  );
}

export function getProposalVotes(txHash: string, index: number) {
  return cachedFetch(`gov-proposal-votes-${txHash}-${index}`, DEFAULT_TTL, () =>
    API.governance.proposalVotesAll(txHash, index)
  );
}

export function getDrepById(drepId: string) {
  return cachedFetch(`drep-${drepId}`, DEFAULT_TTL, () => API.governance.drepsById(drepId));
}

export function getDrepMetadata(drepId: string) {
  return cachedFetch(
    `drep-meta-${drepId}`,
    DEFAULT_TTL,
    () => API.governance.drepsByIdMetadata(drepId),
    () => ({ value: null, ttl: DEFAULT_TTL })
  );
}

export function getDrepDelegators(drepId: string) {
  return cachedFetch(`drep-delegators-${drepId}`, DEFAULT_TTL, () =>
    API.governance.drepsByIdDelegatorsAll(drepId)
  );
}

export function getDrepUpdates(drepId: string) {
  return cachedFetch(`drep-updates-${drepId}`, DEFAULT_TTL, () =>
    API.governance.drepsByIdUpdatesAll(drepId)
  );
}

export function getDrepVotes(drepId: string) {
  return cachedFetch(`drep-votes-${drepId}`, DEFAULT_TTL, () =>
    API.governance.drepsByIdVotesAll(drepId)
  );
}

// First page (Blockfrost default 100) — what the paged votes route serves.
export function getDrepVotesPage(drepId: string) {
  return cachedFetch(`drep-votes-page-${drepId}`, DEFAULT_TTL, () =>
    API.governance.drepsByIdVotes(drepId)
  );
}

// Scripts, datums and redeemers are immutable once on-chain (content-addressed by
// hash, or fixed per transaction). Each degrades gracefully to a null/empty value
// on error (e.g. a native/timelock script has no CBOR, or a backend such as
// demeter doesn't implement /scripts/*) so contract enrichment never throws.
export function getTxRedeemers(txHash: string): Promise<components["schemas"]["tx_content_redeemers"]> {
  return cachedFetch(
    `tx-redeemers-${txHash}`,
    IMMUTABLE_TTL,
    () => API.txsRedeemers(txHash),
    () => ({ value: [] as unknown as components["schemas"]["tx_content_redeemers"], ttl: IMMUTABLE_TTL })
  );
}

export function getScriptCbor(scriptHash: string): Promise<string | null> {
  return cachedFetch(
    `script-cbor-${scriptHash}`,
    IMMUTABLE_TTL,
    async () => (await API.scriptsCbor(scriptHash))?.cbor ?? null,
    () => ({ value: null, ttl: IMMUTABLE_TTL })
  );
}

export function getDatumCbor(datumHash: string): Promise<string | null> {
  return cachedFetch(
    `datum-cbor-${datumHash}`,
    IMMUTABLE_TTL,
    async () => (await API.scriptsDatumCbor(datumHash))?.cbor ?? null,
    () => ({ value: null, ttl: IMMUTABLE_TTL })
  );
}
