import { ApiConnector, StakeAddressAction } from "../ApiConnector";
import axios, { AxiosInstance, AxiosResponse } from "axios";
// @ts-ignore
import { ParsedUrlQuery } from "querystring";
import { POOL_TYPE } from "src/pages/RegistrationPools";
import { FunctionEnum } from "src/commons/connector/types/FunctionEnum";
import { ApiReturnType } from "@shared/APIReturnType";
import applyCaseMiddleware from "axios-case-converter";
import { EpochOverview } from "@shared/dtos/epoch.dto";
import { Block } from "@shared/dtos/block.dto";
import { Transaction, TransactionDetail } from "@shared/dtos/transaction.dto";
import { ITokenOverview, TokenHolder } from "@shared/dtos/token.dto";
import epoch from "../../../pages/Epoch";
import { GovernanceActionDetail, GovernanceActionListItem, GovernanceOverview } from "@shared/dtos/GovernanceOverview";
import { AddressDetail, StakeAddressDetail } from "@shared/dtos/address.dto";
import { PoolDetail, PoolOverview } from "@shared/dtos/pool.dto";
import { Drep, DrepDelegates } from "@shared/dtos/drep.dto";

export class GatewayConnector implements ApiConnector {
  baseUrl: string;
  client: AxiosInstance;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.client = applyCaseMiddleware(axios.create());
  }

  async getTokenTransactions(tokenId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    const response = await this.client.get<ApiReturnType<Transaction[]>>(
      `${this.baseUrl}/tokens/${tokenId}/transactions`,
      { params: pageInfo }
    );
    return response.data;
  }

  async getTokenHolders(tokenId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<TokenHolder[]>> {
    const response = await this.client.get<ApiReturnType<TokenHolder[]>>(
      `${this.baseUrl}/tokens/${tokenId}/holders`,
      { params: pageInfo }
    );
    return response.data;
  }
  
  getPoolDetail(poolId: string): Promise<ApiReturnType<PoolDetail>> {
    return this.client.get<ApiReturnType<PoolDetail>>(`${this.baseUrl}/pools/${poolId}`)
      .then(response => response.data);
  }
  getPoolList(pageInfo: any): Promise<ApiReturnType<PoolOverview[]>> {
    return this.client.get<ApiReturnType<PoolOverview[]>>(`${this.baseUrl}/pools`, {
      params: pageInfo
    }).then(response => response.data);
  }
  getGovernanceDetail(txHash: string, index: string): Promise<ApiReturnType<GovernanceActionDetail>> {
    return this.client.get<ApiReturnType<GovernanceActionDetail>>(`${this.baseUrl}/governance/actions/${txHash}/${index}`)
      .then(response => response.data);
  }
  getGovernanceOverviewList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>> {
    return this.client.get<ApiReturnType<GovernanceActionListItem[]>>(`${this.baseUrl}/governance/actions`, {
      params: pageInfo
    }).then(response => response.data);
  }

  getSupportedFunctions(): FunctionEnum[] {
    return [FunctionEnum.EPOCH,
    FunctionEnum.BLOCK,
    FunctionEnum.TRANSACTION,
    FunctionEnum.TOKENS,
    FunctionEnum.DREP,
    // FunctionEnum.GOVERNANCE, // For now, we don't support governance actions
    FunctionEnum.POOL,
    FunctionEnum.ADDRESS];
  }

  async getEpoch(epochId: number): Promise<ApiReturnType<EpochOverview>> {
    const response = await this.client.get<ApiReturnType<EpochOverview>>(`${this.baseUrl}/epochs/${epochId}`);
    return response.data;
  }

  async getEpochs(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<EpochOverview[]>> {
    const response = await this.client.get<ApiReturnType<EpochOverview[]>>(`${this.baseUrl}/epochs`, {
      params: pageInfo,
    });
    return response.data;
  }

  async getBlockDetail(blockId: string): Promise<ApiReturnType<Block>> {
    const response = await this.client.get<ApiReturnType<Block>>(`${this.baseUrl}/blocks/${blockId}`);
    return response.data;
  }

  async getBlocksByEpoch(epoch: number, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>> {
    const response = await this.client.get<ApiReturnType<Block[]>>(`${this.baseUrl}/epochs/${epoch}/blocks`, {
      params: pageInfo
    });
    return response.data;
  }

  async getBlocksPage(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>> {
    const response = await this.client.get<ApiReturnType<Block[]>>(`${this.baseUrl}/blocks`, {
      params: pageInfo,
    });
    return response.data;
  }

  async getCurrentProtocolParameters(): Promise<ApiReturnType<TProtocolParam>> {
    throw new Error("Not Implemented")
  }

  async getPoolRegistrations(type: POOL_TYPE): Promise<ApiReturnType<Registration[]>> {
    throw new Error("Not Implemented")
  }

  async getStakeAddressRegistrations(stakeAddressAction: StakeAddressAction): Promise<ApiReturnType<IStakeKey[]>> {
    throw new Error("Not Implemented")
  }

  async getStakeDelegations(): Promise<ApiReturnType<IStakeKey[]>> {
    throw new Error("Not Implemented")
  }


  async getTransactions(blockId: number | string | undefined, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    let response: AxiosResponse<ApiReturnType<Transaction[]>>;
    if (blockId) {
      response = await this.client.get<ApiReturnType<Transaction[]>>(`${this.baseUrl}/blocks/${blockId}/transactions`, {
        params: pageInfo,
      });
    } else {
      response = await this.client.get<ApiReturnType<Transaction[]>>(`${this.baseUrl}/transactions`, {
        params: pageInfo,
      });
    }

    return response.data;
  }

  async getTxDetail(txHash: string): Promise<ApiReturnType<TransactionDetail>> {
    const response = await this.client.get<ApiReturnType<TransactionDetail>>(`${this.baseUrl}/transactions/${txHash}`);
    return response.data;
  }

  async getWalletAddressFromAddress(address: string): Promise<ApiReturnType<AddressDetail>> {
    const response = await this.client.get<ApiReturnType<AddressDetail>>(`${this.baseUrl}/addresses/${address}`);
    return response.data;
  }

  async getAddressTxsFromAddress(address: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    const response = await this.client.get<ApiReturnType<Transaction[]>>(`${this.baseUrl}/addresses/${address}/transactions`, {
      params: pageInfo
    });
    return response.data;
  }

  async getWalletStakeFromAddress(address: string): Promise<ApiReturnType<StakeAddressDetail>> {
    const response = await this.client.get<ApiReturnType<StakeAddressDetail>>(`${this.baseUrl}/addresses/${address}/stake`);
    return response.data;
  }

  async getTokensPage(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<ITokenOverview[]>> {
    const response = await this.client.get<ApiReturnType<ITokenOverview[]>>(`${this.baseUrl}/tokens`, {
      params: pageInfo
    });
    return response.data;
  }

  async getTokenDetail(tokenId: string): Promise<ApiReturnType<ITokenOverview>> {
    const response = await this.client.get<ApiReturnType<ITokenOverview>>(`${this.baseUrl}/tokens/${tokenId}`);
    return response.data;
  }

  async getGovernanceOverview(): Promise<ApiReturnType<GovernanceOverview>> {
    const response = await this.client.get<ApiReturnType<GovernanceOverview>>(`${this.baseUrl}/governance`);
    return response.data;
  }

  async getDreps(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Drep[]>> {
    const response = await this.client.get<ApiReturnType<Drep[]>>(`${this.baseUrl}/governance/dreps`, {
      params: pageInfo
    });
    return response.data;
  }

  async getDrep(drepId: string): Promise<ApiReturnType<Drep>> {
    const response = await this.client.get<ApiReturnType<Drep>>(`${this.baseUrl}/governance/dreps/${drepId}`);
    return response.data;
  }

  async getDrepVotes(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>> {
    const response = await this.client.get<ApiReturnType<GovernanceActionListItem[]>>(`${this.baseUrl}/governance/dreps/${drepId}/votes`, {
      params: pageInfo
    });
    return response.data;
  }

  async getDrepDelegates(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<DrepDelegates[]>> {
    const response = await this.client.get<ApiReturnType<DrepDelegates[]>>(`${this.baseUrl}/governance/dreps/${drepId}/delegates`, {
      params: pageInfo
    });
    return response.data;
  }
}
