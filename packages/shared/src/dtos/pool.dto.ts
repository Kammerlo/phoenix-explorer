
export interface PoolOverview {
    id: number;
    poolId: string;
    poolName: string;
    tickerName: string;
    poolSize: number;
    pledge: number;
    saturation: number;
    stakeLimit: number;
    reserves: number;
    lifetimeBlock: number;
    votingPower: number;
    governanceParticipationRate: number;
    retired: boolean;
    kparam: number;
}