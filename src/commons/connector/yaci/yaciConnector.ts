import axios, { AxiosError, AxiosInstance } from "axios";

import { ApiConnector, StakeAddressAction } from "../ApiConnector";
import { ApiReturnType } from "../types/APIReturnType";
import {
  AddressBalanceDto,
  BlockDto,
  BlocksPage,
  Delegation,
  Epoch,
  EpochsPage,
  PoolRegistration,
  PoolRetirement,
  ProtocolParamsDto,
  StakeAccountInfo,
  StakeRegistrationDetail,
  TransactionDetails,
  TransactionPage,
  TransactionSummary,
  TxMetadataLabelDto
} from "./types";
import applyCaseMiddleware from "axios-case-converter";
import { FunctionEnum } from "../types/FunctionEnum";
import { credentialToRewardAddress, Network, paymentCredentialOf } from "@lucid-evolution/lucid";
import { POOL_TYPE } from "../../../pages/RegistrationPools";
import { epochToIEpochData } from "./mapper/EpochToIEpochData";
import { poolRegistrationsToRegistrations } from "./mapper/PoolRegistrationsToRegistrations";
import { poolRetirementsToRegistrations } from "./mapper/PoolRetirementsToRegistrations";
import { blockDTOToBlock } from "./mapper/BlockDTOToBlock";
import { toTransactionDetail } from "./mapper/ToTransactionDetails";
import { transactionSummaryAndBlockToTransaction } from "./mapper/TransactionSummaryAndBlockToTransaction";
import { delegationToIStakeKey } from "./mapper/DelegationToIStakeKey";
import { stakeRegistrationDetailToIStakeKey } from "./mapper/StakeRegistrationDetailToIStakeKey";
import { addressBalanceDtoToWalletAddress } from "./mapper/AddressBalanceDtoToWalletAddress";
// @ts-ignore
import { TProtocolParam } from "../../../types/protocol";
import { protocolParamsToTProtocolParam } from "./mapper/ProtocolParamsToTProtocolParam";
import { ParsedUrlQuery } from "querystring";
import { DRepPage } from "./types/drep-page";
import { drepRegistrationsToDreps } from "./mapper/DrepRegistrationsToDreps";
import { DRepDto } from "./types/drep-dto";
import { dRepDtoToDrepOverview } from "./mapper/DRepDtoToDrepOverview";

