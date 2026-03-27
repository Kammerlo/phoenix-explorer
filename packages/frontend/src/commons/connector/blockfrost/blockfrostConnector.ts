import axios, { AxiosInstance } from "axios";
// @ts-ignore
import { ParsedUrlQuery } from "querystring";
// @ts-ignore
import { TProtocolParam } from "src/types/protocol";

import { ApiConnector, StakeAddressAction } from "../ApiConnector";
import { FunctionEnum, POOL_TYPE } from "../types/FunctionEnum";
import { ApiReturnType } from "@shared/APIReturnType";
import { EpochOverview, EpochStatus } from "@shared/dtos/epoch.dto";
import { Block } from "@shared/dtos/block.dto";
import { Transaction, TransactionDetail, TRANSACTION_STATUS, TxTag } from "@shared/dtos/transaction.dto";
import { ITokenOverview, TokenHolder } from "@shared/dtos/token.dto";
import { AddressDetail, StakeAddressDetail } from "@shared/dtos/address.dto";
import { PoolDetail, PoolOverview } from "@shared/dtos/pool.dto";
import { Drep, DrepDelegates } from "@shared/dtos/drep.dto";
import {
  GovActionVote,
  GovernanceActionDetail,
  GovernanceActionListItem
} from "@shared/dtos/GovernanceOverview";

const BLOCKFROST_URLS: Record<string, string> = {
  mainnet: "https://cardano-mainnet.blockfrost.io/api/v0",
  preprod: "https://cardano-preprod.blockfrost.io/api/v0",
  preview: "https://cardano-preview.blockfrost.io/api/v0"
};

/**
 * Direct Blockfrost connector — calls the Blockfrost REST API from the browser.
 * Configure with REACT_APP_BLOCKFROST_API_KEY and optionally REACT_APP_NETWORK.
 */
export class BlockfrostConnector extends ApiConnector {
  client: AxiosInstance;

  constructor(baseUrl: string, apiKey: string) {
    super(baseUrl);
    this.client = axios.create({
      baseURL: baseUrl,
      headers: { project_id: apiKey }
    });
  }

  static createFromEnv(): BlockfrostConnector {
    const network = process.env.REACT_APP_NETWORK || "mainnet";
    const apiKey = process.env.REACT_APP_BLOCKFROST_API_KEY || "";
    const baseUrl = BLOCKFROST_URLS[network] ?? BLOCKFROST_URLS.mainnet;
    return new BlockfrostConnector(baseUrl, apiKey);
  }

  getSupportedFunctions(): FunctionEnum[] {
    return [
      FunctionEnum.EPOCH,
      FunctionEnum.BLOCK,
      FunctionEnum.TRANSACTION,
      FunctionEnum.ADDRESS,
      FunctionEnum.TOKENS,
      FunctionEnum.POOL,
      FunctionEnum.GOVERNANCE,
      FunctionEnum.DREP,
      FunctionEnum.PROTOCOL_PARAMETER,
      FunctionEnum.STAKE_ADDRESS_REGISTRATION,
      FunctionEnum.POOL_REGISTRATION
    ];
  }

  // ── Epochs ────────────────────────────────────────────────────────────────

