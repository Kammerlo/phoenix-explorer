import axios, { AxiosInstance } from "axios";

import { StakeAddressAction } from "../ApiConnector";
import { ConnectorBase } from "../ConnectorBase";
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
import { SearchResult } from "@shared/dtos/seach.dto";
import { DashboardStats } from "@shared/dtos/dashboard.dto";
import { addressBalanceDtoToWalletAddress } from "./mapper/AddressBalanceDtoToWalletAddress";

/**
 * Connector for Yaci Store (https://github.com/bloxbean/yaci-store) — a local /
 * devnet-friendly Cardano indexer. Uses axios with case conversion so Yaci's
 * snake_case fields arrive camelCased to our mappers.
 */
export class YaciConnector extends ConnectorBase {
  client: AxiosInstance;

  constructor(baseUrl: string) {
    super(baseUrl);
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
    return this.requestList<Block>(async () => {
      const response = await this.client.get<BlocksPage>(`${this.baseUrl}/blocks`, {
        params: pageInfo
      });
      const blocks = (response.data.blocks ?? []).map(blockDTOToBlock);
      await this._enrichBlocksWithPoolNames(blocks);
      return {
        data: blocks,
        extras: { total: response.data.total, totalPage: response.data.totalPages }
      };
    });
  }

  async getBlocksByEpoch(epoch: number, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>> {
    return this.requestList<Block>(async () => {
      const response = await this.client.get<BlocksPage>(`${this.baseUrl}/blocks/epoch/${epoch}`, {
        params: pageInfo
      });
      const blocks = (response.data.blocks ?? []).map(blockDTOToBlock);
      await this._enrichBlocksWithPoolNames(blocks);
      return {
        data: blocks,
        extras: { total: response.data.total, totalPage: response.data.totalPages }
      };
    });
  }

  async getBlockDetail(blockId: string): Promise<ApiReturnType<Block>> {
    if (!blockId) return this.unsupported<Block>("getBlockDetail");
    return this.request<Block>(async () => {
      const response = await this.client.get<BlockDto>(`${this.baseUrl}/blocks/${blockId}`);
      return blockDTOToBlock(response.data);
    });
  }

  async getTxDetail(txHash: string): Promise<ApiReturnType<TransactionDetail>> {
    return this.request<TransactionDetail>(async () => {
      const txDetails = (await this.client.get<TransactionDetails>(`${this.baseUrl}/txs/${txHash}`)).data;
      const [blockResult, metadataResponse] = await Promise.all([
        this.getBlockDetail(String(txDetails.blockHeight ?? "")),
        this.client.get<TxMetadataLabelDto[]>(`${this.baseUrl}/txs/${txHash}/metadata`)
      ]);
      return toTransactionDetail(txDetails, blockResult.data, metadataResponse.data);
    });
  }

  async getTransactions(
    blockId: number | string | undefined,
    pageInfo: ParsedUrlQuery
  ): Promise<ApiReturnType<Transaction[]>> {
    return this.requestList<Transaction>(async () => {
      let summaries: TransactionSummary[];
      let total: number | undefined;
      let totalPage: number | undefined;
      if (blockId) {
        const r = await this.client.get<TransactionSummary[]>(`${this.baseUrl}/blocks/${blockId}/txs`, { params: pageInfo });
        summaries = r.data ?? [];
      } else {
        const r = await this.client.get<TransactionPage>(`${this.baseUrl}/txs`, { params: pageInfo });
        summaries = r.data.transactionSummaries ?? [];
        total = r.data.total;
        totalPage = r.data.totalPages;
      }
      const blockNumbers = [...new Set(summaries.map((s) => s.blockNumber!).filter(Boolean))];
      const blockMap = new Map<number, Awaited<ReturnType<typeof this.getBlockDetail>>>();
      await Promise.all(blockNumbers.map(async (n) => blockMap.set(n, await this.getBlockDetail(String(n)))));
      const transactions = summaries.map((s) =>
        transactionSummaryAndBlockToTransaction(s, blockMap.get(s.blockNumber!) ?? { data: null, lastUpdated: Date.now() })
      );
      return {
        data: transactions,
        extras: { total, totalPage }
      };
    });
  }

  async getWalletStakeFromAddress(address: string): Promise<ApiReturnType<StakeAddressDetail>> {
    return this.request<StakeAddressDetail>(async () => {
      const stake = (await this.client.get<StakeAccountInfo>(`${this.baseUrl}/accounts/${address}`)).data;
      let poolInfo = { poolId: stake.poolId ?? "", poolName: "", tickerName: "" };
      if (stake.poolId) {
        try {
          const p = (await this.client.get<YaciPool>(`${this.baseUrl}/pools/${stake.poolId}`)).data;
          poolInfo = {
            poolId: stake.poolId,
            poolName: p.metadata?.name ?? "",
            tickerName: p.metadata?.ticker ?? ""
          };
        } catch { /* metadata unavailable */ }
      }
      return {
        stakeAddress: stake.stakeAddress ?? "",
        totalStake: stake.controlledAmount ?? 0,
        rewardAvailable: stake.withdrawableAmount ?? 0,
        rewardWithdrawn: 0,
        status: stake.poolId ? "ACTIVE" : "INACTIVE",
        pool: poolInfo
      };
    });
  }

  async getEpochs(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<EpochOverview[]>> {
    return this.requestList<EpochOverview>(async () => {
      const r = await this.client.get<EpochsPage>(`${this.baseUrl}/epochs`, { params: pageInfo });
      const epochs = (r.data.epochs ?? []).map(epochToIEpochData);
      return {
        data: epochs,
        extras: { total: r.data.total, totalPage: r.data.totalPages }
      };
    });
  }

  async getEpoch(epochId: number): Promise<ApiReturnType<EpochOverview>> {
    return this.request<EpochOverview>(async () => {
      const r = await this.client.get<Epoch>(`${this.baseUrl}/epochs/${epochId}`);
      return epochToIEpochData(r.data);
    });
  }

  async getStakeAddressRegistrations(stakeAddressAction: StakeAddressAction): Promise<ApiReturnType<IStakeKey[]>> {
    return this.requestList<IStakeKey>(async () => {
      const path = stakeAddressAction === StakeAddressAction.REGISTRATION
        ? "/stake/registrations"
        : "/stake/deregistrations";
      const r = await this.client.get<StakeRegistrationDetail[]>(`${this.baseUrl}${path}`);
      return { data: r.data.map(stakeRegistrationDetailToIStakeKey) };
    });
  }

  async getStakeDelegations(): Promise<ApiReturnType<IStakeKey[]>> {
    return this.requestList<IStakeKey>(async () => {
      const r = await this.client.get<Delegation[]>(`${this.baseUrl}/stake/delegations`);
      return { data: r.data.map(delegationToIStakeKey) };
    });
  }

  async getPoolRegistrations(type: POOL_TYPE): Promise<ApiReturnType<Registration[]>> {
    return this.requestList<Registration>(async () => {
      if (type === POOL_TYPE.REGISTRATION) {
        const r = await this.client.get<PoolRegistration[]>(`${this.baseUrl}/pools/registrations`);
        return { data: await poolRegistrationsToRegistrations(r.data) };
      }
      const r = await this.client.get<PoolRetirement[]>(`${this.baseUrl}/pools/retirements`);
      return { data: poolRetirementsToRegistrations(r.data) };
    });
  }

  async getCurrentProtocolParameters(): Promise<ApiReturnType<TProtocolParam>> {
    return this.request<TProtocolParam>(async () => {
      const r = await this.client.get<ProtocolParamsDto>(`${this.baseUrl}/epochs/latest/parameters`);
      return protocolParamsToTProtocolParam(r.data);
    });
  }

  async getWalletAddressFromAddress(address: string): Promise<ApiReturnType<AddressDetail>> {
    return this.request<AddressDetail>(async () => {
      const balance = (await this.client.get<AddressBalanceDto>(`${this.baseUrl}/addresses/${address}`)).data;
      let stakeAddress = "";
      try {
        const stakeResp = await this.client.get<{ stakeAddress?: string }>(`${this.baseUrl}/addresses/${address}/stake`);
        stakeAddress = stakeResp.data?.stakeAddress ?? "";
      } catch { /* stake address may not exist */ }
      return addressBalanceDtoToWalletAddress(balance, stakeAddress, address);
    });
  }

  async getAddressTxsFromAddress(address: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    return this.requestList<Transaction>(async () => {
      const r = await this.client.get<AddressTransaction[]>(`${this.baseUrl}/addresses/${address}/txs`, { params: pageInfo });
      const rows = r.data ?? [];
      const blockNumbers = [...new Set(rows.map((a) => a.blockNumber!).filter(Boolean))];
      const blockMap = new Map<number, Awaited<ReturnType<typeof this.getBlockDetail>>>();
      await Promise.all(blockNumbers.map(async (n) => blockMap.set(n, await this.getBlockDetail(String(n)))));
      const transactions = rows
        .filter((a) => a.txHash)
        .map((a) => transactionSummaryAndBlockToTransaction(
          { txHash: a.txHash, blockNumber: a.blockNumber, blockTime: a.blockTime } as TransactionSummary,
          blockMap.get(a.blockNumber!) ?? { data: null, lastUpdated: Date.now() }
        ));
      return { data: transactions };
    });
  }

  async getTokensPage(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<ITokenOverview[]>> {
    return this.requestList<ITokenOverview>(async () => {
      const r = await this.client.get<{ assetList?: YaciAsset[]; total?: number; totalPages?: number }>(
        `${this.baseUrl}/assets`, { params: pageInfo }
      );
      return {
        data: (r.data.assetList ?? []).map(yaciAssetToTokenOverview),
        extras: { total: r.data.total, totalPage: r.data.totalPages }
      };
    });
  }

  async getTokenDetail(tokenId: string): Promise<ApiReturnType<ITokenOverview>> {
    return this.request<ITokenOverview>(async () => {
      const r = await this.client.get<YaciAsset>(`${this.baseUrl}/assets/${tokenId}`);
      return yaciAssetToTokenOverview(r.data);
    });
  }

  async getTokenTransactions(tokenId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    return this.requestList<Transaction>(async () => {
      const r = await this.client.get<{ transactions?: { txHash: string; blockNumber?: number; blockTime?: number }[]; total?: number }>(
        `${this.baseUrl}/assets/${tokenId}/transactions`, { params: pageInfo }
      );
      const rows = r.data.transactions ?? [];
      const blockNumbers = [...new Set(rows.map((t) => t.blockNumber!).filter(Boolean))];
      const blockMap = new Map<number, Awaited<ReturnType<typeof this.getBlockDetail>>>();
      await Promise.all(blockNumbers.map(async (n) => blockMap.set(n, await this.getBlockDetail(String(n)))));
      const txs = rows
        .filter((t) => t.txHash)
        .map((t) => transactionSummaryAndBlockToTransaction(
          { txHash: t.txHash, blockNumber: t.blockNumber, blockTime: t.blockTime } as TransactionSummary,
          blockMap.get(t.blockNumber!) ?? { data: null, lastUpdated: Date.now() }
        ));
      return { data: txs, extras: { total: r.data.total } };
    });
  }

  async getTokenHolders(tokenId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<TokenHolder[]>> {
    return this.requestList<TokenHolder>(async () => {
      const r = await this.client.get<{ addressList?: { address?: string; quantity?: number }[]; total?: number }>(
        `${this.baseUrl}/assets/${tokenId}/addresses`, { params: pageInfo }
      );
      const total = r.data.total ?? r.data.addressList?.length ?? 0;
      const holders: TokenHolder[] = (r.data.addressList ?? []).map((h) => ({
        address: h.address ?? "",
        amount: h.quantity ?? 0,
        ratio: total > 0 ? (h.quantity ?? 0) / total : 0
      }));
      return { data: holders, extras: { total } };
    });
  }

  async getTokensByPolicy(policyId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<ITokenOverview[]>> {
    return this.requestList<ITokenOverview>(async () => {
      const r = await this.client.get<{ assetList?: YaciAsset[]; total?: number }>(
        `${this.baseUrl}/assets/policy/${policyId}`, { params: pageInfo }
      );
      const tokens = (r.data.assetList ?? []).map(yaciAssetToTokenOverview);
      return { data: tokens, extras: { total: r.data.total ?? tokens.length } };
    });
  }

  async getGovernanceOverviewList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>> {
    return this.requestList<GovernanceActionListItem>(async () => {
      const r = await this.client.get<{ proposalList?: GovActionProposal[]; govActionProposalList?: GovActionProposal[]; total?: number; totalPages?: number }>(
        `${this.baseUrl}/governance/proposals`, { params: pageInfo }
      );
      const list = r.data.proposalList ?? r.data.govActionProposalList ?? [];
      const items: GovernanceActionListItem[] = list.map((p) => ({
        txHash: p.txHash ?? "",
        index: p.index ?? 0,
        type: p.type,
        status: "ACTIVE" as const
      }));
      return { data: items, extras: { total: r.data.total, totalPage: r.data.totalPages } };
    });
  }

  async getGovernanceDetail(txHash: string, index: string): Promise<ApiReturnType<GovernanceActionDetail>> {
    return this.request<GovernanceActionDetail>(async () => {
      const p = (await this.client.get<GovActionProposal>(
        `${this.baseUrl}/governance/proposals/${txHash}/${index}`
      )).data;
      return {
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
    });
  }

  async getGovernanceActionVotes(txHash: string, index: string): Promise<ApiReturnType<GovActionVote[]>> {
    return this.requestList<GovActionVote>(async () => {
      const r = await this.client.get<VotingProcedureDto[]>(
        `${this.baseUrl}/governance/voting_procedures`,
        { params: { govActionTxHash: txHash, govActionIndex: index } }
      );
      const votes: GovActionVote[] = (r.data ?? []).map((v) => ({
        voter: v.voterHash ?? "",
        voterType: mapVoterType(v.voterType),
        vote: (v.vote?.toLowerCase() ?? "abstain") as "yes" | "no" | "abstain",
        txHash: v.txHash ?? "",
        certIndex: v.index ?? 0,
        voteTime: v.blockTime ? new Date(v.blockTime * 1000).toISOString() : ""
      }));
      return { data: votes };
    });
  }

  async getPoolList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<PoolOverview[]>> {
    return this.requestList<PoolOverview>(async () => {
      const r = await this.client.get<{ poolList?: YaciPool[]; total?: number; totalPages?: number }>(
        `${this.baseUrl}/pools`, { params: pageInfo }
      );
      const pools = (r.data.poolList ?? []).map((p, i) => ({
        id: i,
        poolId: p.poolIdBech32 ?? p.poolId ?? "",
        poolName: p.metadata?.name ?? p.poolId ?? "",
        tickerName: p.metadata?.ticker ?? "",
        poolSize: 0,
        declaredPledge: p.pledge ?? 0,
        saturation: 0,
        lifetimeBlock: 0
      } as PoolOverview));
      return { data: pools, extras: { total: r.data.total, totalPage: r.data.totalPages } };
    });
  }

  async getPoolDetail(poolId: string): Promise<ApiReturnType<PoolDetail>> {
    return this.request<PoolDetail>(async () => {
      const p = (await this.client.get<YaciPool>(`${this.baseUrl}/pools/${poolId}`)).data;
      return {
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
    });
  }

  async getDreps(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Drep[]>> {
    return this.requestList<Drep>(async () => {
      const r = await this.client.get<{ drepList?: YaciDrep[]; total?: number; totalPages?: number }>(
        `${this.baseUrl}/governance/dreps`, { params: pageInfo }
      );
      return {
        data: (r.data.drepList ?? []).map(yaciDrepToDrep),
        extras: { total: r.data.total, totalPage: r.data.totalPages }
      };
    });
  }

  async getDrep(drepId: string): Promise<ApiReturnType<Drep>> {
    return this.request<Drep>(async () => {
      const r = await this.client.get<YaciDrep>(`${this.baseUrl}/governance/dreps/${drepId}`);
      return yaciDrepToDrep(r.data);
    });
  }

  async getDrepVotes(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>> {
    return this.requestList<GovernanceActionListItem>(async () => {
      const r = await this.client.get<{ votingProcedures?: VotingProcedureDto[]; total?: number }>(
        `${this.baseUrl}/governance/dreps/${drepId}/voting_procedures`, { params: pageInfo }
      );
      const items: GovernanceActionListItem[] = (r.data.votingProcedures ?? []).map((v) => ({
        txHash: v.govActionTxHash ?? "",
        index: v.govActionIndex ?? 0,
        vote: (v.vote?.toLowerCase() ?? "abstain") as "yes" | "no" | "abstain"
      }));
      return { data: items, extras: { total: r.data.total } };
    });
  }

  async getDrepDelegates(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<DrepDelegates[]>> {
    return this.requestList<DrepDelegates>(async () => {
      const r = await this.client.get<{ delegatorList?: { address?: string; amount?: number; stakeKeyHash?: string }[]; total?: number }>(
        `${this.baseUrl}/governance/dreps/${drepId}/delegators`, { params: pageInfo }
      );
      const delegates: DrepDelegates[] = (r.data.delegatorList ?? []).map((d) => ({
        address: d.address ?? "",
        amount: d.amount ?? 0,
        stakeKeyHash: d.stakeKeyHash
      }));
      return { data: delegates, extras: { total: r.data.total } };
    });
  }

  async search(query: string): Promise<ApiReturnType<SearchResult[]>> {
    const q = query.trim();
    if (!q || q.length < 2) return { data: [], lastUpdated: Date.now(), total: 0 };

    const probe = async <T>(fn: () => Promise<T>): Promise<T | null> => {
      try { return await fn(); } catch { return null; }
    };

    const results: SearchResult[] = [];

    // Governance action: {64hex}#{index}
    const govMatch = /^([0-9a-f]{64})#(\d+)$/i.exec(q);
    if (govMatch) {
      const [, txHash, indexStr] = govMatch;
      const [govResult, txResult] = await Promise.all([
        probe(() => this.client.get(`${this.baseUrl}/governance/proposals/${txHash}/${indexStr}`)),
        probe(() => this.client.get(`${this.baseUrl}/txs/${txHash}`)),
      ]);
      if (govResult) results.push({ type: "gov_action", id: txHash, extraId: indexStr });
      else if (txResult) results.push({ type: "transaction", id: txHash });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // 64-char hex: transaction hash OR block hash
    if (/^[0-9a-f]{64}$/i.test(q)) {
      const [txResult, blockResult] = await Promise.all([
        probe(() => this.client.get<any>(`${this.baseUrl}/txs/${q}`)),
        probe(() => this.client.get<BlockDto>(`${this.baseUrl}/blocks/${q}`)),
      ]);
      if (txResult) results.push({ type: "transaction", id: q });
      if (blockResult) results.push({ type: "block", id: q, label: blockResult.data?.number != null ? String(blockResult.data.number) : undefined });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // 56-char hex: policy ID
    if (/^[0-9a-f]{56}$/i.test(q)) {
      const policyResult = await probe(() => this.client.get<{ assetList?: unknown[] }>(`${this.baseUrl}/assets/policy/${q}`, { params: { page: 0, size: 1 } }));
      if (policyResult?.data?.assetList && policyResult.data.assetList.length > 0) {
        results.push({ type: "policy", id: q });
      }
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // addr1... payment address — format-valid bech32
    if (/^addr1[a-z0-9]+$/i.test(q)) {
      results.push({ type: "address", id: q });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // stake1... stake address — format-valid bech32
    if (/^stake1[a-z0-9]+$/i.test(q)) {
      results.push({ type: "stake", id: q });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // pool1... stake pool
    if (/^pool1[a-z0-9]{50,}$/i.test(q)) {
      const poolResult = await probe(() => this.client.get<any>(`${this.baseUrl}/pools/${q}`));
      if (poolResult) {
        const label: string | undefined = poolResult.data?.metadata?.ticker ?? poolResult.data?.metadata?.name ?? undefined;
        results.push({ type: "pool", id: q, label });
      }
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // drep1... DRep
    if (/^drep1[a-z0-9]+$/i.test(q)) {
      const drepResult = await probe(() => this.client.get(`${this.baseUrl}/governance/dreps/${q}`));
      if (drepResult) results.push({ type: "drep", id: q });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // asset1... token fingerprint
    if (/^asset1[a-z0-9]+$/i.test(q)) {
      const assetResult = await probe(() => this.client.get<YaciAsset>(`${this.baseUrl}/assets/${q}`));
      if (assetResult) {
        const label: string | undefined = assetResult.data?.metadata?.ticker ?? (assetResult.data?.onchainMetadata?.name as string | undefined) ?? undefined;
        results.push({ type: "token", id: q, label });
      }
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // Pure number: epoch or block
    if (/^\d+$/.test(q)) {
      const n = Number(q);
      const [epochResult, blockResult] = await Promise.all([
        probe(() => this.client.get<any>(`${this.baseUrl}/epochs/${n}`)),
        probe(() => this.client.get<BlockDto>(`${this.baseUrl}/blocks/${n}`)),
      ]);
      if (epochResult) results.push({ type: "epoch", id: q });
      if (blockResult) results.push({ type: "block", id: q, label: String(n) });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // Free-text: use Yaci's native asset name search
    if (/^[a-zA-Z0-9$.\-_ ]+$/.test(q)) {
      const tokenResult = await probe(() =>
        this.client.get<{ assetList?: YaciAsset[] }>(
          `${this.baseUrl}/assets`,
          { params: { search: q, size: 5, page: 0 } }
        )
      );
      for (const asset of tokenResult?.data?.assetList ?? []) {
        const overview = yaciAssetToTokenOverview(asset);
        const id = overview.fingerprint || asset.unit || "";
        if (!id) continue;
        const label = overview.displayName || overview.metadata?.ticker || q;
        results.push({ type: "token", id, label });
        if (results.length >= 5) break;
      }
    }

    return { data: results, lastUpdated: Date.now(), total: results.length };
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
