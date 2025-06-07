import {ApiConnector, StakeAddressAction} from "../ApiConnector";
import axios, {AxiosInstance, AxiosResponse} from "axios";
import {ParsedUrlQuery} from "querystring";
import {POOL_TYPE} from "src/pages/RegistrationPools";
import {FunctionEnum} from "src/commons/connector/types/FunctionEnum";
import {ApiReturnType} from "@shared/APIReturnType";
import applyCaseMiddleware from "axios-case-converter";
import {IDataEpoch} from "@shared/dtos/epoch.dto";
import {Block} from "@shared/dtos/block.dto";
import {Transaction, TransactionDetail} from "@shared/dtos/transaction.dto";

export class GatewayConnector implements ApiConnector {
  baseUrl: string;
  client: AxiosInstance;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.client = applyCaseMiddleware(axios.create());
  }

  getSupportedFunctions(): FunctionEnum[] {
    return [FunctionEnum.EPOCH,
    FunctionEnum.BLOCK,
    FunctionEnum.TRANSACTION];
  }

  async getEpoch(epochId: number): Promise<ApiReturnType<IDataEpoch>> {
    const response = await this.client.get<ApiReturnType<IDataEpoch>>(`${this.baseUrl}/epochs/${epochId}`);
    return response.data;
  }

  async getEpochs(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<IDataEpoch[]>> {
    const response = await this.client.get<ApiReturnType<IDataEpoch[]>>(`${this.baseUrl}/epochs`, {
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
    let response : AxiosResponse<ApiReturnType<Transaction[]>>;
    if(blockId) {
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

  async getWalletAddressFromAddress(address: string): Promise<ApiReturnType<WalletAddress>> {
    throw new Error("Not Implemented")
  }

  async getWalletStakeFromAddress(address: string): Promise<ApiReturnType<WalletStake>> {
    throw new Error("Not Implemented")
  }
}