  async getEpochs(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<EpochOverview[]>> {
    try {
      const latest = await this.client.get<BfEpoch>("/epochs/latest");
      const page = Number(pageInfo.page ?? 0);
      const count = Number(pageInfo.size ?? 20);
      const response = await this.client.get<BfEpoch[]>(`/epochs/${latest.data.epoch}/previous`, {
        params: { page, count }
      });
      const epochs = response.data.map((e) => bfEpochToOverview(e, latest.data.epoch));
      if (page === 0) epochs.unshift(bfEpochToOverview(latest.data, latest.data.epoch));
      return { data: epochs, total: latest.data.epoch, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getEpoch(epochId: number): Promise<ApiReturnType<EpochOverview>> {
    try {
      const [epoch, latest] = await Promise.all([
        this.client.get<BfEpoch>(`/epochs/${epochId}`),
        this.client.get<BfEpoch>("/epochs/latest")
      ]);
      return { data: bfEpochToOverview(epoch.data, latest.data.epoch), lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  // ── Blocks ────────────────────────────────────────────────────────────────

  async getBlocksPage(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>> {
    try {
      const latest = await this.client.get<BfBlock>("/blocks/latest");
      const page = Number(pageInfo.page ?? 0);
      const count = Number(pageInfo.size ?? 20);
      const response = await this.client.get<BfBlock[]>(`/blocks/${latest.data.hash}/previous`, {
        params: { page, count }
      });
      return {
        data: response.data.map(bfBlockToBlock).reverse(),
        total: latest.data.height ?? 0,
        lastUpdated: Date.now()
      };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getBlocksByEpoch(epoch: number, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>> {
    try {
      const page = Number(pageInfo.page ?? 0);
      const count = Number(pageInfo.size ?? 20);
      const hashesResp = await this.client.get<string[]>(`/epochs/${epoch}/blocks`, {
        params: { page, count }
      });
      const blocks = await Promise.all(hashesResp.data.map((h) => this._fetchBlock(h)));
      return { data: blocks, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getBlockDetail(blockId: string): Promise<ApiReturnType<Block>> {
    try {
      const block = await this._fetchBlock(blockId);
      return { data: block, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  private async _fetchBlock(blockId: string | number): Promise<Block> {
    const resp = await this.client.get<BfBlock>(`/blocks/${blockId}`);
    return bfBlockToBlock(resp.data);
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  async getTransactions(blockId: number | string | undefined, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    try {
      const page = Number(pageInfo.page ?? 0);
      const count = Number(pageInfo.size ?? 20);
      if (blockId) {
        const block = await this._fetchBlock(String(blockId));
        const hashesResp = await this.client.get<string[]>(`/blocks/${block.hash}/txs`, { params: { page, count } });
        const txs: Transaction[] = [];
        for (const hash of hashesResp.data ?? []) {
          const tx = await this._fetchTxSummary(hash, block);
          txs.push(tx);
        }
        return { data: txs, lastUpdated: Date.now() };
      } else {
        const latest = await this.client.get<BfBlock>("/blocks/latest");
        const hashesResp = await this.client.get<string[]>(`/blocks/${latest.data.hash}/txs`, { params: { page, count } });
        const block = bfBlockToBlock(latest.data);
        const txs: Transaction[] = [];
        for (const hash of hashesResp.data ?? []) {
          const tx = await this._fetchTxSummary(hash, block);
          txs.push(tx);
        }
        return { data: txs, lastUpdated: Date.now() };
      }
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getTxDetail(txHash: string): Promise<ApiReturnType<TransactionDetail>> {
    try {
      const [txResp, utxosResp, metaResp] = await Promise.all([
        this.client.get<BfTx>(`/txs/${txHash}`),
        this.client.get<BfTxUtxos>(`/txs/${txHash}/utxos`),
        this.client.get<{ label: string; json_metadata: unknown }[]>(`/txs/${txHash}/metadata`).catch(() => ({ data: [] }))
      ]);
      const tx = txResp.data;
      const block = await this._fetchBlock(tx.block);

      const metadata = (metaResp as any).data?.length
        ? (metaResp as any).data.map((m: any) => ({ label: m.label, value: JSON.stringify(m.json_metadata) }))
        : undefined;

      const detailTags: TxTag[] = [];
      const hasNativeTokensDetail = (tx.output_amount ?? []).some((a: any) => a.unit !== "lovelace");
      if (hasNativeTokensDetail || (tx.asset_mint_or_burn_count ?? 0) > 0) detailTags.push("token");
      if ((tx.asset_mint_or_burn_count ?? 0) > 0) detailTags.push("mint");
      if ((tx.delegation_count ?? 0) > 0 || (tx.stake_cert_count ?? 0) > 0 || (tx.withdrawal_count ?? 0) > 0 || (tx.mir_cert_count ?? 0) > 0) detailTags.push("stake");
      if ((tx.pool_update_count ?? 0) > 0 || (tx.pool_retire_count ?? 0) > 0) detailTags.push("pool");
      if ((tx.redeemer_count ?? 0) > 0) detailTags.push("script");
      if (detailTags.length === 0) detailTags.push("transfer");

      const detail: TransactionDetail = {
        tx: {
          hash: tx.hash,
          time: tx.block_time.toString(),
          blockNo: tx.block_height ?? 0,
          blockHash: tx.block,
          epochSlot: block.epochSlotNo ?? 0,
          epochNo: tx.block_epoch ?? block.epochNo ?? 0,
          status: TRANSACTION_STATUS.SUCCESS,
          confirmation: block.confirmation ?? 0,
          fee: parseInt(tx.fees ?? "0"),
          totalOutput: tx.output_amount?.filter((a: any) => a.unit === "lovelace").reduce((s: number, a: any) => s + parseInt(a.quantity), 0) ?? 0,
          maxEpochSlot: 0,
          slotNo: tx.slot ?? 0,
          tags: detailTags
        },
        summary: { stakeAddress: [] },
        utxOs: {
          inputs: (utxosResp.data.inputs ?? []).map(bfUtxoToUtxo),
          outputs: (utxosResp.data.outputs ?? []).map(bfUtxoToUtxo)
        },
        collaterals: { collateralInputResponses: [], collateralOutputResponses: [] },
        metadata,
        metadataHash: ""
      };
      return { data: detail, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  private async _fetchTxSummary(hash: string, block: Block): Promise<Transaction> {
    const txResp = await this.client.get<BfTx>(`/txs/${hash}`);
    const tx = txResp.data;

    const tags: TxTag[] = [];
    const hasNativeTokens = (tx.output_amount ?? []).some((a: any) => a.unit !== "lovelace");
    if (hasNativeTokens || (tx.asset_mint_or_burn_count ?? 0) > 0) tags.push("token");
    if ((tx.asset_mint_or_burn_count ?? 0) > 0) tags.push("mint");
    if ((tx.delegation_count ?? 0) > 0 || (tx.stake_cert_count ?? 0) > 0 || (tx.withdrawal_count ?? 0) > 0 || (tx.mir_cert_count ?? 0) > 0) tags.push("stake");
    if ((tx.pool_update_count ?? 0) > 0 || (tx.pool_retire_count ?? 0) > 0) tags.push("pool");
    if ((tx.redeemer_count ?? 0) > 0) tags.push("script");
    if (tags.length === 0) tags.push("transfer");

    return {
      hash,
      blockNo: block.blockNo,
      time: tx.block_time.toString(),
      slot: tx.slot ?? 0,
      epochNo: block.epochNo ?? 0,
      epochSlotNo: block.epochSlotNo ?? 0,
      fee: parseInt(tx.fees ?? "0"),
      totalOutput: tx.output_amount?.filter((a: any) => a.unit === "lovelace").reduce((s: number, a: any) => s + parseInt(a.quantity), 0) ?? 0,
      blockHash: tx.block,
      status: TRANSACTION_STATUS.SUCCESS,
      tags
    } as Transaction;
  }

  // ── Address ───────────────────────────────────────────────────────────────

  async getWalletAddressFromAddress(address: string): Promise<ApiReturnType<AddressDetail>> {
    try {
      const resp = await this.client.get<BfAddress>(`/addresses/${address}`);
      const a = resp.data;
      const balance = parseInt(a.amount?.find((x: any) => x.unit === "lovelace")?.quantity ?? "0");
      const tokens = (a.amount ?? []).filter((x: any) => x.unit !== "lovelace").map((x: any) => ({
        address,
        name: x.unit.slice(56) ?? "",
        displayName: x.unit.slice(56) ?? "",
        fingerprint: x.unit,
        quantity: parseInt(x.quantity)
      }));
      return {
        data: {
          address,
          balance,
          txCount: a.tx_count ?? 0,
          tokens,
          stakeAddress: a.stake_address ?? "",
          isContract: a.script ?? false
        },
        lastUpdated: Date.now()
      };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  async getAddressTxsFromAddress(address: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    try {
      const page = Number(pageInfo.page ?? 1);
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<{ tx_hash: string; block_height: number; block_time: number }[]>(
        `/addresses/${address}/transactions`, { params: { page, count, order: "desc" } }
      );
      const txs: Transaction[] = [];
      for (const t of resp.data ?? []) {
        const block = await this._fetchBlock(String(t.block_height));
        txs.push(await this._fetchTxSummary(t.tx_hash, block));
      }
      return { data: txs, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getWalletStakeFromAddress(address: string): Promise<ApiReturnType<StakeAddressDetail>> {
    try {
      const resp = await this.client.get<{ stake_address?: string }>(`/addresses/${address}`);
      const stakeAddr = resp.data.stake_address;
      if (!stakeAddr) return { data: null, error: "No stake address", lastUpdated: Date.now() };
      const accResp = await this.client.get<any>(`/accounts/${stakeAddr}`);
      const acc = accResp.data;
      return {
        data: {
          status: acc.active ? "ACTIVE" : "INACTIVE",
          stakeAddress: stakeAddr,
          totalStake: parseInt(acc.controlled_amount ?? "0"),
          rewardAvailable: parseInt(acc.withdrawable_amount ?? "0"),
          rewardWithdrawn: parseInt(acc.withdrawals_sum ?? "0"),
          pool: { tickerName: "", poolName: "", poolId: acc.pool_id ?? "" }
        },
        lastUpdated: Date.now()
      };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  // ── Tokens ────────────────────────────────────────────────────────────────

  async getTokensPage(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<ITokenOverview[]>> {
    try {
      const page = Number(pageInfo.page ?? 1);
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<BfAsset[]>("/assets", { params: { page, count, order: "desc" } });
      const tokens: ITokenOverview[] = (resp.data ?? []).map(bfAssetToTokenOverview);
      return { data: tokens, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getTokenDetail(tokenId: string): Promise<ApiReturnType<ITokenOverview>> {
    try {
      const resp = await this.client.get<BfAssetDetail>(`/assets/${tokenId}`);
      return {
        data: {
          name: resp.data.asset_name ?? tokenId,
          displayName: (resp.data.onchain_metadata as any)?.name ?? resp.data.asset_name ?? tokenId,
          policy: resp.data.policy_id ?? tokenId.slice(0, 56),
          fingerprint: resp.data.fingerprint ?? "",
          txCount: resp.data.mint_or_burn_count ?? 0,
          supply: parseInt(resp.data.quantity ?? "0"),
          metadata: resp.data.metadata ? {
            ticker: resp.data.metadata.ticker,
            description: resp.data.metadata.description,
            url: resp.data.metadata.url,
            logo: resp.data.metadata.logo,
            decimals: resp.data.metadata.decimals
          } : undefined
        },
        lastUpdated: Date.now()
      };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  async getTokenTransactions(tokenId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    try {
      const page = Number(pageInfo.page ?? 1);
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<{ tx_hash: string; tx_index: number; block_height: number }[]>(
        `/assets/${tokenId}/transactions`, { params: { page, count, order: "desc" } }
      );
      const txs: Transaction[] = [];
      for (const t of resp.data ?? []) {
        const block = await this._fetchBlock(String(t.block_height));
        txs.push(await this._fetchTxSummary(t.tx_hash, block));
      }
      return { data: txs, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getTokenHolders(tokenId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<TokenHolder[]>> {
    try {
      const page = Number(pageInfo.page ?? 1);
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<{ address: string; quantity: string }[]>(
        `/assets/${tokenId}/addresses`, { params: { page, count } }
      );
      const holders: TokenHolder[] = (resp.data ?? []).map((h) => ({
        address: h.address,
        amount: parseInt(h.quantity),
        ratio: 0
      }));
      return { data: holders, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getTokensByPolicy(policyId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<ITokenOverview[]>> {
    try {
      const page = Number(pageInfo.page ?? 1);
      const count = Number(pageInfo.size ?? 50);
      const resp = await this.client.get<{ asset: string; quantity: string }[]>(
        `/assets/policy/${policyId}`, { params: { page, count } }
      );
      const tokens: ITokenOverview[] = (resp.data ?? []).map((a) => ({
        policy: policyId,
        displayName: Buffer.from(a.asset.slice(56), "hex").toString("utf8") || a.asset.slice(56),
        supply: parseInt(a.quantity),
        fingerprint: a.asset
      }));
      return { data: tokens, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  // ── Governance ────────────────────────────────────────────────────────────

  async getGovernanceOverviewList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>> {
    try {
      const page = Number(pageInfo.page ?? 1);
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<any[]>(
        "/governance/proposals", { params: { page, count, order: "desc" } }
      );
      const items: GovernanceActionListItem[] = (resp.data ?? []).map((p) => ({
        txHash: p.tx_hash,
        index: p.cert_index,
        type: p.governance_type,
        // Blockfrost list has `expiration` (scheduled epoch); detail has `expired_epoch`/`enacted_epoch`
        status: p.expired_epoch ? "EXPIRED" : p.enacted_epoch ? "ENACTED" : "ACTIVE",
        expiredEpoch: p.expired_epoch ?? p.expiration ?? null,
        enactedEpoch: p.enacted_epoch ?? null,
      }));
      return { data: items, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getGovernanceDetail(txHash: string, index: string): Promise<ApiReturnType<GovernanceActionDetail>> {
    try {
      const resp = await this.client.get<any>(`/governance/proposals/${txHash}/${index}`);
      const p = resp.data;
      return {
        data: {
          txHash: p.tx_hash ?? txHash,
          index: String(p.cert_index ?? index),
          dateCreated: "",
          actionType: p.governance_type ?? "",
          // Blockfrost may use either `expired_epoch`/`expired_in` and `ratified_epoch`/`enacted_in`
          status: (p.expired_epoch ?? p.expired_in) ? "EXPIRED" : (p.ratified_epoch ?? p.enacted_in ?? p.ratified_in) ? "ENACTED" : "ACTIVE",
          expiredEpoch: p.expired_epoch ?? p.expired_in ?? null,
          enactedEpoch: p.ratified_epoch ?? p.enacted_in ?? p.ratified_in ?? null,
          motivation: p.motivation ?? null,
          rationale: p.rationale ?? null,
          title: p.title ?? null,
          authors: null,
          abstract: p.abstract ?? null,
          votesStats: {
            drep: { yes: p.yes_votes?.drep ?? 0, no: p.no_votes?.drep ?? 0, abstain: p.abstain_votes?.drep ?? 0 },
            spo: { yes: p.yes_votes?.spo ?? 0, no: p.no_votes?.spo ?? 0, abstain: p.abstain_votes?.spo ?? 0 },
            committee: { yes: p.yes_votes?.committee ?? 0, no: p.no_votes?.committee ?? 0, abstain: p.abstain_votes?.committee ?? 0 }
          }
        },
        lastUpdated: Date.now()
      };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  async getGovernanceActionVotes(txHash: string, index: string): Promise<ApiReturnType<GovActionVote[]>> {
    try {
      const resp = await this.client.get<any[]>(`/governance/proposals/${txHash}/${index}/votes`);
      const votes: GovActionVote[] = (resp.data ?? []).map((v) => ({
        voter: v.voter_hash ?? "",
        voterType: mapBfVoterType(v.voter_role),
        vote: (v.vote ?? "abstain").toLowerCase() as "yes" | "no" | "abstain",
        txHash: v.tx_hash ?? "",
        certIndex: v.cert_index ?? 0,
        voteTime: ""
      }));
      return { data: votes, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  // ── Pools ─────────────────────────────────────────────────────────────────

  async getPoolList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<PoolOverview[]>> {
    try {
      const page = Number(pageInfo.page ?? 1);
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<any[]>("/pools/extended", { params: { page, count } });
      const pools: PoolOverview[] = (resp.data ?? []).map((p, i) => ({
        id: i,
        poolId: p.pool_id ?? "",
        poolName: p.metadata?.name ?? p.pool_id ?? "",
        tickerName: p.metadata?.ticker ?? "",
        poolSize: parseInt(p.active_stake ?? "0"),
        declaredPledge: parseInt(p.declared_pledge ?? "0"),
        saturation: p.live_saturation ?? 0,
        lifetimeBlock: p.blocks_minted ?? 0
      }));
      return { data: pools, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getPoolDetail(poolId: string): Promise<ApiReturnType<PoolDetail>> {
    try {
      const [poolResp, metaResp] = await Promise.all([
        this.client.get<any>(`/pools/${poolId}`),
        this.client.get<any>(`/pools/${poolId}/metadata`).catch(() => ({ data: {} }))
      ]);
      const p = poolResp.data;
      const meta = (metaResp as any).data ?? {};
      return {
        data: {
          poolName: meta.name ?? poolId,
          tickerName: meta.ticker ?? "",
          poolView: poolId,
          poolStatus: p.registration?.length > (p.retirement?.length ?? 0) ? "ACTIVE" : "RETIRED" as any,
          createDate: "",
          rewardAccounts: p.reward_account ? [p.reward_account] : [],
          ownerAccounts: p.owners ?? [],
          poolSize: parseInt(p.active_stake ?? "0"),
          stakeLimit: parseInt(p.live_stake ?? "0"),
          delegators: p.live_delegators ?? 0,
          saturation: p.live_saturation ?? 0,
          totalBalanceOfPoolOwners: 0,
          reward: 0,
          ros: 0,
          pledge: parseInt(p.declared_pledge ?? "0"),
          cost: parseInt(p.fixed_cost ?? "0"),
          margin: p.margin_cost ?? 0,
          epochBlock: p.blocks_epoch ?? 0,
          lifetimeBlock: p.blocks_minted ?? 0,
          description: meta.description ?? "",
          homepage: meta.homepage ?? ""
        },
        lastUpdated: Date.now()
      };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  async getPoolBlocks(poolId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>> {
    try {
      const page = Math.max(1, Number(pageInfo.page ?? 1));
      const count = Number(pageInfo.size ?? 20);
      const [hashesResp, poolResp] = await Promise.all([
        this.client.get<string[]>(`/pools/${poolId}/blocks`, { params: { page, count } }),
        this.client.get<any>(`/pools/${poolId}`).catch(() => ({ data: {} }))
      ]);
      const hashes: string[] = hashesResp.data ?? [];
      const total: number = poolResp.data?.blocks_minted ?? 0;
      const blockDetails = await Promise.all(
        hashes.map(hash => this.client.get<any>(`/blocks/${hash}`).then(r => r.data))
      );
      const blocks: Block[] = blockDetails.map(b => ({
        blockNo: b.height ?? 0,
        epochNo: b.epoch ?? 0,
        epochSlotNo: b.epoch_slot ?? 0,
        slotNo: b.slot ?? 0,
        hash: b.hash,
        height: b.height,
        slot: b.slot,
        txCount: b.tx_count ?? 0,
        output: parseInt(b.output ?? "0"),
        totalFees: parseInt(b.fees ?? "0"),
        totalOutput: parseInt(b.output ?? "0"),
        time: String(b.time),
        size: b.size ?? 0,
        slotLeader: b.slot_leader ?? undefined,
      }));
      return {
        data: blocks,
        lastUpdated: Date.now(),
        total,
        currentPage: page - 1,
        pageSize: count,
        totalPages: total > 0 ? Math.ceil(total / count) : undefined,
      };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now(), total: 0, currentPage: 0, pageSize: 20 };
    }
  }

  // ── DReps ─────────────────────────────────────────────────────────────────

  async getDreps(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Drep[]>> {
    try {
      const page = Number(pageInfo.page ?? 1);
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<any[]>("/governance/dreps", { params: { page, count } });
      const dreps: Drep[] = (resp.data ?? []).map(bfDrepToDrep);
      return { data: dreps, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getDrep(drepId: string): Promise<ApiReturnType<Drep>> {
    try {
      const resp = await this.client.get<any>(`/governance/dreps/${drepId}`);
      return { data: bfDrepToDrep(resp.data), lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  async getDrepVotes(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>> {
    try {
      const page = Number(pageInfo.page ?? 1);
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<any[]>(`/governance/dreps/${drepId}/votes`, { params: { page, count } });
      const items: GovernanceActionListItem[] = (resp.data ?? []).map((v) => ({
        txHash: v.proposal_tx_hash ?? "",
        index: v.proposal_cert_index ?? 0,
        vote: (v.vote ?? "abstain").toLowerCase() as "yes" | "no" | "abstain"
      }));
      return { data: items, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getDrepDelegates(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<DrepDelegates[]>> {
    try {
      const page = Number(pageInfo.page ?? 1);
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<any[]>(`/governance/dreps/${drepId}/delegators`, { params: { page, count } });
      const delegates: DrepDelegates[] = (resp.data ?? []).map((d) => ({
        address: d.address ?? "",
        amount: parseInt(d.amount ?? "0")
      }));
      return { data: delegates, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  // ── Protocol params & Staking stubs ───────────────────────────────────────

  async getCurrentProtocolParameters(): Promise<ApiReturnType<TProtocolParam>> {
    try {
      const resp = await this.client.get<any>("/epochs/latest/parameters");
      return { data: resp.data as TProtocolParam, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  async getStakeAddressRegistrations(): Promise<ApiReturnType<IStakeKey[]>> {
    return { data: [], error: "Not supported", lastUpdated: Date.now() };
  }

  async getStakeDelegations(): Promise<ApiReturnType<IStakeKey[]>> {
    return { data: [], error: "Not supported", lastUpdated: Date.now() };
  }

  async getPoolRegistrations(): Promise<ApiReturnType<Registration[]>> {
    return { data: [], error: "Not supported", lastUpdated: Date.now() };
  }
}

// ── Blockfrost response types (minimal) ───────────────────────────────────────

interface BfEpoch {
  epoch: number;
  start_time: number;
  end_time: number;
  block_count: number;
  tx_count: number;
  output: string;
}

interface BfBlock {
  hash: string;
  height?: number;
  slot?: number;
  epoch?: number;
  epoch_slot?: number;
  tx_count?: number;
  fees?: string;
  output?: string;
  time: number;
  previous_block?: string;
  next_block?: string;
  slot_leader?: string;
  confirmations?: number;
}

interface BfTx {
  hash: string;
  block: string;
  block_height?: number;
  block_time: number;
  slot?: number;
  fees?: string;
  output_amount?: { unit: string; quantity: string }[];
  block_epoch?: number;
}

interface BfTxUtxos {
  inputs?: { address: string; amount: { unit: string; quantity: string }[]; tx_hash: string; output_index?: number; collateral?: boolean; reference?: boolean }[];
  outputs?: { address: string; amount: { unit: string; quantity: string }[]; tx_hash: string; output_index?: number; collateral?: boolean }[];
}

interface BfAddress {
  address: string;
  amount?: { unit: string; quantity: string }[];
  stake_address?: string;
  tx_count?: number;
  script?: boolean;
}

interface BfAsset {
  asset: string;
  quantity: string;
}

interface BfAssetDetail {
  asset: string;
  asset_name?: string;
  policy_id?: string;
  fingerprint?: string;
  quantity?: string;
  mint_or_burn_count?: number;
  onchain_metadata?: Record<string, unknown>;
  metadata?: { ticker?: string; description?: string; url?: string; logo?: string; decimals?: number };
}

// ── Helper functions ──────────────────────────────────────────────────────────

function bfEpochToOverview(e: BfEpoch, latestEpochNo: number): EpochOverview {
  const now = Math.floor(Date.now() / 1000);
  let status: EpochStatus;
  if (e.epoch === latestEpochNo) status = EpochStatus.IN_PROGRESS;
  else if (e.epoch === latestEpochNo - 1) status = EpochStatus.REWARDING;
  else status = EpochStatus.FINISHED;

  return {
    no: e.epoch,
    status,
    blkCount: e.block_count,
    txCount: e.tx_count,
    outSum: parseInt(e.output ?? "0"),
    startTime: e.start_time.toString(),
    endTime: e.end_time.toString(),
    syncingProgress: Math.min(100, Math.max(0, ((now - e.start_time) / (e.end_time - e.start_time)) * 100)),
    rewardsDistributed: 0,
    epochSlotNo: 0,
    account: 0,
    maxSlot: 0
  };
}

function bfBlockToBlock(b: BfBlock): Block {
  return {
    blockNo: b.height ?? 0,
    epochNo: b.epoch ?? 0,
    epochSlotNo: b.epoch_slot ?? 0,
    slotNo: b.slot ?? 0,
    hash: b.hash,
    height: b.height,
    slot: b.slot,
    txCount: b.tx_count ?? 0,
    output: parseInt(b.output ?? "0"),
    totalFees: parseInt(b.fees ?? "0"),
    totalOutput: parseInt(b.output ?? "0"),
    time: b.time.toString(),
    previousBlock: b.previous_block,
    nextBlock: b.next_block,
    slotLeader: b.slot_leader,
    confirmation: b.confirmations
  } as Block;
}

function bfUtxoToUtxo(u: any): any {
  return {
    address: u.address,
    value: parseInt(u.amount?.find((a: any) => a.unit === "lovelace")?.quantity ?? "0"),
    txHash: u.tx_hash,
    index: String(u.output_index ?? 0),
    tokens: (u.amount ?? []).filter((a: any) => a.unit !== "lovelace").map((a: any) => ({
      assetId: a.unit,
      assetName: a.unit.slice(56),
      assetQuantity: parseInt(a.quantity),
      policy: { policyId: a.unit.slice(0, 56), totalToken: 0 }
    }))
  };
}

function bfAssetToTokenOverview(a: BfAsset): ITokenOverview {
  return {
    name: a.asset.slice(56) || a.asset,
    displayName: a.asset.slice(56) || a.asset,
    policy: a.asset.slice(0, 56),
    fingerprint: a.asset,
    txCount: 0,
    supply: parseInt(a.quantity ?? "0")
  };
}

function bfDrepToDrep(d: any): Drep {
  return {
    drepId: d.drep_id ?? "",
    drepHash: d.hex ?? "",
    anchorUrl: d.url ?? "",
    anchorHash: d.anchor_hash ?? "",
    status: (d.active ? "ACTIVE" : "INACTIVE") as "ACTIVE" | "INACTIVE" | "RETIRED",
    activeVoteStake: parseInt(d.active_power ?? "0"),
    votingPower: parseInt(d.amount ?? "0"),
    delegators: 0,
    givenName: d.drep_id ?? "",
    votes: { total: 0, abstain: 0, no: 0, yes: 0 }
  };
}

function mapBfVoterType(role?: string): "constitutional_committee" | "drep" | "spo" {
  if (!role) return "drep";
  if (role.includes("committee") || role.includes("constitutional")) return "constitutional_committee";
  if (role === "spo" || role.includes("pool")) return "spo";
  return "drep";
}
