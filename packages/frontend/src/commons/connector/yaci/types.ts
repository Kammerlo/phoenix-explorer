// Yaci-store DTO types — hand-typed equivalents of the live swagger schemas at
// /v3/api-docs (see /tmp/yaci-schemas.json). Field names are camelCase because
// axios-case-converter transforms the wire-level snake_case before the data
// reaches the mappers.

// ── Blocks ───────────────────────────────────────────────────────────────────
export interface BlockDto {
  hash?: string;
  number?: number;
  height?: number;
  slot?: number;
  epoch?: number;
  era?: number;
  epochSlot?: number;
  time?: number;            // epoch seconds
  txCount?: number;
  size?: number;
  slotLeader?: string;
  output?: number;
  fees?: number;
  blockVrf?: string;
  previousBlock?: string;
  nextBlock?: string;
  confirmations?: number;
  protocolVersion?: string;
}

export interface BlockSummary {
  hash?: string;
  number?: number;
  time?: number;
  slot?: number;
  epoch?: number;
  era?: number;
  output?: number;
  fees?: number;
  slotLeader?: string;
  size?: number;
  txCount?: number;
  issuerVkey?: string;
  // BlocksPage uses BlockSummary; aliases the BlockDTOToBlock mapper relies on:
  epochSlot?: number;
  previousBlock?: string;
  nextBlock?: string;
  blockVrf?: string;
}

export interface BlocksPage {
  blocks?: BlockSummary[];
  total?: number;
  totalPages?: number;
}

// ── Transactions ─────────────────────────────────────────────────────────────
export interface TransactionSummary {
  txHash?: string;
  blockNumber?: number;
  slot?: number;
  outputAddresses?: string[];
  totalOutput?: number | string;
  fee?: number | string;
  blockTime?: number;       // epoch seconds
}

export interface TransactionPage {
  transactionSummaries?: TransactionSummary[];
  total?: number;
  totalPages?: number;
}

export interface TransactionDetails {
  hash?: string;
  blockHash?: string;
  blockHeight?: number;
  blockNumber?: number;
  slot?: number;
  index?: number;
  // The /txs/{hash} endpoint historically returned utxos inline. They are now
  // typed as optional so callers can compose them from /utxos when missing.
  inputs?: TxUtxo[];
  outputs?: TxUtxo[];
  collateralInputs?: TxUtxo[];
  collateralReturn?: TxOuput;
  referenceInputs?: TxUtxo[];
  requiredSigners?: string[];
  outputAmount?: { unit: string; quantity: string }[];
  fees?: string | number;
  deposit?: string | number;
  totalOutput?: string | number;
  totalCollateral?: number;
  size?: number;
  ttl?: number;
  auxiliaryDataHash?: string;
  validityIntervalStart?: number;
  scriptDataHash?: string;
  invalidBefore?: string;
  invalidHereafter?: string;
  utxoCount?: number;
  withdrawalCount?: number;
  mirCertCount?: number;
  delegationCount?: number;
  stakeCertCount?: number;
  poolUpdateCount?: number;
  poolRetireCount?: number;
  assetMintOrBurnCount?: number;
  redeemerCount?: number;
  validContract?: boolean;
  invalid?: boolean;
  netowrkId?: number;
}

export interface TxUtxo {
  txHash?: string;
  outputIndex?: number;
  address?: string;
  stakeAddress?: string;
  amount?: Amount[];
  amounts?: Amt[];
  dataHash?: string;
  inlineDatum?: string;
  scriptRef?: string;
  referenceScriptHash?: string;
  inlineDatumJson?: unknown;
}

export interface TxOuput {
  address?: string;
  amount?: Amount[];
  outputIndex?: number;
}

export interface Amount {
  unit?: string;
  quantity?: string | number;
  policyId?: string;
  assetName?: string;
  fingerprint?: string;
}

export interface Amt {
  unit?: string;
  policyId?: string;
  assetName?: string;
  fingerprint?: string;
  quantity?: string | number;
}

export interface TxInputsOutputs {
  hash?: string;
  inputs?: TxUtxo[];
  outputs?: TxUtxo[];
}

/**
 * Row of GET /txs/{txHash}/redeemers (camelCased `TxRedeemerDto`). The spend
 * pointer arrives as `txIndex` per the OpenAPI schema, but some builds emit it
 * as `index` — `@shared/helpers/contracts.buildContracts` picks either.
 */
