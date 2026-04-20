import {Router} from "express";
import {API} from "../config/blockfrost";
import {Block} from "@shared/dtos/block.dto";
import {ApiReturnType} from "@shared/APIReturnType";
import {getBlock, getTransactions} from "../config/cache";
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

  const latestBlock = await API.blocksLatest();

  // Calculate how many blocks to skip for the requested page, then fetch
  const totalToSkip = (requestedPage - 1) * requestedSize;
  const totalToFetch = totalToSkip + requestedSize;

  const allBfBlocks: any[] = [];
  const pagesNeeded = Math.ceil(totalToFetch / BF_MAX_PER_PAGE);
  for (let bfPage = 1; bfPage <= pagesNeeded; bfPage++) {
    const count = Math.min(BF_MAX_PER_PAGE, totalToFetch - allBfBlocks.length);
    const page = await API.blocksPrevious(latestBlock.hash, { page: bfPage, count });
    allBfBlocks.push(...page);
    if (page.length < count) break; // reached the beginning of the chain
  }

  // Slice to the requested page
  allBfBlocks.splice(0, totalToSkip);

  // Batch-fetch pool metadata for unique slot leaders (skipped for bulk/chart requests)
  const poolMeta = new Map<string, { name: string; ticker: string }>();
  if (!skipMeta) {
    const uniqueLeaders = [...new Set(allBfBlocks.map(b => b.slot_leader).filter(Boolean))] as string[];
    await Promise.all(
      uniqueLeaders
        .filter(l => l.startsWith("pool"))
        .map(async (leader) => {
          try {
            const meta = await API.poolMetadata(leader);
            poolMeta.set(leader, { name: meta.name ?? "", ticker: meta.ticker ?? "" });
          } catch { /* no metadata */ }
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

  // Fetch pool metadata if the slot leader is a pool
  let poolName = "";
  let poolTicker = "";
  if (block.slot_leader?.startsWith("pool")) {
    try {
      const meta = await API.poolMetadata(block.slot_leader);
      poolName = meta.name ?? "";
      poolTicker = meta.ticker ?? "";
    } catch { /* no metadata */ }
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
  const blockTransactions = await API.blocksTxs(block.hash);
  const txs : Transaction[] = [];
  for(const txHash of blockTransactions) {
    const tx = await getTransactions(txHash);

    txs.push({
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
    } as Transaction);
  }
  res.json({
    total: txs.length,
    data: txs,
    lastUpdated: Date.now(),
    currentPage: Number.parseInt(String(req.query.page ?? 0)),
    pageSize: Number.parseInt(String(req.query.size ?? 10)),
    totalPages: Math.ceil(txs.length / (req.query.size ? Number.parseInt(String(req.query.size)) : 100)),
  } as ApiReturnType<Transaction[]>);
})
