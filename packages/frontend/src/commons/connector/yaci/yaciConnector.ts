import axios, { AxiosInstance } from "axios";

import { StakeAddressAction } from "../ApiConnector";
import { ConnectorBase } from "../ConnectorBase";
import {
  AddressTransaction,
  AssetTransaction,
  BlockDto,
  BlocksPage,
  Delegation,
  DelegationVote,
  Epoch,
  FingerprintSupply,
  GovActionProposal,
  PoolBlock,
  PoolRegistration,
  PoolRetirement,
  ProtocolParamsDto,
  StakeRegistrationDetail,
  TransactionDetails,
  TransactionPage,
  TransactionSummary,
  TxAsset,
  TxInputsOutputs,
  TxMetadataLabelDto,
  VotingProcedureDto,
  Withdrawal
} from "./types";
import applyCaseMiddleware from "axios-case-converter";
import { POOL_TYPE } from "../types/FunctionEnum";
import { Capability } from "../types/Capability";
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
import { Transaction, TransactionDetail } from "@shared/dtos/transaction.dto";
import { ITokenOverview } from "@shared/dtos/token.dto";
import { GovActionVote, GovernanceActionDetail, GovernanceActionListItem } from "@shared/dtos/GovernanceOverview";
import { DrepDelegates } from "@shared/dtos/drep.dto";
import { SearchResult } from "@shared/dtos/seach.dto";
import { DashboardStats } from "@shared/dtos/dashboard.dto";

interface YaciAssetDto {
  unit?: string;
  policyId?: string;
  assetName?: string;
  fingerprint?: string;
  totalSupply?: string;
  initialMintTxHash?: string;
  mintOrBurnCount?: number;
  onchainMetadata?: Record<string, unknown>;
  metadata?: {
    ticker?: string;
    description?: string;
    url?: string;
    logo?: string;
    decimals?: number;
  };
}