export interface TxRedeemerDto {
  txIndex?: number;
  index?: number;
  purpose?: string;
  scriptHash?: string;
  datumHash?: string;
  redeemerDataHash?: string;
  unitMem?: string | number;
  unitSteps?: string | number;
}

/** GET /scripts/{scriptHash}/cbor and /scripts/datum/{datumHash}/cbor payload. */
export interface ScriptCborDto {
  cbor?: string;
}

export interface TxMetadataLabelDto {
  blockNumber?: number;
  blockTime?: number;
  label?: number | string;
  jsonMetadata?: unknown;
  body?: unknown;
  cborMetadata?: string;
  slot?: number;
}

export interface AddressUtxo {
  txHash?: string;
  outputIndex?: number;
  address?: string;
  amount?: Amount[];
}

export interface AddressTransaction {
  txHash?: string;
  blockHeight?: number;
  blockNumber?: number;
  blockTime?: number;
}

// ── Epochs / protocol params ─────────────────────────────────────────────────
// Yaci-store does not expose an /epochs list endpoint nor a generic /epochs/{n}
// detail. We still declare a minimal Epoch shape because some mappers carry the
// old interface; the connector no longer instantiates it.
export interface Epoch {
  number?: number;
  startTime?: string;
  endTime?: string;
  blockCount?: number;
  txCount?: number;
  outputSum?: string;
  fees?: string;
  activeStake?: string;
}

export interface ProtocolParamsDto {
  epoch?: number;
  minFeeA?: number;
  minFeeB?: number;
  maxBlockSize?: number;
  maxTxSize?: number;
  maxBlockHeaderSize?: number;
  keyDeposit?: number | string;
  poolDeposit?: number | string;
  a0?: number;
  rho?: number;
  tau?: number;
  decentralisationParam?: number;
  extraEntropy?: number | string;
  protocolMajorVer?: number;
  protocolMinorVer?: number;
  minUtxo?: number | string;
  minPoolCost?: number | string;
  nonce?: string;
  costModels?: Record<string, Record<string, number>>;
  priceMem?: number;
  priceStep?: number;
  maxTxExMem?: number | string;
  maxTxExSteps?: number | string;
  maxBlockExMem?: number | string;
  maxBlockExSteps?: number | string;
  maxValSize?: number | string;
  collateralPercent?: number;
  maxCollateralInputs?: number;
  coinsPerUtxoSize?: number | string;
  coinsPerUtxoWord?: number | string;
  eMax?: number;
  nOpt?: number;
  govActionLifetime?: number;
  govActionDeposit?: number;
  drepDeposit?: number;
  drepActivity?: number;
  committeeMinSize?: number;
  committeeMaxTermLength?: number;
  minFeeRefScriptCostPerByte?: number;
}

// Kept for backwards compatibility with mappers that reference both names.
export type ProtocolParams = ProtocolParamsDto;

// ── Stake ─────────────────────────────────────────────────────────────────────
export interface StakeAccountInfo {
  stakeAddress?: string;
  controlledAmount?: number;
  withdrawableAmount?: number;
  poolId?: string;
}

export interface StakeRegistrationDetail {
  txHash?: string;
  certIndex?: number;
  txIndex?: number;
  address?: string;
  credential?: string;
  credentialType?: "ADDR_KEYHASH" | "SCRIPTHASH";
  type?: string;
  blockNumber?: number;
  blockTime?: number;
  blockHash?: string;
  slot?: number;
  epoch?: number;
}

export interface Delegation {
  txHash?: string;
  certIndex?: number;
  txIndex?: number;
  address?: string;
  credential?: string;
  credentialType?: "ADDR_KEYHASH" | "SCRIPTHASH";
  poolId?: string;
  blockNumber?: number;
  blockTime?: number;
  blockHash?: string;
  slot?: number;
  epoch?: number;
  active?: boolean;
}

// ── Pools ────────────────────────────────────────────────────────────────────
export interface PoolRegistration {
  txHash?: string;
  certIndex?: number;
  txIndex?: number;
  poolId?: string;
  poolIdBech32?: string;
  vrfKeyHash?: string;
  pledge?: number;
  cost?: number;
  margin?: number;
  marginNumerator?: number;
  marginDenominator?: number;
  rewardAccount?: string;
  poolOwners?: string[];
  relays?: unknown[];
  metadataUrl?: string;
  metadataHash?: string;
  blockNumber?: number;
  blockTime?: number;
  blockHash?: string;
  slot?: number;
  epoch?: number;
}

