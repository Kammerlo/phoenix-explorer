export type ProtocolParameters = {
    epoch: number;
    minFeeA: number;
    minFeeB: number;
    maxBlockSize: number;
    maxTxSize: number;
    maxBhSize: number;
    keyDeposit: string;
    poolDeposit: string;
    eMax: number;
    nOpt: number;
    a0: number;
    rho: number;
    tau: number;
    decentralisationParam: number;
    extraEntropy: string | null;
    protocolMajorVer: number;
    protocolMinorVer: number;
    minUtxo: string;
    minPoolCost: string;
    nonce: string;
    costModels?: {
        plutusV1: Record<string, number>;
        plutusV2: Record<string, number>;
        plutusV3: Record<string, number>;
    }
    prices?: {
        memory: number;
        steps: number;
    }
    maxTxExMem?: string;
    maxTxExSteps?: string;
    maxBlockExMem?: string;
    maxBlockExSteps?: string;
    maxValSize?: string;
    collateralPercent?: number;
    maxCollateralInputs?: number;
    coinsPerUtxoByte?: string;
    coinsPerUtxoWord?: string;
}