export class YaciConnector implements ApiConnector {
  baseUrl: string;
  client: AxiosInstance;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.client = applyCaseMiddleware(axios.create());
  }

  getSupportedFunctions(): FunctionEnum[] {
    return [
      FunctionEnum.EPOCH,
      FunctionEnum.BLOCK,
      FunctionEnum.TRANSACTION,
      FunctionEnum.ADDRESS,
      FunctionEnum.STAKE_ADDRESS_REGISTRATION,
      FunctionEnum.POOL_REGISTRATION,
      FunctionEnum.PROTOCOL_PARAMETER,
      FunctionEnum.DREP
    ];
  }

  async getBlocksPage(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>> {
    try {
      const response = await this.client.get<BlocksPage>(`${this.baseUrl}/blocks`, {
        params: pageInfo
      });
      const blocks: Block[] = [];
      // getting additional data
      for (const block of response.data.blocks!) {
        blocks.push((await this.getBlockDetail(block.number!)).data as Block);
      }

      const latestBlockResponse = await this.client.get<BlockDto>(`${this.baseUrl}/blocks/latest`);
      return {
        data: blocks,
        total: latestBlockResponse.data.number!, // TODO - Check if this is correct
        totalPage: latestBlockResponse.data.number! / 50,
        lastUpdated: Date.now()
      } as ApiReturnType<Block[]>;
    } catch (e) {
      return {
        data: [],
        error: "Couldn't fetch blocks",
        lastUpdated: Date.now()
      } as ApiReturnType<Block[]>;
    }
  }

  async getBlocksByEpoch(epoch: number): Promise<ApiReturnType<Block[]>> {
    try {
      const response = await this.client.get<BlocksPage>(`${this.baseUrl}/blocks/epoch/${epoch}`);
      const blocks: Block[] = [];
      // getting additional data
      for (const block of response.data.blocks!) {
        blocks.push((await this.getBlockDetail(block.number!)).data as Block);
      }
      return {
        data: blocks,
        total: response.data.total,
        totalPage: response.data.totalPages,
        lastUpdated: Date.now()
      } as ApiReturnType<Block[]>;
    } catch (e) {
      return {
        data: [],
        error: "Couldn't fetch blocks by Epoch",
        lastUpdated: Date.now()
      } as ApiReturnType<Block[]>;
    }
  }

  async getBlockDetail(blockId: number | string): Promise<ApiReturnType<Block>> {
    if (!blockId) {
      return {
        data: null,
        lastUpdated: Date.now()
      } as ApiReturnType<Block>;
    }
    return this.client
      .get<BlockDto>(`${this.baseUrl}/blocks/${blockId}`)
      .then((response) => {
        const block: Block = blockDTOToBlock(response.data);
        return {
          data: block,
          lastUpdated: Date.now()
        } as ApiReturnType<Block>;
      })
      .catch((error: AxiosError) => {
        return {
          data: null,
          error: error.message,
          lastUpdated: Date.now()
        } as ApiReturnType<Block>;
      });
  }

  async getTxDetail(txHash: string): Promise<ApiReturnType<TransactionDetail>> {
    return this.client
      .get<TransactionDetails>(`${this.baseUrl}/txs/${txHash}`)
      .then((response) => {
        const txDetails = response.data;
        return this.getBlockDetail(txDetails.blockHeight!)
          .then((blockResponse) => {
            const block = blockResponse.data;
            return this.client
              .get<TxMetadataLabelDto[]>(`${this.baseUrl}/txs/${txHash}/metadata`)
              .then((metadataResponse) => {
                const metadata = metadataResponse.data;
                const tx = toTransactionDetail(txDetails, block, metadata);
                return {
                  data: tx,
                  lastUpdated: Date.now()
                } as ApiReturnType<TransactionDetail>;
              })
              .catch((error: AxiosError) => {
                return {
                  data: null,
                  error: error.message,
                  lastUpdated: Date.now()
                } as ApiReturnType<TransactionDetail>;
              });
          })
          .catch((error: AxiosError) => {
            return {
              data: null,
              error: error.message,
              lastUpdated: Date.now()
            } as ApiReturnType<TransactionDetail>;
          });
      })
      .catch((error: AxiosError) => {
        return {
          data: null,
          error: error.message,
          lastUpdated: Date.now()
        } as ApiReturnType<TransactionDetail>;
      });
  }

  async getTxList(blockId: number | string): Promise<ApiReturnType<TransactionDetail[]>> {
    return this.client
      .get<TransactionSummary[]>(`${this.baseUrl}/blocks/${blockId}/txs`)
      .then((response) => {
        const txs: TransactionDetail[] = [];
        for (const tx of response.data) {
          // get transaction detail
          this.getTxDetail(tx.txHash!).then((tx) => txs.push(tx.data as TransactionDetail));
        }
        return {
          data: txs,
          total: txs.length,
          totalPage: 1, // TODO
          currentPage: 1, // TODO
          lastUpdated: Date.now()
        } as ApiReturnType<TransactionDetail[]>;
      })
      .catch((error: AxiosError) => {
        return {
          data: [],
          error: error.message,
          lastUpdated: Date.now()
        } as ApiReturnType<TransactionDetail[]>;
      });
  }

  async getTransactions(
    blockId: number | string | undefined,
    pageInfo: ParsedUrlQuery
  ): Promise<ApiReturnType<Transaction[]>> {
    try {
      let transactionSummaries: TransactionSummary[] = [];
      if (blockId) {
        const response = await this.client.get<TransactionSummary[]>(`${this.baseUrl}/blocks/${blockId}/txs`, {
          params: pageInfo
        });
        transactionSummaries = response.data;
      } else {
        const txsResponse = await this.client.get<TransactionPage>(`${this.baseUrl}/txs`, {
          params: pageInfo
        });
        transactionSummaries = txsResponse.data.transactionSummaries!;
      }
      const transactions: Transaction[] = [];
      for (const txSummary of transactionSummaries) {
        const block = await this.getBlockDetail(txSummary.blockNumber!);
        const tx = transactionSummaryAndBlockToTransaction(txSummary, block);
        transactions.push(tx);
      }
      return {
        data: transactions,
        lastUpdated: Date.now()
      } as ApiReturnType<Transaction[]>;
    } catch (e) {
      return {
        data: [],
        error: "Couldn't fetch transactions",
        lastUpdated: Date.now()
      } as ApiReturnType<Transaction[]>;
    }
  }

  async getWalletStakeFromAddress(address: string): Promise<ApiReturnType<WalletStake>> {
    return this.client
      .get<StakeAccountInfo>(`${this.baseUrl}/accounts/${address}`)
      .then((stakeResponse) => {
        const stake = stakeResponse.data;
        return {
          data: {
            stakeAddress: stake.stakeAddress || "",
            totalStake: stake.controlledAmount || 0,
            rewardAvailable: stake.withdrawableAmount || 0,
            rewardWithdrawn: 0, // TODO
            status: "ACTIVE", // TODO
            pool: {
              poolId: stake.poolId || "",
              poolName: "",
              tickerName: ""
            }
          },
          error: null,
          lastUpdated: Date.now()
        } as ApiReturnType<WalletStake>;
      })
      .catch((error: AxiosError) => {
        return {
          data: null,
          error: error.message,
          lastUpdated: Date.now()
        } as ApiReturnType<WalletStake>;
      });
  }

  async getWalletAddressFromAddress(address: string): Promise<ApiReturnType<WalletAddress>> {
    return this.client
      .get<AddressBalanceDto>(`${this.baseUrl}/addresses/${address}/balance`)
      .then((addressBalanceResponse) => {
        const credential = paymentCredentialOf(address);
        const network: Network = process.env.REACT_APP_NETWORK as Network;
        const stakeAddress = credentialToRewardAddress(network, credential); // TODO need to implement to get the right network
        const addressBalance = addressBalanceResponse.data;

        const walletAddress = addressBalanceDtoToWalletAddress(addressBalance, stakeAddress, address);
        return {
          data: walletAddress,
          lastUpdated: Date.now()
        } as ApiReturnType<WalletAddress>;
      })
      .catch((error: AxiosError) => {
        return {
          data: null,
          error: error.message,
          lastUpdated: Date.now()
        } as ApiReturnType<WalletAddress>;
      });
  }

  async getEpochs(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<IDataEpoch[]>> {
    console.log("getEpochs pageInfo", pageInfo);
    return this.client
      .get<EpochsPage>(`${this.baseUrl}/epochs`, {
        params: pageInfo
      })
      .then((response) => {
        const epochs: IDataEpoch[] = response.data.epochs!.map((epoch) => {
          return epochToIEpochData(epoch);
        });
        return {
          data: epochs,
          totalPage: response.data.totalPages || 0,
          total: response.data.total || 0,
          lastUpdated: Date.now()
        } as ApiReturnType<IDataEpoch[]>;
      })
      .catch((error: AxiosError) => {
        return {
          data: [],
          error: error.message,
          lastUpdated: Date.now()
        } as ApiReturnType<IDataEpoch[]>;
      });
  }

  async getEpoch(epochId: number): Promise<ApiReturnType<IDataEpoch>> {
    return this.client
      .get<Epoch>(`${this.baseUrl}/epochs/${epochId}`)
      .then((response) => {
        return {
          data: epochToIEpochData(response.data),
          lastUpdated: Date.now()
        } as ApiReturnType<IDataEpoch>;
      })
      .catch((error: AxiosError) => {
        return {
          data: null,
          error: error.message,
          lastUpdated: Date.now()
        } as ApiReturnType<IDataEpoch>;
      });
  }

  async getStakeAddressRegistrations(stakeAddressAction: StakeAddressAction): Promise<ApiReturnType<IStakeKey[]>> {
    try {
      let stakeRegistrationDetails: StakeRegistrationDetail[] = [];
      if (stakeAddressAction === StakeAddressAction.REGISTRATION) {
        const response = await this.client.get<StakeRegistrationDetail[]>(`${this.baseUrl}/stake/registrations`);
        stakeRegistrationDetails = response.data;
      } else if (stakeAddressAction === StakeAddressAction.DEREGISTRATION) {
        const response = await this.client.get<StakeRegistrationDetail[]>(`${this.baseUrl}/stake/deregistrations`);
        stakeRegistrationDetails = response.data;
      } else {
        throw new Error("Invalid StakeAddressAction");
      }
      let iStakeKeys = stakeRegistrationDetails.map((stakeDetail) => {
        return stakeRegistrationDetailToIStakeKey(stakeDetail);
      });
      return {
        data: iStakeKeys,
        lastUpdated: Date.now()
      } as ApiReturnType<IStakeKey[]>;
    } catch (e) {
      console.error("Error fetching stakeAddressRegistrations");
      return {
        data: [],
        error: "Couldn't fetch stakeAddressRegistrations",
        lastUpdated: Date.now()
      } as ApiReturnType<IStakeKey[]>;
    }
  }

  async getStakeDelegations(): Promise<ApiReturnType<IStakeKey[]>> {
    return this.client
      .get<Delegation[]>(`${this.baseUrl}/stake/delegations`)
      .then((response) => {
        let iStakeKeys = response.data.map((stakeDetail) => {
          return delegationToIStakeKey(stakeDetail);
        });
        return {
          data: iStakeKeys,
          lastUpdated: Date.now()
        } as ApiReturnType<IStakeKey[]>;
      })
      .catch((error: AxiosError) => {
        return {
          data: [],
          error: error.message,
          lastUpdated: Date.now()
        } as ApiReturnType<IStakeKey[]>;
      });
  }

  async getPoolRegistrations(type: POOL_TYPE): Promise<ApiReturnType<Registration[]>> {
    try {
      let registrations: Registration[];
      if (type === POOL_TYPE.REGISTRATION) {
        const response = await this.client.get<PoolRegistration[]>(`${this.baseUrl}/pools/registrations`);
        registrations = await poolRegistrationsToRegistrations(response.data);
      } else {
        const response = await this.client.get<PoolRetirement[]>(`${this.baseUrl}/pools/retirements`);
        registrations = poolRetirementsToRegistrations(response.data);
      }
      return {
        data: registrations,
        lastUpdated: Date.now()
      } as ApiReturnType<Registration[]>;
    } catch (e) {
      return {
        data: [],
        error: "Couldn't fetch poolRegistrations",
        lastUpdated: Date.now()
      } as ApiReturnType<Registration[]>;
    }
  }

  async getCurrentProtocolParameters(): Promise<ApiReturnType<TProtocolParam>> {
    return this.client
      .get<ProtocolParamsDto>(`${this.baseUrl}/epochs/latest/parameters`)
      .then((response) => {
        return {
          data: protocolParamsToTProtocolParam(response.data),
          lastUpdated: Date.now()
        } as ApiReturnType<TProtocolParam>;
      })
      .catch((error: AxiosError) => {
        return {
          data: null,
          error: error.message,
          lastUpdated: Date.now()
        } as ApiReturnType<TProtocolParam>;
      });
  }

  async getDreps(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Drep[]>> {
    return this.client
      .get<DRepPage>(`${this.baseUrl}/governance/dreps`, {
        params: pageInfo
      })
      .then((response) => {
        return {
          data: drepRegistrationsToDreps(response.data.dreps!),
          total: response.data.total,
          totalPage: response.data.totalPages,
          lastUpdated: Date.now()
        } as ApiReturnType<Drep[]>;
      })
      .catch((error: AxiosError) => {
        return {
          data: [],
          error: error.message,
          lastUpdated: Date.now()
        } as ApiReturnType<Drep[]>;
      });
  }

  async getDrepOverview(drepId: string): Promise<ApiReturnType<DrepOverview>> {
    return this.client
      .get<DRepDto>(`${this.baseUrl}/governance/dreps/${drepId}`)
      .then((response) => {
        return {
          data: dRepDtoToDrepOverview(response.data),
          lastUpdated: Date.now()
        } as ApiReturnType<DrepOverview>;
      })
      .catch((error: AxiosError) => {
        return {
          data: null,
          error: error.message,
          lastUpdated: Date.now()
        } as ApiReturnType<DrepOverview>;
      });
  }
}
