import { ParsedUrlQuery } from "querystring";
import { envelope, errorEnvelope, unsupportedEnvelope, EnvelopeExtras } from "@shared/helpers/envelope";
import { ApiReturnType } from "@shared/APIReturnType";
import { EpochOverview } from "@shared/dtos/epoch.dto";
import { Block } from "@shared/dtos/block.dto";
import { Transaction, TransactionDetail } from "@shared/dtos/transaction.dto";
import { ITokenOverview, TokenHolder } from "@shared/dtos/token.dto";
import {
  GovActionVote,
  GovernanceActionDetail,
  GovernanceActionListItem
} from "@shared/dtos/GovernanceOverview";
import { AddressDetail, StakeAddressDetail } from "@shared/dtos/address.dto";
import { PoolDetail, PoolOverview } from "@shared/dtos/pool.dto";
import { Drep, DrepDelegates } from "@shared/dtos/drep.dto";
import { SearchResult } from "@shared/dtos/seach.dto";
import { DashboardStats } from "@shared/dtos/dashboard.dto";
import { FunctionEnum, POOL_TYPE } from "./types/FunctionEnum";
// @ts-ignore — generated TProtocolParam lives outside strict shared DTOs
import { TProtocolParam } from "../../types/protocol";
import { ApiConnector, StakeAddressAction } from "./ApiConnector";

/**
 * Concrete default implementation of every ApiConnector method. Each default
 * returns an "unsupported" envelope (list methods fall back to `[]`, object
 * methods to `null`) so subclasses only need to override the subset they
 * actually serve.
 *
 * Subclasses should also override `getSupportedFunctions()` to advertise which
 * features they serve — that remains the single source of truth for route and
 * menu gating. The unsupported envelope here is a defensive fallback for any
 * call site that bypasses the gate.
 */
export abstract class ConnectorBase extends ApiConnector {
  protected constructor(baseUrl: string) {
    super(baseUrl);
  }

  getSupportedFunctions(): FunctionEnum[] {
    return [];
  }

  // ── Helpers available to subclasses ──────────────────────────────────────

  protected async request<T>(
    fn: () => Promise<T>,
    fallback: T | null = null,
    extras: EnvelopeExtras = {}
  ): Promise<ApiReturnType<T>> {
    try {
      const data = await fn();
      return envelope<T>(data, extras);
    } catch (err) {
      return errorEnvelope<T>(err, fallback, extras);
    }
  }

  protected async requestList<T>(
    fn: () => Promise<{ data: T[]; extras?: EnvelopeExtras }>
  ): Promise<ApiReturnType<T[]>> {
    try {
      const { data, extras } = await fn();
      return envelope<T[]>(data, extras ?? {});
    } catch (err) {
      return errorEnvelope<T[]>(err, []);
    }
  }

  protected unsupported<T>(method: string, fallback: T | null = null): ApiReturnType<T> {
    return unsupportedEnvelope<T>(method, fallback);
  }

  // ── Default-unsupported implementations for every abstract method ────────

  async getEpochs(_pageInfo: ParsedUrlQuery): Promise<ApiReturnType<EpochOverview[]>> {
    return this.unsupported<EpochOverview[]>("getEpochs", []);
  }

  async getEpoch(_epochId: number): Promise<ApiReturnType<EpochOverview>> {
    return this.unsupported<EpochOverview>("getEpoch");
  }

