import {Router} from 'express';
import {API} from "../config/blockfrost";
import {EpochStatus, IDataEpoch} from "@shared/dtos/epoch.dto";
import {Block} from "@shared/dtos/block.dto";
import {ApiReturnType} from "@shared/APIReturnType";
import {cache, getBlock, getEpoch} from "../config/cache";
import { components } from '@blockfrost/openapi';

export const epochController = Router();

epochController.get('', async (req, res) => {
  const pageInfo = req.query;
  const unixTimestamp = Math.floor(Date.now() / 1000);
  const latestEpoch = await API.epochsLatest();
  const epochs = await API.epochsPrevious(latestEpoch.epoch,
    {page: Number.parseInt(String(pageInfo.page || 0)), count: Number.parseInt(String(pageInfo.size || 100))});

  epochs.push(latestEpoch); // Add the latest epoch to the list
  const epochsData = epochs.map((epoch => {
    const dataEpoch: IDataEpoch = {
      no: epoch.epoch,
      syncingProgress: getProgressPercentage(epoch.start_time, epoch.end_time, unixTimestamp),
      status: getEpochstatus(epoch.epoch, latestEpoch.epoch),
      rewardsDistributed: 0,
      epochSlotNo: 0,
      account: 0,
      maxSlot: 0,
      blkCount: epoch.block_count,
      endTime: epoch.end_time.toString(),
      startTime: epoch.start_time.toString(),
      outSum: Number.parseInt(epoch.output),
      txCount: epoch.tx_count,
    };
    return dataEpoch;
  }));
  res.json({
    data: epochsData.reverse(), // Reverse to show the latest epoch first
    lastUpdated: Math.floor(Date.now() / 1000),
    total: epochsData.length,
    currentPage: Number.parseInt(String(pageInfo.page ?? 0)),
    pageSize: Number.parseInt(String(pageInfo.size ?? 100)),
    totalPages: Math.ceil(epochsData.length / (pageInfo.size ? Number.parseInt(String(pageInfo.size)) : 100)),
  } as ApiReturnType<IDataEpoch[]>);
});

epochController.get('/:epochNo', async (req, res) => {
  const {epochNo} = req.params;
  const latestEpoch = await API.epochsLatest();

  let requestedEpoch = await getEpoch(epochNo);

  const unixTimestamp = Math.floor(Date.now() / 1000);

  const epoch: IDataEpoch = {
    no: requestedEpoch.epoch,
    syncingProgress: getProgressPercentage(requestedEpoch.start_time, requestedEpoch.end_time, unixTimestamp),
    status: getEpochstatus(requestedEpoch.epoch, latestEpoch.epoch),
    rewardsDistributed: 0,
    epochSlotNo: 0,
    account: 0,
    maxSlot: 0,
    blkCount: requestedEpoch.block_count,
    endTime: requestedEpoch.end_time.toString(),
    startTime: requestedEpoch.start_time.toString(),
    outSum: Number.parseInt(requestedEpoch.output),
    txCount: requestedEpoch.tx_count,
  };
  res.json({
    data: epoch,
    lastUpdated: Math.floor(Date.now() / 1000),
  } as ApiReturnType<IDataEpoch>);
});

epochController.get('/:epochNo/blocks', async (req, res) => {
  const {epochNo} = req.params;
  const pageInfo = req.query;
  let epoch = await getEpoch(epochNo);
  const epochBlocks = await API.epochsBlocks(Number.parseInt(epochNo), {
    page: Number.parseInt(String(pageInfo.page ?? 0)),
    count: Number.parseInt(String(pageInfo.size ?? 100)),
  });
  const blocks: Block[] = [];
  for (const blockHash of epochBlocks) {
    const block = await getBlock(blockHash);
    blocks.push({
      blockNo: block.height ?? 0,
      epochNo: block.epoch ?? 0,
      epochSlotNo: block.epoch_slot ?? 0,
      slotNo: block.slot ?? 0,
      hash: block.hash,
      slotLeader: block.slot_leader,
      time: block.time.toString(),
      totalFees: Number.parseInt(block.fees ?? '0'),
      txCount: block.tx_count ?? 0,
    } as Block);
  }
  res.json({
    total: epoch.block_count,
    data: blocks,
    lastUpdated: Math.floor(Date.now() / 1000),
    currentPage: Number.parseInt(String(pageInfo.page ?? 0)),
    pageSize: Number.parseInt(String(pageInfo.size ?? 100)),
    totalPages: Math.ceil(epoch.block_count / (pageInfo.size ? Number.parseInt(String(pageInfo.size)) : 100)),
  } as ApiReturnType<Block[]>);
});

function getEpochstatus(epoch: number, latestEpoch: number): EpochStatus {
  if (epoch === latestEpoch) {
    return EpochStatus.IN_PROGRESS;
  } else if (epoch === latestEpoch - 1) {
    return EpochStatus.REWARDING;
  } else {
    return EpochStatus.FINISHED;
  }
}

function getProgressPercentage(start: number, end: number, current: number): number {
  if (current <= start) return 0;
  if (current >= end) return 100;

  const total = end - start;
  const progress = current - start;
  return (progress / total) * 100;
}
