import {Router} from "express";
import {API} from "../config/blockfrost";
import {Block} from "@shared/dtos/block.dto";
import {ApiReturnType} from "@shared/APIReturnType";
import {getBlock, getTransactions} from "../config/cache";
import {Transaction, TxTag} from "@shared/dtos/transaction.dto";


export const blockController = Router();

// Blockfrost caps count at 100 per call. To satisfy larger requests we
// paginate through multiple blocksPrevious calls, always anchored at the
// latest block hash so the page numbers are stable.
const BF_MAX_PER_PAGE = 100;
const BF_FETCH_CAP    = 500; // hard ceiling to keep response times reasonable

blockController.get('', async (req, res) => {
  const pageInfo = req.query;
  const unixTimestamp = Math.floor(Date.now() / 1000);
  const skipMeta = String(pageInfo.skipMeta) === "true";

  const requestedSize = Math.min(
    Number.parseInt(String(pageInfo.size || BF_MAX_PER_PAGE)),
    BF_FETCH_CAP
  );

  const latestBlock = await API.blocksLatest();

  // Paginate Blockfrost to satisfy requestedSize
  const allBfBlocks: any[] = [];
  const pagesNeeded = Math.ceil(requestedSize / BF_MAX_PER_PAGE);
  for (let bfPage = 1; bfPage <= pagesNeeded; bfPage++) {
    const count = Math.min(BF_MAX_PER_PAGE, requestedSize - allBfBlocks.length);
    const page = await API.blocksPrevious(latestBlock.hash, { page: bfPage, count });
    allBfBlocks.push(...page);
    if (page.length < count) break; // reached the beginning of the chain
  }

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
    lastUpdated: unixTimestamp,
    total: latestBlock.height,
    currentPage: Number.parseInt(String(pageInfo.page ?? 0)),
    pageSize: requestedSize,
    totalPages: Math.ceil(blocksData.length / requestedSize),
  } as ApiReturnType<Block[]>);
});

blockController.get('/:blockId', async (req, res) => {
  const block = await getBlock(req.params.blockId);
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
      // poolTicker: block.slot_leader,
      // poolName: block.slot_leader,
      slotLeader: block.slot_leader,
      // poolView: block.slot_leader,
      size: block.size,
      confirmations: (block as any).confirmations,
      blockVrf: block.block_vrf ?? undefined,
    },
    lastUpdated: Math.floor(Date.now() / 1000),
  } as ApiReturnType<Block>)
})

blockController.get('/:blockId/transactions', async (req, res) => {
  const block = await getBlock(req.params.blockId);
  const blockTransactions = await API.blocksTxs(block.hash);
  const txs : Transaction[] = [];
  for(const txHash of blockTransactions) {
    const tx = await getTransactions(txHash);

    const tags: TxTag[] = [];
    const hasNativeTokens = tx.output_amount.some((a: any) => a.unit !== 'lovelace');
    if (hasNativeTokens || (tx.asset_mint_or_burn_count ?? 0) > 0) tags.push('token');
    if ((tx.asset_mint_or_burn_count ?? 0) > 0) tags.push('mint');
    if ((tx.delegation_count ?? 0) > 0 || (tx.stake_cert_count ?? 0) > 0 || (tx.withdrawal_count ?? 0) > 0 || (tx.mir_cert_count ?? 0) > 0) tags.push('stake');
    if ((tx.pool_update_count ?? 0) > 0 || (tx.pool_retire_count ?? 0) > 0) tags.push('pool');
    if ((tx.redeemer_count ?? 0) > 0) tags.push('script');
    if (tags.length === 0) tags.push('transfer');

    txs.push({
      blockNo: tx.block_height ?? 0,
      hash: txHash,
      time: tx.block_time.toString(),
      slot: tx.slot ?? 0,
      epochNo: block.epoch ?? 0,
      epochSlotNo: block.epoch_slot ?? 0,
      fee: Number.parseInt(tx.fees ?? '0'),
      totalOutput: tx.output_amount.filter((amount) => amount.unit === 'lovelace').reduce((acc, amount) => acc + Number.parseInt(amount.quantity), 0),
      blockHash: block.hash,
      tags,
    } as Transaction);
  }
  res.json({
    total: txs.length,
    data: txs,
    lastUpdated: Math.floor(Date.now() / 1000),
    currentPage: Number.parseInt(String(req.query.page ?? 0)),
    pageSize: Number.parseInt(String(req.query.size ?? 10)),
    totalPages: Math.ceil(txs.length / (req.query.size ? Number.parseInt(String(req.query.size)) : 100)),
  } as ApiReturnType<Transaction[]>);
})
