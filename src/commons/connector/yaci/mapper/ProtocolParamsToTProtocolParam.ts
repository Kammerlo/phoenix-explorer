import { ProtocolParams, ProtocolParamsDto } from "../types";
import { TProtocolParam } from "../../../../types/protocol";

export function protocolParamsToTProtocolParam(protocolParams: ProtocolParamsDto): TProtocolParam {
  return {
    minFeeA: protocolParams.minFeeA || 0,
    minFeeB: protocolParams.minFeeB || 0,
    maxBlockSize: protocolParams.maxBlockSize || 0,
    maxTxSize: protocolParams.maxTxSize || 0,
    maxBHSize: protocolParams.maxBlockHeaderSize || 0,
    keyDeposit: protocolParams.keyDeposit || 0,
    poolDeposit: protocolParams.poolDeposit || 0,
    maxEpoch: protocolParams.eMax || 0,
    entropy: protocolParams.extraEntropy || 0,
    protocolMajor: protocolParams.protocolMajorVer || 0,
    protocolMinor: protocolParams.protocolMinorVer || 0,
    minUtxoValue: protocolParams.minUtxo || 0,
    minPoolCost: protocolParams.minPoolCost || 0,
    priceMem: protocolParams.priceMem || 0,
    priceStep: protocolParams.priceStep || 0,
    maxTxExMem: protocolParams.maxTxExMem || 0,
    maxTxExSteps: protocolParams.maxTxExSteps || 0,
    maxBlockExMem: protocolParams.maxBlockExMem || 0,
    maxBlockExSteps: protocolParams.maxBlockExSteps || 0,
    maxValSize: protocolParams.maxValSize || 0,
    collateralPercent: protocolParams.collateralPercent || 0,
    maxCollateralInputs: protocolParams.maxCollateralInputs || 0,
    coinsPerUTxOByte: protocolParams.coinsPerUtxoSize || 0,
    maxTxExUnits: protocolParams.maxTxExSteps || 0,
    maxBBSize: protocolParams.maxBlockSize! - protocolParams.maxBlockHeaderSize! || 0,
    maxBlockExUnits: protocolParams.maxBlockExSteps || 0, // TODO need to check this
    rho: protocolParams.rho || 0, // TODO need to check this
    tau: protocolParams.tau || 0, // TODO need to check this
    a0: protocolParams.a0 || 0, // TODO need to check this
    eMax: protocolParams.eMax || 0, // TODO need to check this
    nOpt: protocolParams.nOpt || 0,
    costModels: JSON.stringify(protocolParams.costModels) || "", // TODO need to check this
    collateralPercentage: protocolParams.collateralPercent || 0,
    govActionLifetime: protocolParams.govActionLifetime || 0,
    govActionDeposit: protocolParams.govActionDeposit || 0,
    drepDeposit: protocolParams.drepDeposit || 0,
    drepActivity: protocolParams.drepActivity || 0,
    ccMinSize: protocolParams.committeeMinSize || 0,
    ccMaxTermLength: protocolParams.committeeMaxTermLength || 0
  };
}
