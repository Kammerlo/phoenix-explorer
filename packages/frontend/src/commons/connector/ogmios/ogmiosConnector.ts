// @ts-ignore
import { ParsedUrlQuery } from "querystring";
import { ConnectorBase } from "../ConnectorBase";
import { Capability } from "../types/Capability";
import { ApiReturnType } from "@shared/APIReturnType";
import { OgmiosClient, KupoClient } from "@shared/ogmios/client";
import { ogmiosServices, OgmiosBackends } from "@shared/ogmios/services";
import { EpochOverview } from "@shared/dtos/epoch.dto";
import { ITokenOverview, TokenHolder } from "@shared/dtos/token.dto";
import { GovActionVote, GovernanceActionDetail, GovernanceActionListItem } from "@shared/dtos/GovernanceOverview";
import { AddressDetail, StakeAddressDetail } from "@shared/dtos/address.dto";
import { PoolDetail, PoolOverview } from "@shared/dtos/pool.dto";
import { Drep } from "@shared/dtos/drep.dto";
import { SearchResult } from "@shared/dtos/seach.dto";
import { DashboardStats } from "@shared/dtos/dashboard.dto";
// @ts-ignore — ambient frontend protocol type
import { TProtocolParam } from "../../../types/protocol";

const CAPABILITIES: Capability[] = [
  "getCurrentProtocolParameters",
  "getDashboardStats",
  "getEpoch",
  "getPoolList",
  "getPoolDetail",
  "getDreps",
  "getDrep",
  "getGovernanceOverviewList",
  "getGovernanceDetail",
  "getGovernanceActionVotes",
  "getWalletAddressFromAddress",
  "getWalletStakeFromAddress",
  "getTokenHolders",
  "getTokensByPolicy",
  "getTokenDetail",
  "search"
];

export class OgmiosConnector extends ConnectorBase {
  private readonly backends: OgmiosBackends;

  constructor(baseUrl: string, kupoUrl?: string) {
    super(baseUrl);
    const fetchImpl = (...args: Parameters<typeof fetch>) => fetch(...args);
    const ogmios = new OgmiosClient(baseUrl, { fetchImpl: fetchImpl as never });
    const kupo = kupoUrl ? new KupoClient(kupoUrl, { fetchImpl: fetchImpl as never }) : undefined;
    this.backends = { ogmios, kupo };
  }

  getCapabilities(): ReadonlySet<Capability> {
    return new Set(CAPABILITIES);
  }

  getCurrentProtocolParameters(): Promise<ApiReturnType<TProtocolParam>> {
    return ogmiosServices.getCurrentProtocolParameters(this.backends) as unknown as Promise<ApiReturnType<TProtocolParam>>;
  }
  getDashboardStats(): Promise<ApiReturnType<DashboardStats>> {
    return ogmiosServices.getDashboardStats(this.backends);
  }
  getEpoch(epochId: number): Promise<ApiReturnType<EpochOverview>> {
    return ogmiosServices.getEpoch(this.backends, epochId);
  }
  getPoolList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<PoolOverview[]>> {
    return ogmiosServices.getPoolList(this.backends, pageInfo);
  }
  getPoolDetail(poolId: string): Promise<ApiReturnType<PoolDetail>> {
    return ogmiosServices.getPoolDetail(this.backends, poolId);
  }
  getDreps(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Drep[]>> {
    return ogmiosServices.getDreps(this.backends, pageInfo);
  }
  getDrep(drepId: string): Promise<ApiReturnType<Drep>> {
    return ogmiosServices.getDrep(this.backends, drepId);
  }
  getGovernanceOverviewList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>> {
    return ogmiosServices.getGovernanceOverviewList(this.backends, pageInfo);
  }
  getGovernanceDetail(txHash: string, index: string): Promise<ApiReturnType<GovernanceActionDetail>> {
    return ogmiosServices.getGovernanceDetail(this.backends, txHash, index);
  }
  getGovernanceActionVotes(txHash: string, index: string): Promise<ApiReturnType<GovActionVote[]>> {
    return ogmiosServices.getGovernanceActionVotes(this.backends, txHash, index);
  }
  getWalletAddressFromAddress(address: string): Promise<ApiReturnType<AddressDetail>> {
    return ogmiosServices.getWalletAddressFromAddress(this.backends, address);
  }
  getWalletStakeFromAddress(address: string): Promise<ApiReturnType<StakeAddressDetail>> {
    return ogmiosServices.getWalletStakeFromAddress(this.backends, address);
  }
  getTokenHolders(tokenId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<TokenHolder[]>> {
    return ogmiosServices.getTokenHolders(this.backends, tokenId, pageInfo);
  }
  getTokensByPolicy(policyId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<ITokenOverview[]>> {
    return ogmiosServices.getTokensByPolicy(this.backends, policyId, pageInfo) as Promise<ApiReturnType<ITokenOverview[]>>;
  }
  getTokenDetail(tokenId: string): Promise<ApiReturnType<ITokenOverview>> {
    return ogmiosServices.getTokenDetail(this.backends, tokenId) as Promise<ApiReturnType<ITokenOverview>>;
  }
  search(query: string): Promise<ApiReturnType<SearchResult[]>> {
    return ogmiosServices.search(this.backends, query) as Promise<ApiReturnType<SearchResult[]>>;
  }
}
