import { EpochOverview } from "@shared/dtos/epoch.dto";
import {
  getEpochStatus,
  getEpochProgress,
  computeEpochSlotNo,
  MAINNET_EPOCH_MAX_SLOT
} from "@shared/helpers/epochHelpers";
import { EpochDetailDto } from "../types";

/**
 * Maps a yaci-store epoch-aggr `Epoch` domain object to the shared
 * `EpochOverview`. yaci-store does not return per-epoch active stake or
 * distributed rewards on this DTO, so `activeStake` is injected best-effort by
 * the caller (via /epochs/{n}/total-stake) and `rewardsDistributed` is left 0,
 * matching the BlockfrostConnector.
 */
export function epochDtoToEpochOverview(
  e: EpochDetailDto,
  latestEpochNo: number,
  activeStake?: number
): EpochOverview {
  const now = Math.floor(Date.now() / 1000);
  const no = Number(e.number ?? 0);
  const start = Number(e.startTime ?? 0);
  const end = Number(e.endTime ?? 0);
  return {
    no,
    status: getEpochStatus(no, latestEpochNo),
    blkCount: e.blockCount ?? 0,
    txCount: Number(e.transactionCount ?? 0),
    outSum: Number(e.totalOutput ?? 0),
    startTime: start ? String(start) : "",
    endTime: end ? String(end) : "",
    syncingProgress: getEpochProgress(start, end, now),
    epochSlotNo: computeEpochSlotNo(no, latestEpochNo, start, end, now),
    maxSlot: e.maxSlot && e.maxSlot > 0 ? e.maxSlot : MAINNET_EPOCH_MAX_SLOT,
    rewardsDistributed: 0,
    account: 0,
    fees: Number(e.totalFees ?? 0),
    activeStake: activeStake ?? 0
  };
}
