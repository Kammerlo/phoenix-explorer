import { POOL_TYPE } from "src/commons/connector/types/FunctionEnum";
import { Capability } from "./types/Capability";
// @ts-ignore
import { TProtocolParam } from "../../types/protocol";
import { ParsedUrlQuery } from "querystring";
import { EpochOverview } from "@shared/dtos/epoch.dto";
import { Block } from "@shared/dtos/block.dto";
import { ApiReturnType } from "@shared/APIReturnType";
import { Transaction, TransactionDetail } from "@shared/dtos/transaction.dto";
import { ITokenOverview, TokenHolder } from "@shared/dtos/token.dto";
// Import GovernanceOverview type (adjust the path as needed)
import { GovActionVote, GovernanceActionDetail, GovernanceActionListItem, GovernanceOverview } from "@shared/dtos/GovernanceOverview";
import { AddressDetail, StakeAddressDetail } from "@shared/dtos/address.dto";
import { PoolDetail, PoolOverview } from "@shared/dtos/pool.dto";
import { Drep, DrepDelegates } from "@shared/dtos/drep.dto";
import { SearchResult } from "@shared/dtos/seach.dto";
import { DashboardStats } from "@shared/dtos/dashboard.dto";
import { ScriptVerification } from "@shared/dtos/scriptVerification.dto";

// Factory function set by ConnectorFactory.ts to avoid circular imports.
// ConnectorFactory.ts must be imported before getApiConnector() is called.
let _connectorFactory: (() => ApiConnector) | null = null;

export function _setConnectorFactory(fn: () => ApiConnector): void {
  _connectorFactory = fn;
}

export enum StakeAddressAction {
  REGISTRATION,
  DEREGISTRATION
}

export abstract class ApiConnector {
  baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public static getApiConnector(): ApiConnector {
    if (!_connectorFactory) {
      throw new Error(
        "ConnectorFactory not initialized. Add `import 'src/commons/connector/ConnectorFactory';` to index.tsx."
      );
    }
    return _connectorFactory();
  }

  /** Returns the set of `ApiConnector` methods this connector implements. */
  abstract getCapabilities(): ReadonlySet<Capability>;

  /** Synchronous capability check. */
  has(c: Capability): boolean {
    return this.getCapabilities().has(c);
  }

  /** True iff every capability in `cs` is supported. */
  hasAll(cs: readonly Capability[]): boolean {
    return cs.every((c) => this.has(c));
  }

  abstract getEpochs(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<EpochOverview[]>>;

  abstract getEpoch(epochId: number): Promise<ApiReturnType<EpochOverview>>;

  abstract getBlocksPage(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>>;

  abstract getBlocksByEpoch(epoch: number, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>>;

  abstract getBlockDetail(blockId: string): Promise<ApiReturnType<Block>>;

  abstract getTxDetail(txHash: string): Promise<ApiReturnType<TransactionDetail>>;

  abstract getTransactions(
    blockId: number | string | undefined,
    pageInfo: ParsedUrlQuery
  ): Promise<ApiReturnType<Transaction[]>>;

  abstract getWalletAddressFromAddress(address: string): Promise<ApiReturnType<AddressDetail>>;

  abstract getAddressTxsFromAddress(address: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>>;

  abstract getWalletStakeFromAddress(address: string): Promise<ApiReturnType<StakeAddressDetail>>;

  abstract getStakeAddressRegistrations(stakeAddressAction: StakeAddressAction): Promise<ApiReturnType<IStakeKey[]>>;

  abstract getStakeDelegations(): Promise<ApiReturnType<IStakeKey[]>>;

  abstract getPoolRegistrations(type: POOL_TYPE): Promise<ApiReturnType<Registration[]>>;

  abstract getCurrentProtocolParameters(): Promise<ApiReturnType<TProtocolParam>>;

  abstract getTokensPage(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<ITokenOverview[]>>;

  abstract getTokenDetail(tokenId: string): Promise<ApiReturnType<ITokenOverview>>;

  abstract getTokenTransactions(tokenId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>>;

  abstract getTokenHolders(tokenId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<TokenHolder[]>>;

  abstract getTokensByPolicy(policyId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<ITokenOverview[]>>;

  abstract getGovernanceOverviewList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>>;

  abstract getGovernanceDetail(txHash: string, index: string): Promise<ApiReturnType<GovernanceActionDetail>>;

  abstract getGovernanceActionVotes(txHash: string, index: string): Promise<ApiReturnType<GovActionVote[]>>;

  abstract getPoolList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<PoolOverview[]>>;

  abstract getPoolDetail(poolId: string): Promise<ApiReturnType<PoolDetail>>;

  abstract getPoolBlocks(poolId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>>;

  abstract getDreps(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Drep[]>>;

  abstract getDrep(drepId: string): Promise<ApiReturnType<Drep>>;

  abstract getDrepVotes(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>>;

  abstract getDrepDelegates(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<DrepDelegates[]>>;

  abstract search(query: string): Promise<ApiReturnType<SearchResult[]>>;

  abstract getDashboardStats(): Promise<ApiReturnType<DashboardStats>>;

  /**
   * Source-provenance verification for a Plutus script via uplc.link.
   *
   * Concrete (non-abstract) with a "not verified" default so every connector
   * satisfies the contract without change and the verification badge never
   * dead-ends. The GatewayConnector overrides this to proxy uplc.link's API.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getScriptVerification(_scriptHash: string): Promise<ApiReturnType<ScriptVerification>> {
    return Promise.resolve({ data: { verified: false }, lastUpdated: Date.now() });
  }

  /**
   * Lightweight transaction header (the `tx` block of `TransactionDetail`,
   * without UTxOs / certificates / contracts) so the detail page can render its
   * overview while the full detail is still loading.
   *
   * Concrete default simply resolves the full detail — connectors with a
   * cheaper path (gateway `/transactions/:hash/summary`, Blockfrost two-call
   * header fetch) override it. Never gate routes on this method; it degrades
   * to `getTxDetail` by construction.
   */
  getTxSummary(txHash: string): Promise<ApiReturnType<TransactionDetail>> {
    return this.getTxDetail(txHash);
  }
}
