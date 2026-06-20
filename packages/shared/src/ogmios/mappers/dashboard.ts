import { DashboardStats } from "../../dtos/dashboard.dto";
import { OgmiosTip, OgmiosEraSummary, OgmiosTreasuryAndReserves } from "../types";
import { slotToUnixTime, epochBounds, epochProgressPercent } from "../helpers/era";

export const MAX_LOVELACE_SUPPLY = 45_000_000_000_000_000;

export function mapDashboardStats(input: {
  blockHeight: number;
  tip: OgmiosTip;
  epoch: number;
  eras: OgmiosEraSummary[];
  treasuryAndReserves: OgmiosTreasuryAndReserves;
  liveStake: number;
}): DashboardStats {
  const reserves = input.treasuryAndReserves.reserves.ada.lovelace;
  const treasury = input.treasuryAndReserves.treasury.ada.lovelace;
  const total = MAX_LOVELACE_SUPPLY - reserves;
  const circulating = total - treasury;
  const bounds = epochBounds(input.epoch, input.eras);

  return {
    currentEpoch: {
      no: input.epoch,
      startTime: bounds.startTime,
      endTime: bounds.endTime,
      txCount: 0,
      blkCount: 0,
      outSum: null,
      fees: null,
      activeStake: String(input.liveStake),
      progressPercent: epochProgressPercent(input.tip.slot, bounds)
    },
    latestBlock: {
      height: input.blockHeight,
      hash: input.tip.id,
      slot: input.tip.slot,
      epochNo: input.epoch,
      epochSlot: input.tip.slot - bounds.firstSlot,
      time: slotToUnixTime(input.tip.slot, input.eras),
      txCount: 0,
      size: 0
    },
    supply: {
      circulating: String(circulating),
      total: String(total),
      max: String(MAX_LOVELACE_SUPPLY),
      locked: "0"
    },
    stake: {
      live: String(input.liveStake),
      active: String(input.liveStake)
    }
  };
}
