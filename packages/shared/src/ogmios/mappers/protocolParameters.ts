import { OgmiosProtocolParameters, ProtocolParams } from "../types";
import { parseRatio } from "../helpers/parseRatio";

export function mapProtocolParameters(raw: OgmiosProtocolParameters): ProtocolParams {
  const prices = raw.scriptExecutionPrices;
  return {
    minFeeA: raw.minFeeCoefficient,
    minFeeB: raw.minFeeConstant.ada.lovelace,
    maxBlockSize: raw.maxBlockBodySize.bytes,
    maxTxSize: raw.maxTransactionSize.bytes,
    maxBHSize: raw.maxBlockHeaderSize.bytes,
    keyDeposit: raw.stakeCredentialDeposit.ada.lovelace,
    poolDeposit: raw.stakePoolDeposit.ada.lovelace,
    maxEpoch: raw.stakePoolRetirementEpochBound,
    entropy: 0,
    protocolMajor: raw.version.major,
    protocolMinor: raw.version.minor,
    minUtxoValue: raw.minUtxoDepositConstant.ada.lovelace,
    minPoolCost: raw.minStakePoolCost.ada.lovelace,
    priceMem: prices ? parseRatio(prices.memory) : 0,
    priceStep: prices ? parseRatio(prices.cpu) : 0,
    maxTxExMem: raw.maxExecutionUnitsPerTransaction?.memory ?? 0,
    maxTxExSteps: raw.maxExecutionUnitsPerTransaction?.cpu ?? 0,
    maxBlockExMem: raw.maxExecutionUnitsPerBlock?.memory ?? 0,
    maxBlockExSteps: raw.maxExecutionUnitsPerBlock?.cpu ?? 0,
    maxValSize: raw.maxValueSize?.bytes ?? 0,
    collateralPercent: raw.collateralPercentage ?? 0,
    maxCollateralInputs: raw.maxCollateralInputs ?? 0,
    coinsPerUTxOByte: raw.minUtxoDepositCoefficient,
    maxTxExUnits: 0,
    maxBBSize: raw.maxBlockBodySize.bytes,
    maxBlockExUnits: 0,
    rho: parseRatio(raw.monetaryExpansion),
    tau: parseRatio(raw.treasuryExpansion),
    a0: parseRatio(raw.stakePoolPledgeInfluence),
    eMax: raw.stakePoolRetirementEpochBound,
    nOpt: raw.desiredNumberOfStakePools,
    costModels: JSON.stringify(raw.plutusCostModels ?? {}),
    collateralPercentage: raw.collateralPercentage ?? 0,
    govActionLifetime: raw.governanceActionLifetime ?? 0,
    govActionDeposit: raw.governanceActionDeposit?.ada.lovelace ?? 0,
    drepDeposit: raw.delegateRepresentativeDeposit?.ada.lovelace ?? 0,
    drepActivity: raw.delegateRepresentativeMaxIdleTime ?? 0,
    ccMinSize: raw.constitutionalCommitteeMinSize ?? 0,
    ccMaxTermLength: raw.constitutionalCommitteeMaxTermLength ?? 0
  };
}
