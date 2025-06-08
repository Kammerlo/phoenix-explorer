import NodeCache from "node-cache";
import {components} from "@blockfrost/openapi";
import {API} from "./blockfrost";
import {TransactionDetail} from "@shared/dtos/transaction.dto";

export const cache = new NodeCache({
  stdTTL: 300 // 5 minutes (default time to live for cache entries)
});

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
