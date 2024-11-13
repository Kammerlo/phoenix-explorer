import { YaciConnector } from "./yaci/yaciConnector";
import { ApiReturnType } from "./types/APIReturnType";

export abstract class ApiConnector {
  baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public static getApiConnector(): ApiConnector {
    return new YaciConnector("http://localhost:8080/api/v1");
    // return new YaciConnector("https://api.mainnet.yaci.xyz/api/v1");
  }

  abstract getBlocksPage(): Promise<ApiReturnType<Block[]>>;

  abstract getBlocksByEpoch(epoch: number): Promise<ApiReturnType<Block[]>>;

  abstract getBlockDetail(blockId: string): Promise<ApiReturnType<Block>>;

  abstract getTxList(blockId: number | string): Promise<ApiReturnType<Transaction[]>>;

  abstract getTx(txHash: string): Promise<ApiReturnType<Transaction>>;

  abstract getCurrentEpoch(): Promise<ApiReturnType<EpochCurrentType>>;

  abstract getEpochs(): Promise<ApiReturnType<IDataEpoch[]>>;

  abstract getEpoch(epochId: number): Promise<ApiReturnType<IDataEpoch>>;

  abstract getTransactions(): Promise<ApiReturnType<Transactions[]>>;

  abstract getWalletAddressFromAddress(address: string): Promise<ApiReturnType<WalletAddress>>;
}
