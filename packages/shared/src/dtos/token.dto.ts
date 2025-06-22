
export interface ITokenOverview {
  name?: string;
  displayName?: string;
  policy?: string;
  fingerprint?: string;
  txCount?: number;
  supply?: number;
  createdOn?: string;
  metadata?: ITokenMetadata;
  analytics?: { date: number; value: number }[];
  // volumeIn24h: number;
  // totalVolume: string;
  // numberOfHolders: number;
  // tokenType?: string;
  tokenLastActivity?: string;
  metadataJson?: string;
  // policyIsNativeScript: boolean;
}

interface ITokenMetadata {
  policy?: string;
  logo?: string;
  decimals?: number;
  description?: string;
  ticker?: string;
  url?: string;
}

interface ITokenTopHolderTable {
  address: string;
  addressType: "STAKE_ADDRESS" | "PAYMENT_ADDRESS";
  name: string;
  displayName: string;
  fingerprint: string;
  quantity: number;
}

interface ITokenMintingTable {
  txHash: string;
  amount: number;
  time: string;
}

interface TokensSearch {
  createdOn: string;
  displayName: string;
  fingerprint: string;
  name: string;
  numberOfHolders: number;
  policy: string;
  supply: string;
  totalVolume: string;
  txCount: number;
  volumeIn24h: string;
}

interface INativeScriptDetail {
  scriptHash?: string;
  conditionType?: string;
  required?: number;
  keyHashes?: string[];
  after?: string;
  before?: string;
  associatedAddress?: string[];
  script?: string;
  numberOfTokens?: number;
  isOneTimeMint?: boolean;
  isOpen?: boolean;
}
