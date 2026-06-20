export interface Ada { ada: { lovelace: number } }
export interface Bytes { bytes: number }

/** Ogmios multi-asset value: { ada:{lovelace}, <policyHex>: { <assetNameHex>: qty } } */
export interface OgmiosValue {
  ada: { lovelace: number };
  [policyId: string]: { lovelace: number } | Record<string, number>;
}

export interface OgmiosUtxo {
  transaction: { id: string };
  index: number;
  address: string;
  value: OgmiosValue;
  datumHash?: string;
  datum?: string;
  script?: unknown;
}

export interface OgmiosTip { slot: number; id: string }

export interface OgmiosEraSummary {
  start: { time: { seconds: number }; slot: number; epoch: number };
  end: { time: { seconds: number }; slot: number; epoch: number } | null;
  parameters: { epochLength: number; slotLength: { milliseconds: number }; safeZone?: number };
}

export interface OgmiosTreasuryAndReserves {
  treasury: Ada;
  reserves: Ada;
}

export interface OgmiosProtocolParameters {
  minFeeCoefficient: number;
  minFeeConstant: Ada;
  maxBlockBodySize: Bytes;
  maxBlockHeaderSize: Bytes;
  maxTransactionSize: Bytes;
  stakeCredentialDeposit: Ada;
  stakePoolDeposit: Ada;
  stakePoolRetirementEpochBound: number;
  desiredNumberOfStakePools: number;
  stakePoolPledgeInfluence: string;
  monetaryExpansion: string;
  treasuryExpansion: string;
  minStakePoolCost: Ada;
  minUtxoDepositConstant: Ada;
  minUtxoDepositCoefficient: number;
  plutusCostModels?: Record<string, number[]>;
  scriptExecutionPrices?: { memory: string; cpu: string };
  maxExecutionUnitsPerTransaction?: { memory: number; cpu: number };
  maxExecutionUnitsPerBlock?: { memory: number; cpu: number };
  maxValueSize?: Bytes;
  collateralPercentage?: number;
  maxCollateralInputs?: number;
  version: { major: number; minor: number };
  constitutionalCommitteeMinSize?: number;
  constitutionalCommitteeMaxTermLength?: number;
  governanceActionLifetime?: number;
  governanceActionDeposit?: Ada;
  delegateRepresentativeDeposit?: Ada;
  delegateRepresentativeMaxIdleTime?: number;
}

export interface OgmiosRelay { type?: string; hostname?: string; ipv4?: string; ipv6?: string; port?: number }

export interface OgmiosStakePool {
  id: string;
  vrfVerificationKeyHash?: string;
  pledge: Ada;
  cost: Ada;
  margin: string;
  rewardAccount?: string;
  owners?: string[];
  relays?: OgmiosRelay[];
  metadata?: { url: string; hash: string };
  stake?: Ada;
}

/** result of queryLedgerState/stakePools is a map keyed by bech32 pool id */
export type OgmiosStakePools = Record<string, OgmiosStakePool>;

export interface OgmiosDelegateRepresentative {
  type: "registered" | "noConfidence" | "abstain";
  from?: "verificationKey" | "script";
  id?: string;
  mandate?: { epoch: number };
  deposit?: Ada;
  stake?: Ada;
  delegators?: Array<{ from: string; credential: string }>;
  metadata?: { url: string; hash: string };
}

export type OgmiosVoteRole = "constitutionalCommittee" | "delegateRepresentative" | "stakePoolOperator";

export interface OgmiosProposalVote {
  issuer: { role: OgmiosVoteRole; from?: string; id: string };
  vote: "yes" | "no" | "abstain";
}

export interface OgmiosGovernanceProposal {
  proposal: { transaction: { id: string }; index: number };
  deposit?: Ada;
  returnAccount?: string;
  metadata?: { url: string; hash: string };
  action: { type: string; [k: string]: unknown };
  since?: { epoch: number };
  until?: { epoch: number };
  votes: OgmiosProposalVote[];
}

export interface OgmiosRewardAccountSummary {
  from: string;
  credential: string;
  stakePool?: { id: string };
  delegateRepresentative?: { type: string; from?: string; id?: string };
  rewards: Ada;
  deposit?: Ada;
}

/** Flat protocol-parameter object — structurally identical to the gateway output and frontend TProtocolParam. */
export interface ProtocolParams {
  minFeeA: number; minFeeB: number;
  maxBlockSize: number; maxTxSize: number; maxBHSize: number;
  keyDeposit: number; poolDeposit: number; maxEpoch: number; entropy: number;
  protocolMajor: number; protocolMinor: number;
  minUtxoValue: number; minPoolCost: number;
  priceMem: number; priceStep: number;
  maxTxExMem: number; maxTxExSteps: number; maxBlockExMem: number; maxBlockExSteps: number;
  maxValSize: number; collateralPercent: number; maxCollateralInputs: number;
  coinsPerUTxOByte: number; maxTxExUnits: number; maxBBSize: number; maxBlockExUnits: number;
  rho: number; tau: number; a0: number; eMax: number; nOpt: number;
  costModels: string; collateralPercentage: number;
  govActionLifetime: number; govActionDeposit: number;
  drepDeposit: number; drepActivity: number;
  ccMinSize: number; ccMaxTermLength: number;
}
