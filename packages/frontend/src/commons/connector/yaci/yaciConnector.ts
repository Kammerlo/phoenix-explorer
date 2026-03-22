import axios, { AxiosError, AxiosInstance } from "axios";

import { ApiConnector, StakeAddressAction } from "../ApiConnector";
import {
  AddressBalanceDto,
  AddressTransaction,
  BlockDto,
  BlocksPage,
  Delegation,
  Epoch,
  EpochsPage,
  GovActionProposal,
  PoolRegistration,
  PoolRetirement,
  ProtocolParamsDto,
  StakeAccountInfo,
  StakeRegistrationDetail,
  TransactionDetails,
  TransactionPage,
  TransactionSummary,
  TxMetadataLabelDto,
  VotingProcedureDto
} from "./types";
import applyCaseMiddleware from "axios-case-converter";
import { FunctionEnum, POOL_TYPE } from "../types/FunctionEnum";
import { epochToIEpochData } from "./mapper/EpochToIEpochData";
import { poolRegistrationsToRegistrations } from "./mapper/PoolRegistrationsToRegistrations";
import { poolRetirementsToRegistrations } from "./mapper/PoolRetirementsToRegistrations";
import { blockDTOToBlock } from "./mapper/BlockDTOToBlock";
import { toTransactionDetail } from "./mapper/ToTransactionDetails";
import { transactionSummaryAndBlockToTransaction } from "./mapper/TransactionSummaryAndBlockToTransaction";
import { delegationToIStakeKey } from "./mapper/DelegationToIStakeKey";
import { stakeRegistrationDetailToIStakeKey } from "./mapper/StakeRegistrationDetailToIStakeKey";
// @ts-ignore
import { TProtocolParam } from "../../../types/protocol";
import { protocolParamsToTProtocolParam } from "./mapper/ProtocolParamsToTProtocolParam";
// @ts-ignore
import { ParsedUrlQuery } from "querystring";
import { Block } from "@shared/dtos/block.dto";
import { ApiReturnType } from "@shared/APIReturnType";
import { EpochOverview } from "@shared/dtos/epoch.dto";
import { Transaction, TransactionDetail } from "@shared/dtos/transaction.dto";
import { ITokenOverview, TokenHolder } from "@shared/dtos/token.dto";
import { GovActionVote, GovernanceActionDetail, GovernanceActionListItem } from "@shared/dtos/GovernanceOverview";
import { AddressDetail, StakeAddressDetail } from "@shared/dtos/address.dto";
import { PoolDetail, PoolOverview } from "@shared/dtos/pool.dto";
import { Drep, DrepDelegates } from "@shared/dtos/drep.dto";
import { addressBalanceDtoToWalletAddress } from "./mapper/AddressBalanceDtoToWalletAddress";

