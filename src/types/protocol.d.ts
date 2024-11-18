import { PROTOCOL_TYPE } from "../commons/utils/constants";

type TProtocolItem = {
  time: string;
  transactionHashs: string[];
  value: string | number;
  status: "UPDATED" | "ADDED" | "NOT_EXIST" | "NOT_CHANGE";
};
export type ProtocolTypeKey = keyof typeof PROTOCOL_TYPE;

interface TProtocolParam {
  minFeeA: string | number;
  minFeeB: string | number;
  maxBlockSize: string | number;
  maxTxSize: string | number;
  maxBHSize: string | number;
  keyDeposit: string | number;
  poolDeposit: string | number;
  maxEpoch: string | number;
  entropy: string | number;
  protocolMajor: string | number;
  protocolMinor: string | number;
  minUtxoValue: string | number;
  minPoolCost: string | number;
  priceMem: string | number;
  priceStep: string | number;
  maxTxExMem: string | number;
  maxTxExSteps: string | number;
  maxBlockExMem: string | number;
  maxBlockExSteps: string | number;
  maxValSize: string | number;
  collateralPercent: string | number;
  maxCollateralInputs: string | number;
  coinsPerUTxOByte: string | number;
  maxTxExUnits: string | number;
  maxBBSize: string | number;
  maxBlockExUnits: string | number;
  rho: string | number;
  tau: string | number;
  a0: string | number;
  eMax: string | number;
  nOpt: string | number;
  costModels: string | number;
  collateralPercentage: string | number;
  govActionLifetime: string | number;
  govActionDeposit: string | number;
  drepDeposit: string | number;
  drepActivity: string | number;
  ccMinSize: string | number;
  ccMaxTermLength: string | number;
}

interface ProtocolHistory {
  epochChanges: {
    startEpoch: number;
    endEpoch: number;
  }[];
  minFeeA: TProtocolItem[];
  minFeeB: TProtocolItem[];
  maxBlockSize: TProtocolItem[];
  maxTxSize: TProtocolItem[];
  maxBhSize: TProtocolItem[];
  keyDeposit: TProtocolItem[];
  poolDeposit: TProtocolItem[];
  maxEpoch: TProtocolItem[];
  optimalPoolCount: TProtocolItem[];
  influence: TProtocolItem[];
  monetaryExpandRate: TProtocolItem[];
  treasuryGrowthRate: TProtocolItem[];
  decentralisation: TProtocolItem[];
  entropy: TProtocolItem[];
  protocolMajor: TProtocolItem[];
  protocolMinor: TProtocolItem[];
  minUtxoValue: TProtocolItem[];
  minPoolCost: TProtocolItem[];
  costModel: TProtocolItem[];
  priceMem: TProtocolItem[];
  priceStep: TProtocolItem[];
  maxTxExMem: TProtocolItem[];
  maxTxExSteps: TProtocolItem[];
  maxBlockExMem: TProtocolItem[];
  maxBlockExSteps: TProtocolItem[];
  maxValSize: TProtocolItem[];
  collateralPercent: TProtocolItem[];
  maxCollateralInputs: TProtocolItem[];
  coinsPerUTxOByte: TProtocolItem[];
}

interface ProtocolFixed {
  activeSlotsCoeff: number;
  genDelegs: Record<string, Record<string, string>>;
  updateQuorum: 0;
  networkId: string;
  initialFunds: Record<string, object>;
  maxLovelaceSupply: number;
  networkMagic: number;
  epochLength: number;
  timestamp: string;
  slotsPerKESPeriod: number;
  slotLength: number;
  maxKESEvolutions: number;
  securityParam: number;
}
