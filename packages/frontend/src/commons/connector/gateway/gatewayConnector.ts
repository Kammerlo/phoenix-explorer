import {ApiConnector, StakeAddressAction} from "../ApiConnector";
import axios, {AxiosInstance} from "axios";
import {ParsedUrlQuery} from "querystring";
import {POOL_TYPE} from "src/pages/RegistrationPools";
import {FunctionEnum} from "src/commons/connector/types/FunctionEnum";
import {ApiReturnType} from "@shared/APIReturnType";
import applyCaseMiddleware from "axios-case-converter";
import {IDataEpoch} from "@shared/dtos/epoch.dto";
import {Block} from "@shared/dtos/block.dto";

export class GatewayConnector implements ApiConnector {
  baseUrl: string;
  client: AxiosInstance;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.client = applyCaseMiddleware(axios.create());
  }

  getSupportedFunctions(): FunctionEnum[] {
    return [FunctionEnum.EPOCH];
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
    throw new Error("Not Implemented")
  }

  async getBlocksByEpoch(epoch: number, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>> {
    const response = await this.client.get<ApiReturnType<Block[]>>(`${this.baseUrl}/epochs/${epoch}/blocks`, {
      params: pageInfo
    });
    return response.data;
  }

  async getBlocksPage(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>> {
    throw new Error("Not Implemented")
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
    throw new Error("Not Implemented")
  }

  async getTxDetail(txHash: string): Promise<ApiReturnType<TransactionDetail>> {
    throw new Error("Not Implemented")
  }

  async getWalletAddressFromAddress(address: string): Promise<ApiReturnType<WalletAddress>> {
    throw new Error("Not Implemented")
  }

  async getWalletStakeFromAddress(address: string): Promise<ApiReturnType<WalletStake>> {
    throw new Error("Not Implemented")
  }
}
