export interface Transaction {
  hash: string;
  blockNo: number;
  blockHash: string;
  epochNo: number;
  epochSlotNo: number;
  slot: number;
  addressesInput: string[];
  addressesOutput: string[];
  fee: number;
  totalOutput: number;
  time: string;
  balance: number;
  tokens: TransactionToken[];
}

export interface TransactionToken {
  address: string;
  addressId: number;
  displayName: string;
  fingerprint: string;
  name: string;
  policy: string;
  quantity: number;
}

export enum TRANSACTION_STATUS {
  FAILED = "FAILED",
  SUCCESS = "SUCCESS",
  PENDING = "PENDING"
}

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface TransactionDetail {
  tx: {
    hash: string;
    time: string;
    blockNo: number;
    epochSlot: number;
    epochNo: number;
    status: TransactionStatus;
    confirmation: number;
    fee: number;
    totalOutput: number;
    maxEpochSlot: number;
    slotNo: number;
  };
  summary: {
    stakeAddress: {
      address: string;
      value: number;
      fee?: number;
      tokens: Token[];
    }[];
  };
  contracts?: IContractItemTx[]; // TODO currently not implemented for Blockfrost
  collaterals?: {
    collateralInputResponses: CollateralResponses[];

    collateralOutputResponses: CollateralResponses[];
  };
  utxOs?: {
    inputs: {
      address: string;
      value: number;
      txHash: string;
      index: string;
      tokens: Token[];
      stakeAddress?: string;
    }[];
    outputs: {
      address: string;
      value: number;
      txHash: string;
      tokens: Token[];
      index: string;
      stakeAddress?: string;
    }[];
  };
  mints?: {
    assetName: string;
    assetId: string;
    assetQuantity: number;
    policy: string;
    metadata?: {
      decimals: number;
      description: string;
      logo: string;
      ticker: string;
      url: string;
    };
  }[];
  protocols?: TProtocol;
  previousProtocols?: TProtocol;
  signersInformation?: SignersInformation[];
  delegations?: {
    address: string;
    poolId: string;
  }[];
  withdrawals?: {
    stakeAddressFrom: string;
    addressTo: string[];
    amount: number;
  }[];
  poolCertificates?: TPoolCertificated[];
  stakeCertificates?: TStakeCertificated[];
  instantaneousRewards?: {
    amount: string;
    stakeAddress: string;
  }[];
  metadataHash: string;
  metadata?: {
    label: number;
    value: string;
    // metadataCIP20: { valid?: boolean; requiredProperties?: TTCIP25Properties[] };
    // metadataCIP83: { valid?: boolean; requiredProperties?: TTCIP25Properties[] };
    // metadataCIP25: CIP;
    // metadataCIP60: CIP;
  }[];
}

// interface CIP {
//   tokenMap?: TokenMap;
//   valid?: boolean;
  // version?: TTCIP25Properties;
// }

// interface TokenMap
//   extends Record<
//     string,
//     {
//       optionalProperties: TTCIP25Properties[];
//       requireProperties: TTCIP25Properties[];
//       tokenName: string;
//     }
//   > {
//   valid?: boolean;
// }

export type TPoolCertificated = {
  cost: number;
  margin: number;
  metadataHash: string;
  metadataUrl: string;
  pledge: number;
  poolId: string;
  poolOwners: string[];
  relays: {
    dnsName: string;
    dnsSrvName: string;
    ipv4: string;
    ipv6: string;
    port: number;
  }[];
  rewardAccount: string;
  type: "POOL_REGISTRATION" | "POOL_DEREGISTRATION";
  vrfKey: string;
  epoch: number;
};

type TStakeCertificated = {
  stakeAddress: string;
  type: "STAKE_REGISTRATION" | "STAKE_DEREGISTRATION";
};

export interface Token {
  assetName: string;
  assetQuantity: number;
  assetId: string;
  policy?: {
    policyId: string;
    totalToken?: number;
    policyScript?: string;
  };
  metadata?: {
    decimals: number;
    description: string;
    logo: string;
    ticker: string;
    url: string;
  };
}

interface IContractItemTx {
  contract: string;
  address: string;
  datumBytesIn: string;
  datumBytesOut: string;
  datumHashIn: string;
  datumHashOut: string;
  purpose: string;
  redeemerBytes: string;
  redeemerMem: number;
  redeemerSteps: number;
  governanceAction?: string;
  proposalLink?: string;
  governanceActionMetadata?: string;
  voterType?: string;
  vote?: string;
  dRepId?: string;
  submissionDate?: string;
  expireDate?: string;
  proposalPolicy?: string;
  scriptBytes: string;
  scriptHash: string;
  stakeAddress?: string;
  burningTokens?: {
    displayName: string;
    fingerprint: string;
    name: string;
    quantity: number;
    metadata: DMetadata;
  }[];
  mintingTokens?: {
    displayName: string;
    fingerprint: string;
    name: string;
    quantity: number;
    metadata: DMetadata;
  }[];
  utxoHash?: string;
  utxoIndex?: number;
  redeemerCertType?: "DELEGATION" | "STAKE_DEREGISTRATION";
  referenceInputs?: ReferenceInput[];
}
interface ReferenceInput {
  address: string;
  index: number;
  script: string;
  scriptHash: string;
  txHash: string;
  value: number;
  datumHash: string;
  datum: string;
  scriptType: string;
}

interface DMetadata {
  decimals: number;
}

type TProtocol = {
  minFeeA?: number;
  minFeeB?: number;
  maxBlockSize?: number;
  maxTxSize?: number;
  maxBhSize?: number;
  keyDeposit?: number;
  poolDeposit?: number;
  maxEpoch?: number;
  optimalPoolCount?: number;
  influence?: number;
  monetaryExpandRate?: number;
  treasuryGrowthRate?: number;
  decentralisation?: number;
  entropy?: number;
  protocolMajor?: number;
  protocolMinor?: number;
  minUtxoValue?: number;
  minPoolCost?: number;
  costModel?: number;
  priceMem?: number;
  priceStep?: number;
  maxTxExMem?: number;
  maxTxExSteps?: number;
  maxBlockExMem?: number;
  maxBlockExSteps?: number;
  maxValSize?: number;
  collateralPercent?: number;
  maxCollateralInputs?: number;
  coinsPerUtxoSize?: number;
};

type SignersInformation = {
  delegateKey?: string;
  publicKey?: string;
};

interface CollateralResponses {
  address: string;
  assetId: string;
  index: string;
  txHash: string;
  value: number;
  tokens: Token[];
}
