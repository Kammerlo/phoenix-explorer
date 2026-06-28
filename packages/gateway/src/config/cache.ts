import NodeCache from "node-cache";
import {components} from "@blockfrost/openapi";
import {API} from "./blockfrost";
import {TransactionDetail} from "@shared/dtos/transaction.dto";
import { addressesTotal } from "@blockfrost/blockfrost-js/lib/endpoints/api/addresses";

export const cache = new NodeCache({
  stdTTL: 300 // 5 minutes (default time to live for cache entries)
});

export async function fetchAddressTotal(address: string): Promise<components['schemas']['address_content_total']> {
  const cachedAddressTotal = cache.get(`address-total-${address}`) as components['schemas']['address_content_total'];
    if (cachedAddressTotal) {
        console.log("Using cached address total data for address:", address);
        return cachedAddressTotal;
    } else {
        const addressTotal = await API.addressesTotal(address);
        cache.set(`address-total-${address}`, addressTotal, 300); // Cache for 5 minutes
        return addressTotal;
    }
}

export async function getEpoch(epochNo : string) {
  // Check if the epoch is cached
  const cachedEpoch = cache.get(`epoch-${epochNo}`) as components['schemas']['epoch_content'];
  let epoch;
  if (cachedEpoch) {
    console.log("Using cached epoch data for epoch:", epochNo);
    epoch = cachedEpoch;
  } else {
    // If not cached, fetch the epoch data
    epoch = await API.epochs(Number.parseInt(epochNo));
    cache.set(`epoch-${epochNo}`, epoch, 300); // Cache for 5 minutes
  }
  return epoch;
}

export async function getBlock(blockHash: string) {
  // Check if the block is cached
  const cachedBlock = cache.get(`block-${blockHash}`) as components['schemas']['block_content'];
  let block;
  if (cachedBlock) {
    console.log("Using cached block data for block:", blockHash);
    block = cachedBlock;
  } else {
    // If not cached, fetch the block data
    block = await API.blocks(blockHash);
    cache.set(`block-${blockHash}`, block, 300); // Cache for 5 minutes
  }
  return block;
}

export async function getTransactions(txHash: string) {
  const cachedTransaction = cache.get(`tx-${txHash}`) as components['schemas']['tx_content'];
  let transaction;
  if (cachedTransaction) {
    console.log("Using cached transaction data for transaction:", txHash);
    transaction = cachedTransaction;
  } else {
    // If not cached, fetch the transaction data
    transaction = await API.txs(txHash);
    cache.set(`tx-${txHash}`, transaction, 300); // Cache for 5 minutes
  }
  return transaction;
}

export async function getTxMetadata(txHash: string) {
  const cachedMetadata = cache.get(`tx-metadata-${txHash}`) as components['schemas']['tx_content_metadata'];
  let metadata;
  if (cachedMetadata) {
    console.log("Using cached transaction metadata for transaction:", txHash);
    metadata = cachedMetadata;
  } else {
    // If not cached, fetch the transaction metadata
    metadata = await API.txsMetadata(txHash);
    cache.set(`tx-metadata-${txHash}`, metadata, 300); // Cache for 5 minutes
  }
  return metadata;
}

export async function getUtxos(txHash: string) {
  const cachedUtxos = cache.get(`utxos-${txHash}`) as components['schemas']['tx_content_utxo'];
  let utxos;
  if (cachedUtxos) {
    console.log("Using cached UTXOs for transaction:", txHash);
    utxos = cachedUtxos;
  } else {
    // If not cached, fetch the UTXOs
    utxos = await API.txsUtxos(txHash);
    cache.set(`utxos-${txHash}`, utxos, 300); // Cache for 5 minutes
  }
  return utxos;
}

export async function getTxDetail(txHash: string) {
  return cache.get(`tx-detail-${txHash}`) as TransactionDetail;
}

// Persist the fully-assembled transaction detail so repeat views are instant.
// Only `confirmation` drifts over time, so a short TTL keeps it acceptably fresh.
export function setTxDetail(txHash: string, detail: TransactionDetail) {
  cache.set(`tx-detail-${txHash}`, detail, 300);
}

// Asset metadata is heavy (one Blockfrost call per asset) but effectively stable,
// and a single transaction references the same asset many times across its UTxOs.
// Cache + dedupe it so each distinct asset is fetched at most once per hour.
// Degrades to a minimal record on error so one odd asset can't fail the whole tx.
const ASSET_TTL = 3600; // 1 hour

export async function getAsset(unit: string): Promise<components["schemas"]["asset"]> {
  const key = `asset-${unit}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached as components["schemas"]["asset"];
  try {
    const asset = await API.assetsById(unit);
    cache.set(key, asset, ASSET_TTL);
    return asset;
  } catch (err) {
    console.warn("getAsset failed for", unit, "-", (err as Error)?.message);
    const fallback = { asset: unit, policy_id: unit.slice(0, 56) } as unknown as components["schemas"]["asset"];
    cache.set(key, fallback, 300); // short TTL so a transient failure can recover
    return fallback;
  }
}

// Scripts, datums and redeemers are immutable once on-chain (content-addressed by
// hash, or fixed per transaction), so they can be cached far longer than the
// default 5-minute TTL. Each helper degrades gracefully to a null/empty value on
// error (e.g. a native/timelock script has no CBOR, or a backend such as demeter
// doesn't implement the /scripts/* endpoints) so contract enrichment never throws.
const IMMUTABLE_TTL = 86_400; // 24 hours

export async function getTxRedeemers(txHash: string) {
  const key = `tx-redeemers-${txHash}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached as components["schemas"]["tx_content_redeemers"][];
  try {
    const redeemers = await API.txsRedeemers(txHash);
    cache.set(key, redeemers, IMMUTABLE_TTL);
    return redeemers;
  } catch (err) {
    console.warn("getTxRedeemers failed for", txHash, "-", (err as Error)?.message);
    cache.set(key, [], IMMUTABLE_TTL);
    return [] as components["schemas"]["tx_content_redeemers"][];
  }
}

export async function getScriptCbor(scriptHash: string): Promise<string | null> {
  const key = `script-cbor-${scriptHash}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached as string | null;
  try {
    const res = await API.scriptsCbor(scriptHash);
    const cbor = res?.cbor ?? null;
    cache.set(key, cbor, IMMUTABLE_TTL);
    return cbor;
  } catch (err) {
    console.warn("getScriptCbor failed for", scriptHash, "-", (err as Error)?.message);
    cache.set(key, null, IMMUTABLE_TTL);
    return null;
  }
}

export async function getDatumCbor(datumHash: string): Promise<string | null> {
  const key = `datum-cbor-${datumHash}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached as string | null;
  try {
    const res = await API.scriptsDatumCbor(datumHash);
    const cbor = res?.cbor ?? null;
    cache.set(key, cbor, IMMUTABLE_TTL);
    return cbor;
  } catch (err) {
    console.warn("getDatumCbor failed for", datumHash, "-", (err as Error)?.message);
    cache.set(key, null, IMMUTABLE_TTL);
    return null;
  }
}
