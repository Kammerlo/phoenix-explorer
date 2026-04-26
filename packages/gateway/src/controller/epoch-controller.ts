import {Router} from 'express';
import {API} from "../config/blockfrost";
import {EpochOverview} from "@shared/dtos/epoch.dto";
import {Block} from "@shared/dtos/block.dto";
import {ApiReturnType} from "@shared/APIReturnType";
import {cache, getBlock, getEpoch} from "../config/cache";
import { getEpochStatus, getEpochProgress, computeEpochSlotNo, MAINNET_EPOCH_MAX_SLOT } from "@shared/helpers/epochHelpers";

export const epochController = Router();

epochController.get('', async (req, res) => {
  const pageInfo = req.query;
  const unixTimestamp = Math.floor(Date.now() / 1000);
  const latestEpoch = await API.epochsLatest();
  // Frontend pagination is 1-based (page 1 = first page). Accept legacy 0
  // as "first page" so existing callers don't break.
  const rawPage = Number.parseInt(String(pageInfo.page || 1));
  const requestedPage = Math.max(1, rawPage);
  const requestedSize = Number.parseInt(String(pageInfo.size || 100));
  const epochs = await API.epochsPrevious(latestEpoch.epoch,
    {page: requestedPage, count: requestedSize});
  if (requestedPage === 1) {
    // epochsPrevious doesn't include the latest epoch; surface it on page 1.
    epochs.push(latestEpoch);
  }
  const epochsData = epochs.map((epoch => {
    // Calculate slot for the current epoch
    let epochSlotNo = 0;
    if (epoch.epoch === latestEpoch.epoch) {
      epochSlotNo = Math.max(0, unixTimestamp - epoch.start_time);
    } else {
      epochSlotNo = Math.max(0, epoch.end_time - epoch.start_time);
    }
    const dataEpoch: EpochOverview = {
      no: epoch.epoch,
      syncingProgress: getEpochProgress(epoch.start_time, epoch.end_time, unixTimestamp),
      status: getEpochStatus(epoch.epoch, latestEpoch.epoch),
      rewardsDistributed: 0,
      epochSlotNo,
      account: 0,
      maxSlot: MAINNET_EPOCH_MAX_SLOT,
      blkCount: epoch.block_count,
      endTime: epoch.end_time.toString(),
      startTime: epoch.start_time.toString(),
      outSum: Number.parseInt(epoch.output),
      txCount: epoch.tx_count,
      fees: Number.parseInt((epoch as any).fees ?? '0'),
      activeStake: Number.parseInt((epoch as any).active_stake ?? '0'),
    };
    return dataEpoch;
  }));
  // Total epoch count = latest epoch number + 1 (epochs are zero-indexed on Cardano).
  const totalEpochs = (latestEpoch.epoch ?? 0) + 1;
  res.json({
    data: epochsData.reverse(), // Reverse to show the latest epoch first
    lastUpdated: Date.now(),
    total: totalEpochs,
    currentPage: requestedPage - 1, // FooterTable expects 0-based
    pageSize: requestedSize,
    totalPages: Math.ceil(totalEpochs / requestedSize),
  } as ApiReturnType<EpochOverview[]>);
});

epochController.get('/:epochNo', async (req, res) => {
  const {epochNo} = req.params;
  const latestEpoch = await API.epochsLatest();

  let requestedEpoch = await getEpoch(epochNo);

  const unixTimestamp = Math.floor(Date.now() / 1000);

  // Calculate current epoch slot for the active epoch
  let epochSlotNo = 0;
  if (requestedEpoch.epoch === latestEpoch.epoch) {
    // For the current epoch, compute slot from elapsed time (1 slot = 1 second on mainnet)
    epochSlotNo = Math.max(0, unixTimestamp - requestedEpoch.start_time);
  } else {
    // For finished epochs, the slot is the total slots in the epoch
    epochSlotNo = Math.max(0, requestedEpoch.end_time - requestedEpoch.start_time);
  }

  const epoch: EpochOverview = {
    no: requestedEpoch.epoch,
    syncingProgress: getEpochProgress(requestedEpoch.start_time, requestedEpoch.end_time, unixTimestamp),
    status: getEpochStatus(requestedEpoch.epoch, latestEpoch.epoch),
    rewardsDistributed: 0,
    epochSlotNo,
    account: 0,
    maxSlot: MAINNET_EPOCH_MAX_SLOT,
    blkCount: requestedEpoch.block_count,
    endTime: requestedEpoch.end_time.toString(),
    startTime: requestedEpoch.start_time.toString(),
    outSum: Number.parseInt(requestedEpoch.output),
    txCount: requestedEpoch.tx_count,
    fees: Number.parseInt((requestedEpoch as any).fees ?? '0'),
    activeStake: Number.parseInt((requestedEpoch as any).active_stake ?? '0'),
  };
  res.json({
    data: epoch,
    lastUpdated: Date.now(),
  } as ApiReturnType<EpochOverview>);
});

epochController.get('/:epochNo/blocks', async (req, res) => {
  const {epochNo} = req.params;
  const pageInfo = req.query;
  let epoch = await getEpoch(epochNo);
  // Frontend pagination is 1-based; accept legacy 0 as "first page".
  const epochBlocksPage = Math.max(1, Number.parseInt(String(pageInfo.page ?? 1)));
  const epochBlocksSize = Number.parseInt(String(pageInfo.size ?? 100));
  const epochBlocks = await API.epochsBlocks(Number.parseInt(epochNo), {
    page: epochBlocksPage,
    count: epochBlocksSize,
  });

  // Fetch full block data for each hash
  const rawBlocks = await Promise.all(epochBlocks.map(hash => getBlock(hash)));

  // Batch-fetch pool metadata for unique slot leaders
  const uniqueLeaders = [...new Set(rawBlocks.map(b => b.slot_leader).filter(Boolean))] as string[];
  const poolMeta = new Map<string, { name: string; ticker: string }>();
  await Promise.all(
    uniqueLeaders
      .filter(l => l.startsWith('pool'))
      .map(async (leader) => {
        try {
          const meta = await API.poolMetadata(leader);
          poolMeta.set(leader, { name: meta.name ?? '', ticker: meta.ticker ?? '' });
        } catch { /* no metadata */ }
      })
  );

  const blocks: Block[] = rawBlocks.map((block) => {
    const meta = block.slot_leader ? poolMeta.get(block.slot_leader) : undefined;
    return {
      blockNo: block.height ?? 0,
      epochNo: block.epoch ?? 0,
      epochSlotNo: block.epoch_slot ?? 0,
      slotNo: block.slot ?? 0,
      hash: block.hash,
      slotLeader: block.slot_leader ?? undefined,
      poolName: meta?.name ?? '',
      poolTicker: meta?.ticker ?? '',
      time: block.time.toString(),
      totalFees: Number.parseInt(block.fees ?? '0'),
      totalOutput: Number.parseInt(block.output ?? '0'),
      txCount: block.tx_count ?? 0,
      size: block.size,
    } as Block;
  });

  res.json({
    total: epoch.block_count,
    data: blocks,
    lastUpdated: Date.now(),
    currentPage: epochBlocksPage - 1, // FooterTable expects 0-based
    pageSize: epochBlocksSize,
    totalPages: Math.ceil(epoch.block_count / epochBlocksSize),
  } as ApiReturnType<Block[]>);
});

