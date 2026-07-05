import NodeCache from "node-cache";
import {components} from "@blockfrost/openapi";
import {API} from "./blockfrost";
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