  async getBlocksPage(_pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>> {
    return this.unsupported<Block[]>("getBlocksPage", []);
  }

  async getBlocksByEpoch(
    _epoch: number,
    _pageInfo: ParsedUrlQuery
  ): Promise<ApiReturnType<Block[]>> {
    return this.unsupported<Block[]>("getBlocksByEpoch", []);
  }

  async getBlockDetail(_blockId: string): Promise<ApiReturnType<Block>> {
    return this.unsupported<Block>("getBlockDetail");
  }

  async getTxDetail(_txHash: string): Promise<ApiReturnType<TransactionDetail>> {
    return this.unsupported<TransactionDetail>("getTxDetail");
  }

  async getTransactions(
    _blockId: number | string | undefined,
    _pageInfo: ParsedUrlQuery
  ): Promise<ApiReturnType<Transaction[]>> {
    return this.unsupported<Transaction[]>("getTransactions", []);
  }

  async getWalletAddressFromAddress(_address: string): Promise<ApiReturnType<AddressDetail>> {
    return this.unsupported<AddressDetail>("getWalletAddressFromAddress");
  }

  async getAddressTxsFromAddress(
    _address: string,
    _pageInfo: ParsedUrlQuery
  ): Promise<ApiReturnType<Transaction[]>> {
    return this.unsupported<Transaction[]>("getAddressTxsFromAddress", []);
  }

  async getWalletStakeFromAddress(_address: string): Promise<ApiReturnType<StakeAddressDetail>> {
    return this.unsupported<StakeAddressDetail>("getWalletStakeFromAddress");
  }

  async getStakeAddressRegistrations(
    _stakeAddressAction: StakeAddressAction
  ): Promise<ApiReturnType<IStakeKey[]>> {
    return this.unsupported<IStakeKey[]>("getStakeAddressRegistrations", []);
  }

  async getStakeDelegations(): Promise<ApiReturnType<IStakeKey[]>> {
    return this.unsupported<IStakeKey[]>("getStakeDelegations", []);
  }

  async getPoolRegistrations(_type: POOL_TYPE): Promise<ApiReturnType<Registration[]>> {
    return this.unsupported<Registration[]>("getPoolRegistrations", []);
  }

  async getCurrentProtocolParameters(): Promise<ApiReturnType<TProtocolParam>> {
    return this.unsupported<TProtocolParam>("getCurrentProtocolParameters");
  }

  async getTokensPage(_pageInfo: ParsedUrlQuery): Promise<ApiReturnType<ITokenOverview[]>> {
    return this.unsupported<ITokenOverview[]>("getTokensPage", []);
  }

  async getTokenDetail(_tokenId: string): Promise<ApiReturnType<ITokenOverview>> {
    return this.unsupported<ITokenOverview>("getTokenDetail");
  }

  async getTokenTransactions(
    _tokenId: string,
    _pageInfo: ParsedUrlQuery
  ): Promise<ApiReturnType<Transaction[]>> {
    return this.unsupported<Transaction[]>("getTokenTransactions", []);
  }

  async getTokenHolders(
    _tokenId: string,
    _pageInfo: ParsedUrlQuery
  ): Promise<ApiReturnType<TokenHolder[]>> {
    return this.unsupported<TokenHolder[]>("getTokenHolders", []);
  }

  async getTokensByPolicy(
    _policyId: string,
    _pageInfo: ParsedUrlQuery
  ): Promise<ApiReturnType<ITokenOverview[]>> {
    return this.unsupported<ITokenOverview[]>("getTokensByPolicy", []);
  }

  async getGovernanceOverviewList(
    _pageInfo: ParsedUrlQuery
  ): Promise<ApiReturnType<GovernanceActionListItem[]>> {
    return this.unsupported<GovernanceActionListItem[]>("getGovernanceOverviewList", []);
  }

  async getGovernanceDetail(
    _txHash: string,
    _index: string
  ): Promise<ApiReturnType<GovernanceActionDetail>> {
    return this.unsupported<GovernanceActionDetail>("getGovernanceDetail");
  }

  async getGovernanceActionVotes(
    _txHash: string,
    _index: string
  ): Promise<ApiReturnType<GovActionVote[]>> {
    return this.unsupported<GovActionVote[]>("getGovernanceActionVotes", []);
  }

  async getPoolList(_pageInfo: ParsedUrlQuery): Promise<ApiReturnType<PoolOverview[]>> {
    return this.unsupported<PoolOverview[]>("getPoolList", []);
  }

  async getPoolDetail(_poolId: string): Promise<ApiReturnType<PoolDetail>> {
    return this.unsupported<PoolDetail>("getPoolDetail");
  }

  async getPoolBlocks(
    _poolId: string,
    _pageInfo: ParsedUrlQuery
  ): Promise<ApiReturnType<Block[]>> {
    return this.unsupported<Block[]>("getPoolBlocks", []);
  }

  async getDreps(_pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Drep[]>> {
    return this.unsupported<Drep[]>("getDreps", []);
  }

  async getDrep(_drepId: string): Promise<ApiReturnType<Drep>> {
    return this.unsupported<Drep>("getDrep");
  }

  async getDrepVotes(
    _drepId: string,
    _pageInfo: ParsedUrlQuery
  ): Promise<ApiReturnType<GovernanceActionListItem[]>> {
    return this.unsupported<GovernanceActionListItem[]>("getDrepVotes", []);
  }

  async getDrepDelegates(
    _drepId: string,
    _pageInfo: ParsedUrlQuery
  ): Promise<ApiReturnType<DrepDelegates[]>> {
    return this.unsupported<DrepDelegates[]>("getDrepDelegates", []);
  }

  async search(_query: string): Promise<ApiReturnType<SearchResult[]>> {
    return this.unsupported<SearchResult[]>("search", []);
  }

  async getDashboardStats(): Promise<ApiReturnType<DashboardStats>> {
    return this.unsupported<DashboardStats>("getDashboardStats");
  }
}
