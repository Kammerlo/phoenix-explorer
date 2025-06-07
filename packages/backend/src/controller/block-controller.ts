import {Router} from "express";
import {API} from "../config/blockfrost";
import {Block} from "@shared/dtos/block.dto";
import {ApiReturnType} from "@shared/APIReturnType";
import {getBlock, getTransactions} from "../config/cache";
import {Transaction} from "@shared/dtos/transaction.dto";


export const blockController = Router();

blockController.get('', async (req, res) => {
  const pageInfo = req.query;
  const unixTimestamp = Math.floor(Date.now() / 1000);

  const latestBlock = await API.blocksLatest();
  const blocks = await API.blocksPrevious(latestBlock.hash, {
    page: Number.parseInt(String(pageInfo.page || 0)),
    count: Number.parseInt(String(pageInfo.size || 100))
  });
  // blocks.push(latestBlock); // Add the latest block to the list
  const blocksData: Block[] = blocks.map((block) => {
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
      previousBlock: block.previous_block,
      nextBlock: block.next_block
    };
  });
  res.json({
    data: blocksData.reverse(), // Reverse to show the latest block first
    lastUpdated: unixTimestamp,
    total: blocksData.length, // TODO need to find the total number of blocks
    currentPage: Number.parseInt(String(pageInfo.page ?? 0)),
    pageSize: Number.parseInt(String(pageInfo.size ?? 10)),
    totalPages: Math.ceil(blocksData.length / (pageInfo.size ? Number.parseInt(String(pageInfo.size)) : 100)),
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
    txs.push({
      blockNo: tx.block_height ?? 0,
      hash: txHash,
      time: tx.block_time.toString(),
      slot: tx.slot ?? 0,
      epochNo: block.epoch ?? 0,
      epochSlotNo: block.epoch_slot ?? 0,
      fee: Number.parseInt(tx.fees ?? '0'),
      totalOutput: tx.output_amount.filter((amount) => amount.unit === 'lovelace').reduce((acc, amount) => acc + Number.parseInt(amount.quantity), 0),
      blockHash: block.hash
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
