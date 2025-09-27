
export interface PoolOverview {
    id: number;
    poolId: string;
    poolName: string;
    tickerName: string;
    poolSize: number;
    declaredPledge: number;
    saturation: number;
    lifetimeBlock: number;
}
export enum POOL_STATUS {
    ACTIVE = "ACTIVE",
    RETIRED = "RETIRED",
    RETIRING = "RETIRING"
}

export interface PoolDetail {
    poolName: string;
    tickerName: string;
    poolView: string;
    poolStatus: POOL_STATUS;
    createDate: string;
    rewardAccounts: string[];
    ownerAccounts: string[];
    poolSize: number;
    stakeLimit: number;
    delegators: number;
    saturation: number;
    totalBalanceOfPoolOwners: number;
    reward: number;
    ros: number;
    pledge: number;
    cost: number;
    margin: number;
    epochBlock: number;
    lifetimeBlock: number;
    description?: string;
    hashView?: string;
    homepage?: string;
    iconUrl?: string;
    logoUrl?: string;
}