/**
 * This ApiConnector implementation uses the YACI API to fetch data.
 * It is using axios for HTTP Requests, this is only working for non secured environements.
 */
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
      FunctionEnum.TOKENS,
      FunctionEnum.GOVERNANCE,
      FunctionEnum.DREP,
      FunctionEnum.POOL
    ];
  }

  /** Batch-fetch pool names for unique slot leaders and mutate blocks in-place. */
  private async _enrichBlocksWithPoolNames(blocks: Block[]): Promise<void> {
    const uniqueLeaders = [...new Set(blocks.map((b) => b.slotLeader).filter(Boolean))] as string[];
    if (uniqueLeaders.length === 0) return;
    const poolNames = new Map<string, { name: string; ticker: string }>();
    await Promise.all(
      uniqueLeaders.map(async (leader) => {
        try {
          const resp = await this.client.get<any>(`${this.baseUrl}/pools/${leader}`);
          const p = resp.data;
          poolNames.set(leader, {
            name: p.metadata?.name || p.poolId || leader,
            ticker: p.metadata?.ticker || ""
          });
        } catch { /* no metadata or pool not found */ }
      })
    );
    blocks.forEach((b) => {
      if (b.slotLeader && poolNames.has(b.slotLeader)) {
        const info = poolNames.get(b.slotLeader)!;
        b.poolName = info.name;
        b.poolTicker = info.ticker;
      }
    });
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
      await this._enrichBlocksWithPoolNames(blocks);

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
      await this._enrichBlocksWithPoolNames(blocks);
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

  async getEpochs(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<EpochOverview[]>> {
    return this.client
      .get<EpochsPage>(`${this.baseUrl}/epochs`, {
        params: pageInfo
      })
      .then((response) => {
        const epochs: EpochOverview[] = response.data.epochs!.map((epoch) => {
          return epochToIEpochData(epoch);
        });
        return {
          data: epochs,
          totalPage: response.data.totalPages || 0,
          total: response.data.total || 0,
          lastUpdated: Date.now()
        } as ApiReturnType<EpochOverview[]>;
      })
      .catch((error: AxiosError) => {
        return {
          data: [],
          error: error.message,
          lastUpdated: Date.now()
        } as ApiReturnType<EpochOverview[]>;
      });
  }

  async getEpoch(epochId: number): Promise<ApiReturnType<EpochOverview>> {
    return this.client
      .get<Epoch>(`${this.baseUrl}/epochs/${epochId}`)
      .then((response) => {
        return {
          data: epochToIEpochData(response.data),
          lastUpdated: Date.now()
        } as ApiReturnType<EpochOverview>;
      })
      .catch((error: AxiosError) => {
        return {
          data: null,
          error: error.message,
          lastUpdated: Date.now()
        } as ApiReturnType<EpochOverview>;
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

  async getWalletAddressFromAddress(address: string): Promise<ApiReturnType<AddressDetail>> {
    try {
      const balanceResponse = await this.client.get<AddressBalanceDto>(`${this.baseUrl}/addresses/${address}`);
      let stakeAddress = "";
      try {
        const stakeResp = await this.client.get<{ stakeAddress?: string }>(`${this.baseUrl}/addresses/${address}/stake`);
        stakeAddress = stakeResp.data?.stakeAddress || "";
      } catch { /* stake address may not exist */ }
      const walletAddress = addressBalanceDtoToWalletAddress(balanceResponse.data, stakeAddress, address);
      return { data: walletAddress as unknown as AddressDetail, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  async getAddressTxsFromAddress(address: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    try {
      const response = await this.client.get<AddressTransaction[]>(`${this.baseUrl}/addresses/${address}/txs`, {
        params: pageInfo
      });
      const transactions: Transaction[] = [];
      for (const atx of response.data ?? []) {
        if (!atx.txHash) continue;
        try {
          const block = await this.getBlockDetail(atx.blockNumber!);
          const txSummary = { txHash: atx.txHash, blockNumber: atx.blockNumber, blockTime: atx.blockTime };
          transactions.push(transactionSummaryAndBlockToTransaction(txSummary as TransactionSummary, block));
        } catch { /* skip tx on error */ }
      }
      return { data: transactions, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getTokensPage(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<ITokenOverview[]>> {
    try {
      const response = await this.client.get<{ assetList?: YaciAsset[]; total?: number; totalPages?: number }>(
        `${this.baseUrl}/assets`, { params: pageInfo }
      );
      const tokens: ITokenOverview[] = (response.data.assetList ?? []).map(yaciAssetToTokenOverview);
      return { data: tokens, total: response.data.total, totalPage: response.data.totalPages, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getTokenDetail(tokenId: string): Promise<ApiReturnType<ITokenOverview>> {
    try {
      const response = await this.client.get<YaciAsset>(`${this.baseUrl}/assets/${tokenId}`);
      return { data: yaciAssetToTokenOverview(response.data), lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  async getTokenTransactions(tokenId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    try {
      const response = await this.client.get<{ transactions?: { txHash: string; blockNumber?: number; blockTime?: number }[]; total?: number }>(
        `${this.baseUrl}/assets/${tokenId}/transactions`, { params: pageInfo }
      );
      const txs: Transaction[] = [];
      for (const t of response.data.transactions ?? []) {
        if (!t.txHash) continue;
        try {
          const block = await this.getBlockDetail(t.blockNumber!);
          txs.push(transactionSummaryAndBlockToTransaction({ txHash: t.txHash, blockNumber: t.blockNumber, blockTime: t.blockTime } as TransactionSummary, block));
        } catch { /* skip */ }
      }
      return { data: txs, total: response.data.total, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getTokenHolders(tokenId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<TokenHolder[]>> {
    try {
      const response = await this.client.get<{ addressList?: { address?: string; quantity?: number }[]; total?: number }>(
        `${this.baseUrl}/assets/${tokenId}/addresses`, { params: pageInfo }
      );
      const total = response.data.total ?? response.data.addressList?.length ?? 0;
      const holders: TokenHolder[] = (response.data.addressList ?? []).map((h) => ({
        address: h.address ?? "",
        amount: h.quantity ?? 0,
        ratio: total > 0 ? (h.quantity ?? 0) / total : 0
      }));
      return { data: holders, total, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getTokensByPolicy(policyId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<ITokenOverview[]>> {
    try {
      const response = await this.client.get<{ assetList?: YaciAsset[]; total?: number }>(
        `${this.baseUrl}/assets/policy/${policyId}`, { params: pageInfo }
      );
      const tokens: ITokenOverview[] = (response.data.assetList ?? []).map(yaciAssetToTokenOverview);
      return { data: tokens, total: response.data.total ?? tokens.length, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getGovernanceOverviewList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>> {
    try {
      const response = await this.client.get<{ govActionProposalList?: GovActionProposal[]; total?: number; totalPages?: number }>(
        `${this.baseUrl}/governance/gov_action_proposals`, { params: pageInfo }
      );
      const items: GovernanceActionListItem[] = (response.data.govActionProposalList ?? []).map((p) => ({
        txHash: p.txHash ?? "",
        index: p.index ?? 0,
        type: p.type
      }));
      return { data: items, total: response.data.total, totalPage: response.data.totalPages, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getGovernanceDetail(txHash: string, index: string): Promise<ApiReturnType<GovernanceActionDetail>> {
    try {
      const response = await this.client.get<GovActionProposal>(
        `${this.baseUrl}/governance/gov_action_proposals/${txHash}/${index}`
      );
      const p = response.data;
      const detail: GovernanceActionDetail = {
        txHash: p.txHash ?? txHash,
        index: String(p.index ?? index),
        dateCreated: p.blockTime ? new Date(p.blockTime * 1000).toISOString() : "",
        actionType: p.type ?? "",
        status: "ACTIVE",
        expiredEpoch: null,
        enactedEpoch: null,
        motivation: null,
        rationale: null,
        title: null,
        authors: null,
        abstract: null,
        votesStats: { drep: { yes: 0, no: 0, abstain: 0 }, spo: { yes: 0, no: 0, abstain: 0 }, committee: { yes: 0, no: 0, abstain: 0 } }
      };
      return { data: detail, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  async getGovernanceActionVotes(txHash: string, index: string): Promise<ApiReturnType<GovActionVote[]>> {
    try {
      const response = await this.client.get<VotingProcedureDto[]>(
        `${this.baseUrl}/governance/voting_procedures`,
        { params: { govActionTxHash: txHash, govActionIndex: index } }
      );
      const votes: GovActionVote[] = (response.data ?? []).map((v) => ({
        voter: v.voterHash ?? "",
        voterType: mapVoterType(v.voterType),
        vote: (v.vote?.toLowerCase() ?? "abstain") as "yes" | "no" | "abstain",
        txHash: v.txHash ?? "",
        certIndex: v.index ?? 0,
        voteTime: v.blockTime ? new Date(v.blockTime * 1000).toISOString() : ""
      }));
      return { data: votes, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getPoolList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<PoolOverview[]>> {
    try {
      const response = await this.client.get<{ poolList?: YaciPool[]; total?: number; totalPages?: number }>(
        `${this.baseUrl}/pools`, { params: pageInfo }
      );
      const pools: PoolOverview[] = (response.data.poolList ?? []).map((p, i) => ({
        id: i,
        poolId: p.poolIdBech32 ?? p.poolId ?? "",
        poolName: p.metadata?.name ?? p.poolId ?? "",
        tickerName: p.metadata?.ticker ?? "",
        poolSize: 0,
        declaredPledge: p.pledge ?? 0,
        saturation: 0,
        lifetimeBlock: 0
      }));
      return { data: pools, total: response.data.total, totalPage: response.data.totalPages, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getPoolDetail(poolId: string): Promise<ApiReturnType<PoolDetail>> {
    try {
      const response = await this.client.get<YaciPool>(`${this.baseUrl}/pools/${poolId}`);
      const p = response.data;
      const detail: PoolDetail = {
        poolName: p.metadata?.name ?? p.poolId ?? poolId,
        tickerName: p.metadata?.ticker ?? "",
        poolView: p.poolIdBech32 ?? poolId,
        poolStatus: "ACTIVE" as any,
        createDate: "",
        rewardAccounts: p.rewardAccount ? [p.rewardAccount] : [],
        ownerAccounts: p.owners ?? [],
        poolSize: 0,
        stakeLimit: 0,
        delegators: 0,
        saturation: 0,
        totalBalanceOfPoolOwners: 0,
        reward: 0,
        ros: 0,
        pledge: p.pledge ?? 0,
        cost: p.cost ?? 0,
        margin: p.margin ?? 0,
        epochBlock: 0,
        lifetimeBlock: 0,
        description: p.metadata?.description ?? "",
        homepage: p.metadata?.homepage ?? ""
      };
      return { data: detail, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  async getDreps(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Drep[]>> {
    try {
      const response = await this.client.get<{ drepList?: YaciDrep[]; total?: number; totalPages?: number }>(
        `${this.baseUrl}/governance/dreps`, { params: pageInfo }
      );
      const dreps: Drep[] = (response.data.drepList ?? []).map(yaciDrepToDrep);
      return { data: dreps, total: response.data.total, totalPage: response.data.totalPages, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getDrep(drepId: string): Promise<ApiReturnType<Drep>> {
    try {
      const response = await this.client.get<YaciDrep>(`${this.baseUrl}/governance/dreps/${drepId}`);
      return { data: yaciDrepToDrep(response.data), lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  async getDrepVotes(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>> {
    try {
      const response = await this.client.get<{ votingProcedures?: VotingProcedureDto[]; total?: number }>(
        `${this.baseUrl}/governance/dreps/${drepId}/voting_procedures`, { params: pageInfo }
      );
      const items: GovernanceActionListItem[] = (response.data.votingProcedures ?? []).map((v) => ({
        txHash: v.govActionTxHash ?? "",
        index: v.govActionIndex ?? 0,
        vote: (v.vote?.toLowerCase() ?? "abstain") as "yes" | "no" | "abstain"
      }));
      return { data: items, total: response.data.total, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getDrepDelegates(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<DrepDelegates[]>> {
    try {
      const response = await this.client.get<{ delegatorList?: { address?: string; amount?: number; stakeKeyHash?: string }[]; total?: number }>(
        `${this.baseUrl}/governance/dreps/${drepId}/delegators`, { params: pageInfo }
      );
      const delegates: DrepDelegates[] = (response.data.delegatorList ?? []).map((d) => ({
        address: d.address ?? "",
        amount: d.amount ?? 0,
        stakeKeyHash: d.stakeKeyHash
      }));
      return { data: delegates, total: response.data.total, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }
}

// ── Helper types ──────────────────────────────────────────────────────────────

interface YaciAsset {
  unit?: string;
  policyId?: string;
  assetName?: string;
  fingerprint?: string;
  quantity?: string;
  mintTxCount?: number;
  onchainMetadata?: Record<string, unknown>;
  metadata?: { ticker?: string; description?: string; url?: string; logo?: string; decimals?: number };
}

interface YaciPool {
  poolId?: string;
  poolIdBech32?: string;
  pledge?: number;
  cost?: number;
  margin?: number;
  rewardAccount?: string;
  owners?: string[];
  metadata?: { name?: string; ticker?: string; description?: string; homepage?: string };
}

interface YaciDrep {
  drepId?: string;
  drepHash?: string;
  anchorUrl?: string;
  anchorHash?: string;
  status?: string;
  activeVoteStake?: number;
  votingPower?: number;
  delegators?: number;
  givenName?: string;
  createdAt?: string;
}

// ── Helper functions ──────────────────────────────────────────────────────────

function yaciAssetToTokenOverview(a: YaciAsset): ITokenOverview {
  return {
    name: a.assetName ?? a.unit ?? "",
    displayName: a.onchainMetadata?.name as string ?? a.assetName ?? a.unit ?? "",
    policy: a.policyId ?? (a.unit ? a.unit.slice(0, 56) : ""),
    fingerprint: a.fingerprint ?? "",
    txCount: a.mintTxCount ?? 0,
    supply: a.quantity ? Number(a.quantity) : 0,
    metadata: a.metadata ? {
      ticker: a.metadata.ticker,
      description: a.metadata.description,
      url: a.metadata.url,
      logo: a.metadata.logo,
      decimals: a.metadata.decimals
    } : undefined
  };
}

function yaciDrepToDrep(d: YaciDrep): Drep {
  return {
    drepId: d.drepId ?? "",
    drepHash: d.drepHash ?? "",
    anchorUrl: d.anchorUrl ?? "",
    anchorHash: d.anchorHash ?? "",
    status: (d.status?.toUpperCase() ?? "ACTIVE") as "ACTIVE" | "INACTIVE" | "RETIRED",
    activeVoteStake: d.activeVoteStake ?? 0,
    votingPower: d.votingPower ?? 0,
    delegators: d.delegators ?? 0,
    givenName: d.givenName ?? d.drepId ?? "",
    createdAt: d.createdAt,
    votes: { total: 0, abstain: 0, no: 0, yes: 0 }
  };
}

function mapVoterType(voterType?: string): "constitutional_committee" | "drep" | "spo" {
  if (!voterType) return "drep";
  if (voterType.includes("CONSTITUTIONAL")) return "constitutional_committee";
  if (voterType.includes("STAKING_POOL")) return "spo";
  return "drep";
}
