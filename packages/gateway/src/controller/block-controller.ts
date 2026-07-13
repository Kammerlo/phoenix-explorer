import {Router} from "express";
import {Block} from "@shared/dtos/block.dto";
import {ApiReturnType} from "@shared/APIReturnType";
import {getBlock, getBlocksPrevious, getBlockTxs, getLatestBlock, getPoolMetadata, getTransactions} from "../config/cache";
import {Transaction} from "@shared/dtos/transaction.dto";
import {computeTxTags, computeTotalLovelaceOutput} from "@shared/helpers/txTags";


export const blockController = Router();

// Blockfrost caps count at 100 per call. To satisfy larger requests we
// paginate through multiple blocksPrevious calls, always anchored at the
// latest block hash so the page numbers are stable.
const BF_MAX_PER_PAGE = 100;
const BF_FETCH_CAP    = 500; // hard ceiling to keep response times reasonable

blockController.get('', async (req, res) => {
  const pageInfo = req.query;
  const skipMeta = String(pageInfo.skipMeta) === "true";

  const requestedPage = Math.max(1, Number.parseInt(String(pageInfo.page || 1)));
  const requestedSize = Math.min(
    Number.parseInt(String(pageInfo.size || BF_MAX_PER_PAGE)),
    BF_FETCH_CAP
  );

  const latestBlock = await getLatestBlock();

  // Translate the requested (page, size) into 1-indexed positions counting
  // backwards from the latest block: position 1 = block immediately preceding
  // latest, position N = the N-th preceding block. The page we want spans
  // [startPos .. endPos].
  const startPos = (requestedPage - 1) * requestedSize + 1;
  const endPos   = startPos + requestedSize - 1;

  // Determine which Blockfrost pages cover this range. blocksPrevious is
  // 1-indexed and returns at most BF_MAX_PER_PAGE blocks per page in
  // ASCENDING order (oldest first, newest last) — within a single BF page,
  // index 0 = the oldest of that page, last index = the newest.
  const bfFirstPage = Math.ceil(startPos / BF_MAX_PER_PAGE);
  const bfLastPage  = Math.ceil(endPos   / BF_MAX_PER_PAGE);

  // Fetch BF pages from highest (oldest) to lowest (newest) — in parallel,
  // through the anchor-keyed cache — and concatenate; the resulting array is
  // in globally ascending order across the whole [bfFirstPage, bfLastPage]
  // window, which makes the slice math simple.
  const bfPageNumbers: number[] = [];
  for (let bfPage = bfLastPage; bfPage >= bfFirstPage; bfPage--) bfPageNumbers.push(bfPage);
  const bfPages = await Promise.all(
    bfPageNumbers.map((bfPage) => getBlocksPrevious(latestBlock.hash, bfPage, BF_MAX_PER_PAGE))
  );
  const allBfBlocks: any[] = bfPages.flat();

  // After concat, position N (1-indexed from latest) of the highest BF page we
  // fetched corresponds to a known index in allBfBlocks. The newest block in
  // the buffer (position bfFirstPage's last newer block) is at the END of the
  // array; the oldest is at index 0.
  //
  // Compute slice indices to keep only positions [startPos .. endPos]:
  //   newestPosInBuffer = (bfFirstPage - 1) * BF_MAX_PER_PAGE + 1
  //   index of position P = (allBfBlocks.length - 1) - (P - newestPosInBuffer)
  const newestPosInBuffer = (bfFirstPage - 1) * BF_MAX_PER_PAGE + 1;
  const indexOfEnd   = (allBfBlocks.length - 1) - (endPos - newestPosInBuffer);
  const indexOfStart = (allBfBlocks.length - 1) - (startPos - newestPosInBuffer);
  const sliceStart = Math.max(0, indexOfEnd);
  const sliceEnd   = Math.max(0, indexOfStart + 1);
  const pageBlocks = allBfBlocks.slice(sliceStart, sliceEnd);
  allBfBlocks.length = 0;
  allBfBlocks.push(...pageBlocks);

  // Batch-fetch pool metadata for unique slot leaders through the 1h cache
  // (skipped for bulk/chart requests; resolves to nulls when only demeter is
  // configured — `/pools/*` is a blockfrost.io-only endpoint).
  const poolMeta = new Map<string, { name: string; ticker: string }>();
  if (!skipMeta) {
    const uniqueLeaders = [...new Set(allBfBlocks.map(b => b.slot_leader).filter(Boolean))] as string[];
    await Promise.all(
      uniqueLeaders
        .filter(l => l.startsWith("pool"))
        .map(async (leader) => {
          const meta = await getPoolMetadata(leader);
          if (meta) poolMeta.set(leader, { name: meta.name ?? "", ticker: meta.ticker ?? "" });
        })
    );
  }

  const blocksData: Block[] = allBfBlocks.map((block) => {
    const meta = block.slot_leader ? poolMeta.get(block.slot_leader) : undefined;
    return {
      blockNo: block.height ?? 0,
      epochNo: block.epoch ?? 0,
      epochSlotNo: block.epoch_slot ?? 0,
      slotNo: block.slot ?? 0,
      hash: block.hash,
      height: block.height,
      slot: block.slot,
      txCount: block.tx_count,
      output: Number.parseInt(block.output ?? '0'),
      totalFees: Number.parseInt(block.fees ?? '0'),
      totalOutput: Number.parseInt(block.output ?? '0'),
      time: block.time.toString(),
      previousBlock: block.previous_block ?? undefined,
      nextBlock: block.next_block ?? undefined,
      size: block.size,
      slotLeader: block.slot_leader ?? undefined,
      poolName: meta?.name ?? "",
      poolTicker: meta?.ticker ?? "",
      confirmations: (block as any).confirmations,
      blockVrf: block.block_vrf ?? undefined,
    };
  });

  res.json({
    data: blocksData.reverse(), // newest first
    lastUpdated: Date.now(),
    total: latestBlock.height,
    currentPage: requestedPage - 1,
    pageSize: requestedSize,
  } as ApiReturnType<Block[]>);
});