export interface PoolRetirement {
  txHash?: string;
  certIndex?: number;
  txIndex?: number;
  poolId?: string;
  poolIdBech32?: string;
  retirementEpoch?: number;
  epoch?: number;
  slot?: number;
  blockHash?: string;
  blockNumber?: number;
  blockTime?: number;
}

export interface PoolBlock {
  poolId?: string;
  hash?: string;
  blockHash?: string;
  number?: number;
  blockNumber?: number;
  epoch?: number;
  epochNumber?: number;
}

// ── Assets ───────────────────────────────────────────────────────────────────
export interface AssetTransaction {
  txHash?: string;
  blockHeight?: number;
  blockNumber?: number;
  blockTime?: number;
  action?: "minted" | "burned";
  amount?: string;
}

export interface FingerprintSupply {
  fingerprint?: string;
  unit?: string;
  supply?: string | number;
  totalSupply?: string;
}

export interface TxAsset {
  blockNumber?: number;
  blockTime?: number;
  slot?: number;
  txHash?: string;
  policy?: string;
  assetName?: string;
  unit?: string;
  fingerprint?: string;
  quantity?: string | number;
  mintType?: "MINT" | "BURN";
}

// ── Withdrawals ──────────────────────────────────────────────────────────────
export interface Withdrawal {
  blockNumber?: number;
  blockTime?: number;
  address?: string;
  txHash?: string;
  amount?: number | string;
  epoch?: number;
  slot?: number;
}

// ── Governance ───────────────────────────────────────────────────────────────
export interface GovActionProposal {
  txHash?: string;
  index?: number;
  txIndex?: number;
  type?: string;
  blockTime?: number;
  blockNumber?: number;
  slot?: number;
  returnAddress?: string;
  deposit?: number;
  details?: unknown;
  anchorUrl?: string;
  anchorHash?: string;
  epoch?: number;
  govActionId?: string;
}

export interface VotingProcedureDto {
  id?: string;
  txHash?: string;
  index?: number;
  slot?: number;
  voterHash?: string;
  voterType?: string;       // see swagger enum values
  govActionTxHash?: string;
  govActionIndex?: number;
  vote?: "YES" | "NO" | "ABSTAIN" | string;
  anchorUrl?: string;
  anchorHash?: string;
  blockTime?: number;
  blockNumber?: number;
  epoch?: number;
  drepId?: string;
}

export interface DRepRegistration {
  txHash?: string;
  certIndex?: number;
  txIndex?: number;
  drepHash?: string;
  drepId?: string;
  anchorUrl?: string;
  anchorHash?: string;
  deposit?: number;
  type?: string;
  credType?: "ADDR_KEYHASH" | "SCRIPTHASH";
  blockNumber?: number;
  blockTime?: number;
  slot?: number;
  epoch?: number;
}

export interface DelegationVote {
  txHash?: string;
  certIndex?: number;
  txIndex?: number;
  address?: string;          // stake address of delegator
  drepHash?: string;
  drepId?: string;
  drepType?: "ADDR_KEYHASH" | "SCRIPTHASH" | "ABSTAIN" | "NO_CONFIDENCE";
  credential?: string;
  credType?: "ADDR_KEYHASH" | "SCRIPTHASH";
  amount?: number;
  blockNumber?: number;
  blockTime?: number;
  slot?: number;
  epoch?: number;
}

// ── AddressBalance helper used by the address mapper ─────────────────────────
// Shape verified against a live yaci-store 0.10.6: GET /addresses/{address}/balance
// returns { blockNumber, blockTime, address, amounts: Amt[], slot, lastBalanceCalculationBlock }.
export interface AddressBalanceDto {
  address?: string;
  amounts?: Amt[];
  blockNumber?: number;
  blockTime?: number;
  slot?: number;
  lastBalanceCalculationBlock?: number;
}

/** Row of GET /assets/{unit}/addresses (camelCased `AddressAssetBalanceDto`). */
export interface AddressAssetBalanceDto {
  address?: string;
  quantity?: string;
}
