import { Router } from "express";
import { fetchTransactionDetail } from "../service/transactionService";
import { ApiReturnType } from "@shared/APIReturnType";
import { Transaction, TransactionDetail } from "@shared/dtos/transaction.dto";
import { getBlock, getBlockTxs, getLatestBlock, getTransactions, getTxDetail } from "../config/cache";
import { computeTxTags, computeTotalLovelaceOutput } from "@shared/helpers/txTags";
import { buildTransactionDetail } from "@shared/helpers/txDetail";
import { asyncHandler } from "../middleware/asyncHandler";

export const transactionController = Router();

// Blockfrost has no global tx-list endpoint, so the list is assembled by walking
// blocks backwards from the tip. Block tx-lists are fetched in parallel batches
// and cached (block→hashes never changes), so paging deeper or refreshing reuses
// the already-scanned prefix instead of re-walking it serially.
const MAX_BLOCKS_TO_SCAN = 50;
const BLOCK_BATCH_SIZE = 10;

transactionController.get("", asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? 1)));
  const size = Math.min(100, parseInt(String(req.query.size ?? 20)));
  const wanted = page * size;

  const latestBlock = await getLatestBlock();
  // Epoch start slot lets us derive epochSlotNo for each tx without a block lookup.
  const epochStartSlot = (latestBlock.slot ?? 0) - (latestBlock.epoch_slot ?? 0);

  const txEntries: { txHash: string; blockHeight: number }[] = [];
  let height = latestBlock.height!;
  let blocksScanned = 0;
  while (txEntries.length < wanted && height > 0 && blocksScanned < MAX_BLOCKS_TO_SCAN) {
    const batchHeights: number[] = [];
    while (
      batchHeights.length < BLOCK_BATCH_SIZE &&
      height - batchHeights.length > 0 &&
      blocksScanned + batchHeights.length < MAX_BLOCKS_TO_SCAN
    ) {
      batchHeights.push(height - batchHeights.length);
    }
    const hashLists = await Promise.all(batchHeights.map((h) => getBlockTxs(h)));
    hashLists.forEach((hashes, i) => {
      for (const txHash of hashes) {
        txEntries.push({ txHash, blockHeight: batchHeights[i] });
      }
    });
    blocksScanned += batchHeights.length;
    height -= batchHeights.length;
  }

  const pageEntries = txEntries.slice((page - 1) * size, wanted);
  const txs: Transaction[] = await Promise.all(
    pageEntries.map(async ({ txHash, blockHeight }) => {
      const tx = await getTransactions(txHash);
      return {
        blockNo: tx.block_height ?? blockHeight,
        hash: txHash,
        time: tx.block_time.toString(),
        slot: tx.slot ?? 0,
        epochNo: latestBlock.epoch ?? 0,
        epochSlotNo: tx.slot ? tx.slot - epochStartSlot : 0,
        fee: parseInt(tx.fees ?? "0"),
        totalOutput: computeTotalLovelaceOutput(tx.output_amount),
        blockHash: tx.block,
        tags: computeTxTags(tx),
      } as Transaction;
    })
  );

  // Blockfrost does not expose a total tx count; mark the total as unknown so the
  // UI can render "Page N" instead of a misleading "X of Y" derived from block height.
  res.json({
    data: txs,
    lastUpdated: Date.now(),
    currentPage: page - 1,
    pageSize: size,
    totalUnknown: true,
  } as ApiReturnType<Transaction[]>);
}));

// Lightweight header-only detail (tx + block, two cached lookups) so the
// frontend can render the overview while the full detail loads. Serves the
// fully-assembled detail straight from cache when available.
transactionController.get("/:txHash/summary", asyncHandler(async (req, res) => {
  const txHash = String(req.params.txHash);
  const cached = getTxDetail(txHash);
  if (cached) {
    res.json({ data: cached, lastUpdated: Date.now() } as ApiReturnType<TransactionDetail>);
    return;
  }
  const tx = await getTransactions(txHash);
  const block = await getBlock(tx.block);
  const summary = await buildTransactionDetail({ tx, block, utxos: { inputs: [], outputs: [] } });
  // Header only — leave the heavy sections undefined so the UI keeps their skeletons.
  summary.utxOs = undefined;
  summary.collaterals = undefined;
  res.json({ data: summary, lastUpdated: Date.now() } as ApiReturnType<TransactionDetail>);
}));

transactionController.get("/:txHash", asyncHandler(async (req, res) => {
  const detail = await fetchTransactionDetail(String(req.params.txHash));
  const response: ApiReturnType<TransactionDetail> = {
    data: detail,
    lastUpdated: Date.now(),
    currentPage: 0,
  };
  res.json(response);
}));