function yaciAssetToTokenOverview(a: YaciAssetDto): ITokenOverview {
  return {
    name: a.assetName ?? a.unit ?? "",
    displayName: (a.onchainMetadata?.name as string) ?? a.assetName ?? a.unit ?? "",
    policy: a.policyId ?? (a.unit ? a.unit.slice(0, 56) : ""),
    fingerprint: a.fingerprint ?? "",
    txCount: a.mintOrBurnCount ?? 0,
    supply: a.totalSupply ? Number(a.totalSupply) : 0,
    metadata: a.metadata ? {
      ticker: a.metadata.ticker,
      description: a.metadata.description,
      url: a.metadata.url,
      logo: a.metadata.logo,
      decimals: a.metadata.decimals
    } : undefined
  };
}

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
    // A failed Yaci request with no HTTP response is almost always the browser
    // blocking a cross-origin/local call (CORS, or Chrome's "Allow local network"
    // prompt for a public site → localhost). Those are opaque to JS, so surface a
    // useful hint instead of a bare "Network Error".
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error && !error.response) {
          error.message =
            `Could not reach the Yaci Store at ${this.baseUrl}. ` +
            `If this is a local devnet, your browser may be blocking it (CORS, or Chrome's ` +
            `"Allow local network" prompt). See docs/local-development.md → "Yaci DevKit".`;
        }
        return Promise.reject(error);
      }
    );
  }
  getCapabilities(): ReadonlySet<Capability> {
    return new Set<Capability>([
      "getBlocksPage",
      "getBlocksByEpoch",
      "getBlockDetail",
      "getPoolBlocks",
      "getTxDetail",
      "getTransactions",
      "getAddressTxsFromAddress",
      "getStakeAddressRegistrations",
      "getStakeDelegations",
      "getPoolRegistrations",
      "getCurrentProtocolParameters",
      "getTokenDetail",
      "getTokenTransactions",
      "getGovernanceOverviewList",
      "getGovernanceDetail",
      "getGovernanceActionVotes",
      "getDrepDelegates",
      "search",
      "getDashboardStats"
    ]);
  }

  private async _enrichBlocksWithPoolNames(blocks: Block[]): Promise<void> {
    // Yaci-store has no /pools/{poolId} endpoint — leave pool names unresolved.
    void blocks;
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

  async getPoolBlocks(poolId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>> {
    return this.requestList<Block>(async () => {
      const r = await this.client.get<PoolBlock[]>(
        `${this.baseUrl}/blocks/pool/${poolId}`, { params: pageInfo }
      );
      const rows = r.data ?? [];
      const blocks: Block[] = rows.map((b) => ({
        blockNo: (b.blockNumber ?? b.number) ?? 0,
        epochNo: (b.epochNumber ?? b.epoch) ?? 0,
        hash: (b.blockHash ?? b.hash) ?? "",
        time: "",
        txCount: 0,
        slotLeader: poolId
      } as Block));
      return { data: blocks };
    });
  }

  async getTxDetail(txHash: string): Promise<ApiReturnType<TransactionDetail>> {
    return this.request<TransactionDetail>(async () => {
      // yaci-store does not include UTXOs / withdrawals on /txs/{hash}; compose
      // the detail from the supplemental sub-endpoints.
      const [txDetails, utxos, metadata, withdrawals] = await Promise.all([
        this.client.get<TransactionDetails>(`${this.baseUrl}/txs/${txHash}`).then((r) => r.data),
        this.client.get<TxInputsOutputs>(`${this.baseUrl}/txs/${txHash}/utxos`).then((r) => r.data).catch(() => ({} as TxInputsOutputs)),
        this.client.get<TxMetadataLabelDto[]>(`${this.baseUrl}/txs/${txHash}/metadata`).then((r) => r.data).catch(() => [] as TxMetadataLabelDto[]),
        this.client.get<Withdrawal[]>(`${this.baseUrl}/txs/${txHash}/withdrawals`).then((r) => r.data).catch(() => [] as Withdrawal[])
      ]);
      const blockResult = await this.getBlockDetail(String(txDetails.blockHeight ?? ""));
      return toTransactionDetail(txDetails, blockResult.data, metadata, utxos, withdrawals);
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

  async getAddressTxsFromAddress(address: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    return this.requestList<Transaction>(async () => {
      // Yaci-store exposes /addresses/{address}/transactions for payment addresses.
      // There is no aggregated transactions endpoint for stake addresses — return
      // an empty list so callers fall through to the unsupported state.
      if (address.startsWith("stake1")) return { data: [] };
      const r = await this.client.get<AddressTransaction[]>(
        `${this.baseUrl}/addresses/${address}/transactions`, { params: pageInfo }
      );
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

  async getTokenDetail(tokenId: string): Promise<ApiReturnType<ITokenOverview>> {
    return this.request<ITokenOverview>(async () => {
      const isFingerprint = tokenId.startsWith("asset1");
      // Yaci-store has no asset metadata endpoint; compose detail from the
      // mint/burn history (first row gives policy + assetName + fingerprint)
      // and the supply endpoint.
      const historyPath = isFingerprint
        ? `${this.baseUrl}/assets/fingerprint/${tokenId}/history`
        : `${this.baseUrl}/assets/${tokenId}/history`;
      const supplyPath = isFingerprint
        ? `${this.baseUrl}/assets/fingerprint/${tokenId}/supply`
        : `${this.baseUrl}/assets/${tokenId}/supply`;
      const [history, supply] = await Promise.all([
        this.client.get<TxAsset[]>(historyPath, { params: { page: 0, count: 1 } }).then((r) => r.data ?? []).catch(() => [] as TxAsset[]),
        this.client.get<FingerprintSupply>(supplyPath).then((r) => r.data).catch(() => ({} as FingerprintSupply))
      ]);
      const head = history[0] ?? {};
      const dto: YaciAssetDto = {
        unit: head.unit ?? (isFingerprint ? undefined : tokenId),
        policyId: head.policy,
        assetName: head.assetName,
        fingerprint: head.fingerprint ?? (isFingerprint ? tokenId : undefined),
        totalSupply: supply?.supply != null ? String(supply.supply) : (supply?.totalSupply != null ? String(supply.totalSupply) : undefined),
        mintOrBurnCount: undefined
      };
      return yaciAssetToTokenOverview(dto);
    });
  }

  async getTokenTransactions(tokenId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    return this.requestList<Transaction>(async () => {
      // Yaci-store: /assets/{unit}/transactions. Endpoint requires unit (policy+name hex), not fingerprint.
      // If the caller passes a fingerprint (asset1…), resolve it to the unit first via the history endpoint.
      let unit = tokenId;
      if (tokenId.startsWith("asset1")) {
        const r = await this.client.get<TxAsset[]>(
          `${this.baseUrl}/assets/fingerprint/${tokenId}/history`, { params: { page: 0, count: 1 } }
        ).catch(() => ({ data: [] as TxAsset[] }));
        unit = r.data?.[0]?.unit ?? tokenId;
      }
      const r = await this.client.get<AssetTransaction[]>(
        `${this.baseUrl}/assets/${unit}/transactions`, { params: pageInfo }
      );
      const rows = r.data ?? [];
      const blockNumbers = [...new Set(rows.map((t) => t.blockNumber!).filter(Boolean))];
      const blockMap = new Map<number, Awaited<ReturnType<typeof this.getBlockDetail>>>();
      await Promise.all(blockNumbers.map(async (n) => blockMap.set(n, await this.getBlockDetail(String(n)))));
      const txs = rows
        .filter((t) => t.txHash)
        .map((t) => transactionSummaryAndBlockToTransaction(
          { txHash: t.txHash, blockNumber: t.blockNumber, blockTime: t.blockTime } as TransactionSummary,
          blockMap.get(t.blockNumber!) ?? { data: null, lastUpdated: Date.now() }
        ));
      return { data: txs };
    });
  }

  async getGovernanceOverviewList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>> {
    return this.requestList<GovernanceActionListItem>(async () => {
      const r = await this.client.get<GovActionProposal[]>(
        `${this.baseUrl}/governance/proposals`, { params: pageInfo }
      );
      const items: GovernanceActionListItem[] = (r.data ?? []).map((p) => ({
        txHash: p.txHash ?? "",
        index: p.index ?? 0,
        type: p.type,
        status: "ACTIVE" as const
      }));
      return { data: items };
    });
  }

  async getGovernanceDetail(txHash: string, index: string): Promise<ApiReturnType<GovernanceActionDetail>> {
    return this.request<GovernanceActionDetail>(async () => {
      // Yaci-store: /governance/proposals/{txHash} returns an array of proposals
      // for the transaction. Pick the one matching the requested index when
      // possible, otherwise fall back to the first.
      const list = (await this.client.get<GovActionProposal[]>(
        `${this.baseUrl}/governance/proposals/${txHash}`
      )).data ?? [];
      const requestedIdx = Number(index);
      const p = list.find((x) => x.index === requestedIdx) ?? list[0] ?? {} as GovActionProposal;
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
        `${this.baseUrl}/governance/proposals/${txHash}/${index}/votes`
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

  async getDrepDelegates(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<DrepDelegates[]>> {
    return this.requestList<DrepDelegates>(async () => {
      const r = await this.client.get<DelegationVote[]>(
        `${this.baseUrl}/governance/delegation-votes/drep/${drepId}`, { params: pageInfo }
      );
      const delegates: DrepDelegates[] = (r.data ?? []).map((d) => ({
        address: d.address ?? "",
        amount: d.amount ?? 0,
        stakeKeyHash: undefined
      }));
      return { data: delegates };
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
      const idx = Number(indexStr);
      const [govResult, txResult] = await Promise.all([
        probe(() => this.client.get<GovActionProposal[]>(`${this.baseUrl}/governance/proposals/${txHash}`)),
        probe(() => this.client.get(`${this.baseUrl}/txs/${txHash}`)),
      ]);
      const matched = govResult?.data?.some((p) => p.index === idx) ?? false;
      if (matched) results.push({ type: "gov_action", id: txHash, extraId: indexStr });
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

    // 56-char hex: policy ID — yaci-store has no policy-existence endpoint; emit no result.
    if (/^[0-9a-f]{56}$/i.test(q)) {
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

    // pool1... stake pool — yaci-store has no /pools/{poolId} detail endpoint.
    if (/^pool1[a-z0-9]{50,}$/i.test(q)) {
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // drep1... DRep — yaci-store has no /governance/dreps/{id} detail endpoint.
    if (/^drep1[a-z0-9]+$/i.test(q)) {
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // asset1... token fingerprint
    if (/^asset1[a-z0-9]+$/i.test(q)) {
      results.push({ type: "token", id: q });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // Pure number: block only (yaci-store has no /epochs/{n} detail endpoint).
    if (/^\d+$/.test(q)) {
      const n = Number(q);
      const blockResult = await probe(() => this.client.get<BlockDto>(`${this.baseUrl}/blocks/${n}`));
      if (blockResult) results.push({ type: "block", id: q, label: String(n) });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // Free-text: yaci-store has no /assets listing/search endpoint.
    return { data: results, lastUpdated: Date.now(), total: results.length };
  }

  async getDashboardStats(): Promise<ApiReturnType<DashboardStats>> {
    return this.request<DashboardStats>(async () => {
      const [latestBlock, latestEpoch] = await Promise.all([
        this.client.get<BlockDto>(`${this.baseUrl}/blocks/latest`).then((r) => r.data).catch(() => null),
        this.client.get<Epoch>(`${this.baseUrl}/epochs/latest`).then((r) => r.data).catch(() => null)
      ]);
      return {
        currentEpoch: {
          no: latestEpoch?.number ?? latestBlock?.epoch ?? 0,
          startTime: null,
          endTime: null,
          txCount: latestEpoch?.txCount ?? 0,
          blkCount: latestEpoch?.blockCount ?? 0,
          outSum: latestEpoch?.outputSum ? String(latestEpoch.outputSum) : null,
          fees: latestEpoch?.fees ? String(latestEpoch.fees) : null,
          activeStake: latestEpoch?.activeStake ? String(latestEpoch.activeStake) : null,
          progressPercent: 0
        },
        latestBlock: {
          height: latestBlock?.number ?? null,
          hash: latestBlock?.hash ?? "",
          slot: latestBlock?.slot ?? null,
          epochNo: latestBlock?.epoch ?? null,
          epochSlot: latestBlock?.epochSlot ?? null,
          time: latestBlock?.time ?? 0,
          txCount: latestBlock?.txCount ?? 0,
          size: latestBlock?.size ?? 0
        },
        supply: { circulating: "", total: "", max: "", locked: "" },
        stake: {
          live: "",
          active: latestEpoch?.activeStake ? String(latestEpoch.activeStake) : ""
        }
      };
    });
  }
}

// ── Helper functions ──────────────────────────────────────────────────────────

function mapVoterType(voterType?: string): "constitutional_committee" | "drep" | "spo" {
  if (!voterType) return "drep";
  if (voterType.includes("CONSTITUTIONAL")) return "constitutional_committee";
  if (voterType.includes("STAKING_POOL")) return "spo";
  return "drep";
}
