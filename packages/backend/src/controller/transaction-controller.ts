import { Router } from "express";
import { fetchTransactionDetail } from "../service/transactionService";
import { ApiReturnType } from "@shared/APIReturnType";
import { Transaction, TransactionDetail } from "@shared/dtos/transaction.dto";
import { API } from "../config/blockfrost";

export const transactionController = Router();

transactionController.get("", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? 1)));
  const size = Math.min(100, parseInt(String(req.query.size ?? 20)));

  // Walk backwards through blocks to collect enough transaction hashes first,
  // then fetch details in parallel to avoid sequential API bottleneck.
  const latestBlock = await API.blocksLatest();
  const txEntries: { txHash: string; blockHeight: number }[] = [];
  let blockHeight = latestBlock.height!;
  let toSkip = (page - 1) * size;

  // Compute epoch start slot so we can derive epochSlotNo for each tx
  const epochStartSlot = (latestBlock.slot ?? 0) - (latestBlock.epoch_slot ?? 0);

  // Collect tx hashes from recent blocks (fast — no detail fetches)
  const MAX_BLOCKS_TO_SCAN = 50;
  let blocksScanned = 0;
  while (txEntries.length < size && blockHeight > 0 && blocksScanned < MAX_BLOCKS_TO_SCAN) {
    const blockTxHashes = await API.blocksTxs(blockHeight);
    blocksScanned++;
    for (const txHash of blockTxHashes) {
      if (toSkip > 0) { toSkip--; continue; }
      if (txEntries.length >= size) break;
      txEntries.push({ txHash, blockHeight });
    }
    blockHeight--;
  }

  // Fetch all transaction details in parallel
  const txs: Transaction[] = await Promise.all(
    txEntries.map(async ({ txHash, blockHeight: bh }) => {
      const tx = await API.txs(txHash);
      const tags: import("@shared/dtos/transaction.dto").TxTag[] = [];
      const hasNativeTokens = tx.output_amount.some((a: any) => a.unit !== "lovelace");
      if (hasNativeTokens || (tx.asset_mint_or_burn_count ?? 0) > 0) tags.push("token");
      if ((tx.asset_mint_or_burn_count ?? 0) > 0) tags.push("mint");
      if ((tx.delegation_count ?? 0) > 0 || (tx.stake_cert_count ?? 0) > 0 || (tx.withdrawal_count ?? 0) > 0 || (tx.mir_cert_count ?? 0) > 0) tags.push("stake");
      if ((tx.pool_update_count ?? 0) > 0 || (tx.pool_retire_count ?? 0) > 0) tags.push("pool");
      if ((tx.redeemer_count ?? 0) > 0) tags.push("script");
      if (tags.length === 0) tags.push("transfer");
      return {
        blockNo: tx.block_height ?? bh,
        hash: txHash,
        time: tx.block_time.toString(),
        slot: tx.slot ?? 0,
        epochNo: latestBlock.epoch ?? 0,
        epochSlotNo: tx.slot ? tx.slot - epochStartSlot : 0,
        fee: parseInt(tx.fees ?? "0"),
        totalOutput: tx.output_amount
          .filter((a: any) => a.unit === "lovelace")
          .reduce((acc: number, a: any) => acc + parseInt(a.quantity), 0),
        blockHash: tx.block,
        tags,
      } as Transaction;
    })
  );

  // Estimate a reasonable total for pagination
  const estimatedTotal = latestBlock.height ?? 10000;

  res.json({
    total: estimatedTotal,
    data: txs,
    lastUpdated: Date.now(),
    currentPage: page - 1,
    pageSize: size,
  } as ApiReturnType<Transaction[]>);
});

transactionController.get("/:txHash", async (req, res) => {
  const detail = await fetchTransactionDetail(req.params.txHash);
  const response: ApiReturnType<TransactionDetail> = {
    data: detail,
    lastUpdated: Date.now(),
    currentPage: 0,
  };
  res.json(response);
});