blockController.get('/:blockId', async (req, res) => {
  const block = await getBlock(req.params.blockId);

  // Fetch pool metadata if the slot leader is a pool (1h cache; resolves to
  // null when only demeter is configured — /pools/* is blockfrost.io-only).
  let poolName = "";
  let poolTicker = "";
  if (block.slot_leader?.startsWith("pool")) {
    const meta = await getPoolMetadata(block.slot_leader);
    poolName = meta?.name ?? "";
    poolTicker = meta?.ticker ?? "";
  }

  res.json({
    total: 1,
    data: {
      blockNo: block.height ?? 0,
      epochNo: block.epoch ?? 0,
      epochSlotNo: block.epoch_slot ?? 0,
      slotNo: block.slot ?? 0,
      hash: block.hash,
      height: block.height,
      slot: block.slot,
      txCount: block.tx_count,
      output: Number.parseInt(block.output ?? '0'),
      totalFees: Number.parseInt(block.fees ?? '0'),
      totalOutput: Number.parseInt(block.output ?? '0'),
      time: block.time.toString(),
      previousBlock: block.previous_block,
      nextBlock: block.next_block,
      poolTicker,
      poolName,
      slotLeader: block.slot_leader,
      size: block.size,
      confirmations: (block as any).confirmations,
      blockVrf: block.block_vrf ?? undefined,
    },
    lastUpdated: Date.now(),
  } as ApiReturnType<Block>)
})

blockController.get('/:blockId/transactions', async (req, res) => {
  const block = await getBlock(req.params.blockId);
  // A block >10 confirmations deep is final — its tx list caches for 24h.
  const txHashes = await getBlockTxs(block.hash, (block.confirmations ?? 0) > 10);

  // Server-side pagination: only the requested page of tx details is fetched
  // (in parallel, through the cache). The full hash list gives a real total.
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? 1)));
  const size = Math.min(100, Number.parseInt(String(req.query.size ?? 20)));
  const pageHashes = txHashes.slice((page - 1) * size, page * size);

  const txs: Transaction[] = await Promise.all(pageHashes.map(async (txHash) => {
    const tx = await getTransactions(txHash);
    return {
      blockNo: tx.block_height ?? 0,
      hash: txHash,
      time: tx.block_time.toString(),
      slot: tx.slot ?? 0,
      epochNo: block.epoch ?? 0,
      epochSlotNo: block.epoch_slot ?? 0,
      fee: Number.parseInt(tx.fees ?? '0'),
      totalOutput: computeTotalLovelaceOutput(tx.output_amount),
      blockHash: block.hash,
      tags: computeTxTags(tx),
    } as Transaction;
  }));

  res.json({
    total: txHashes.length,
    data: txs,
    lastUpdated: Date.now(),
    currentPage: page - 1,
    pageSize: size,
    totalPages: Math.ceil(txHashes.length / size),
  } as ApiReturnType<Transaction[]>);
})
