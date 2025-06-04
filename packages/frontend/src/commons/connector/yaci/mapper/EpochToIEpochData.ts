import { Epoch } from "../types";

export function epochToIEpochData(epoch: Epoch): IDataEpoch {
  const DAY_IN_SECONDS = 86400;
  const epochData: IDataEpoch = {
    no: epoch.number || 0,
    status: epoch.endTime! < Date.now() ? "FINISHED" : "IN_PROGRESS",
    blkCount: epoch.blockCount || 0,
    endTime: epoch.endTime ? epoch.endTime.toString() : "",
    startTime: epoch.startTime ? epoch.startTime.toString() : "",
    outSum: epoch.totalOutput || 0,
    txCount: epoch.transactionCount || 0,
    epochSlotNo: epoch.maxSlot || 0, // TODO: need to check it, since I used this value twice
    maxSlot: epoch.maxSlot || 0,
    rewardsDistributed: 0, // TODO: need to implement
    account: 0,
    // If syncing is still ongoing in the current epoch, then endTime is nearly Date.now() in seconds
    // We assume an epoch is 5 Days long, so we calculate the progress based on that
    syncingProgress:
      epoch.endTime && epoch.startTime ? ((epoch.endTime - epoch.startTime) / (DAY_IN_SECONDS * 5)) * 100 : 0
  };
  return epochData;
}
