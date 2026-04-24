export interface DashboardStats {
  currentEpoch: {
    no: number;
    startTime: number | null;
    endTime: number | null;
    txCount: number;
    blkCount: number;
    outSum: string | null;
    fees: string | null;
    activeStake: string | null;
    progressPercent: number;
  };
  latestBlock: {
    height: number | null;
    hash: string;
    slot: number | null;
    epochNo: number | null;
    epochSlot: number | null;
    time: number;
    txCount: number;
    size: number;
  };
  supply: {
    circulating: string;
    total: string;
    max: string;
    locked: string;
  };
  stake: {
    live: string;
    active: string;
  };
}
