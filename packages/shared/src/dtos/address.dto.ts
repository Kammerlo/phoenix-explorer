import { ITokenMetadata } from "./token.dto";


export interface Token {
    address: string;
    name: string;
    displayName: string;
    fingerprint: string;
    quantity: number;
    metadata?: ITokenMetadata;
}
export interface AddressDetail {
    address: string;
    txCount: number;
    balance: number;
    tokens: Token[];
    stakeAddress: string;
    isContract: boolean;
    verifiedContract?: boolean;
    associatedNativeScript?: boolean;
    associatedSmartContract?: boolean;
    scriptHash?: string;
}

export interface StakeAddressDetail {
    status: "ACTIVE" | "INACTIVE";
    stakeAddress: string;
    totalStake: number;
    rewardAvailable: number;
    rewardWithdrawn: number;
    pool: {
        tickerName: string;
        poolName: string;
        poolId: string;
    };
}