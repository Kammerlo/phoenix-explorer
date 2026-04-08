import { EpochStatus } from "../dtos/epoch.dto";

export function getEpochStatus(epoch: number, latestEpoch: number): EpochStatus {
  if (epoch === latestEpoch) return EpochStatus.IN_PROGRESS;
  if (epoch === latestEpoch - 1) return EpochStatus.REWARDING;
  return EpochStatus.FINISHED;
}

export function getEpochProgress(startTime: number, endTime: number, currentTime: number): number {
  if (currentTime <= startTime) return 0;
  if (currentTime >= endTime) return 100;
  return ((currentTime - startTime) / (endTime - startTime)) * 100;
}

export function computeEpochSlotNo(epoch: number, latestEpoch: number, startTime: number, endTime: number, nowUnix: number): number {
  if (epoch === latestEpoch) {
    return Math.max(0, nowUnix - startTime);
  }
  return Math.max(0, endTime - startTime);
}

export const MAINNET_EPOCH_MAX_SLOT = 432000;
