import {ApiConnector, StakeAddressAction} from "../ApiConnector";
import axios, {AxiosInstance} from "axios";
import {ParsedUrlQuery} from "querystring";
import {POOL_TYPE} from "../../../pages/RegistrationPools";
import {FunctionEnum} from "../types/FunctionEnum";
import {ApiReturnType} from "../types/APIReturnType";
import applyCaseMiddleware from "axios-case-converter";

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
    throw new Error("Not Implemented")
  }

  async getEpochs(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<IDataEpoch[]>> {

  }

    async getBlockDetail(blockId: string): Promise<ApiReturnType<Block>> {
        throw new Error("Not Implemented")
    }

    async getBlocksByEpoch(epoch: number): Promise<ApiReturnType<Block[]>> {
        throw new Error("Not Implemented")
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
