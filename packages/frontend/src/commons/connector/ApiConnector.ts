import { YaciConnector } from "./yaci/yaciConnector";
import { FunctionEnum } from "./types/FunctionEnum";
import { POOL_TYPE } from "src/pages/RegistrationPools";
// @ts-ignore
import { TProtocolParam } from "../../types/protocol";
import { ParsedUrlQuery } from "querystring";
import { GatewayConnector } from "./gateway/gatewayConnector";
import { EpochOverview } from "@shared/dtos/epoch.dto";
import { Block } from "@shared/dtos/block.dto";
import { ApiReturnType } from "@shared/APIReturnType";
import { Transaction, TransactionDetail } from "@shared/dtos/transaction.dto";
import { ITokenOverview, TokenHolder } from "@shared/dtos/token.dto";
// Import GovernanceOverview type (adjust the path as needed)
import { GovernanceActionDetail, GovernanceActionListItem, GovernanceOverview } from "@shared/dtos/GovernanceOverview";
import { AddressDetail, StakeAddressDetail } from "@shared/dtos/address.dto";
import { PoolDetail, PoolOverview } from "@shared/dtos/pool.dto";
import { Drep, DrepDelegates } from "@shared/dtos/drep.dto";

const API_URL: string = process.env.REACT_APP_API_URL || "";
const API_CONNECTOR_TYPE: string = process.env.REACT_APP_API_TYPE || "";

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
    // if (API_CONNECTOR_TYPE === "YACI") {
    //   return new YaciConnector(API_URL);
    // }
    if (API_CONNECTOR_TYPE === "GATEWAY") {
      return new GatewayConnector(API_URL);
    }
    throw new Error("Invalid API_CONNECTOR_TYPE");
    // return new YaciConnector("https://api.mainnet.yaci.xyz/api/v1");
  }
  abstract getSupportedFunctions(): FunctionEnum[];

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

  abstract getGovernanceOverviewList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>>;

  abstract getGovernanceDetail(txHash: string, index: string): Promise<ApiReturnType<GovernanceActionDetail>>;

  abstract getPoolList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<PoolOverview[]>>;

  abstract getPoolDetail(poolId: string): Promise<ApiReturnType<PoolDetail>>;

  abstract getDreps(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Drep[]>>;

  abstract getDrep(drepId: string): Promise<ApiReturnType<Drep>>;

  abstract getDrepVotes(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>>;

  abstract getDrepDelegates(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<DrepDelegates[]>>;
}
