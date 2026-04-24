import axios, { AxiosInstance } from "axios";
// @ts-ignore
import { ParsedUrlQuery } from "querystring";
// @ts-ignore
import { TProtocolParam } from "src/types/protocol";

import { StakeAddressAction } from "../ApiConnector";
import { ConnectorBase } from "../ConnectorBase";
import { FunctionEnum, POOL_TYPE } from "../types/FunctionEnum";
import { ApiReturnType } from "@shared/APIReturnType";
import { DashboardStats } from "@shared/dtos/dashboard.dto";
import { EpochOverview } from "@shared/dtos/epoch.dto";
import { Block } from "@shared/dtos/block.dto";
import { Transaction, TransactionDetail, TRANSACTION_STATUS, Token, TPoolCertificated } from "@shared/dtos/transaction.dto";
import { ITokenOverview, TokenHolder } from "@shared/dtos/token.dto";
import { AddressDetail, StakeAddressDetail } from "@shared/dtos/address.dto";
import { PoolDetail, PoolOverview } from "@shared/dtos/pool.dto";
import { Drep, DrepDelegates } from "@shared/dtos/drep.dto";
import { SearchResult } from "@shared/dtos/seach.dto";
import {
  GovActionVote,
  GovernanceActionDetail,
  GovernanceActionListItem
} from "@shared/dtos/GovernanceOverview";
import { computeTxTags, computeTotalLovelaceOutput } from "@shared/helpers/txTags";
import { getEpochStatus, getEpochProgress, computeEpochSlotNo, MAINNET_EPOCH_MAX_SLOT } from "@shared/helpers/epochHelpers";

/**
 * Direct Blockfrost connector — calls the Blockfrost REST API from the browser.
 * Produces the same DTO shapes as the Gateway connector.
 */
export class BlockfrostConnector extends ConnectorBase {
  client: AxiosInstance;

  constructor(baseUrl: string, apiKey: string) {
    super(baseUrl);
    this.client = axios.create({
      baseURL: baseUrl,
      headers: { project_id: apiKey }
    });
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
        params: { page: page + 1, count }
      });
      const epochs = response.data.map((e) => bfEpochToOverview(e, latest.data.epoch));
      if (page === 0) epochs.unshift(bfEpochToOverview(latest.data, latest.data.epoch));
      return {
        data: epochs.reverse(),
        total: latest.data.epoch,
        lastUpdated: Date.now(),
        currentPage: page,
        pageSize: count,
      };
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
      const requestedPage = Math.max(1, Number(pageInfo.page ?? 1));
      const count = Number(pageInfo.size ?? 20);

      // Match gateway: walk backwards from latest, skip for pagination
      const totalToSkip = (requestedPage - 1) * count;
      const totalToFetch = totalToSkip + count;

      const allBlocks: BfBlock[] = [];
      const BF_MAX = 100;
      const pagesNeeded = Math.ceil(totalToFetch / BF_MAX);
      for (let bfPage = 1; bfPage <= pagesNeeded; bfPage++) {
        const c = Math.min(BF_MAX, totalToFetch - allBlocks.length);
        const page = await this.client.get<BfBlock[]>(`/blocks/${latest.data.hash}/previous`, {
          params: { page: bfPage, count: c }
        });
        allBlocks.push(...page.data);
        if (page.data.length < c) break;
      }
      allBlocks.splice(0, totalToSkip);

      // Fetch pool metadata for slot leaders
      const poolMeta = await this._fetchPoolMetaBatch(allBlocks.map(b => b.slot_leader));

      return {
        data: allBlocks.map(b => bfBlockToBlock(b, poolMeta)).reverse(),
        total: latest.data.height ?? 0,
        lastUpdated: Date.now(),
        currentPage: requestedPage - 1,
        pageSize: count,
      };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getBlocksByEpoch(epoch: number, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>> {
    try {
      const page = Number(pageInfo.page ?? 0);
      const count = Number(pageInfo.size ?? 20);
      const [hashesResp, epochResp] = await Promise.all([
        this.client.get<string[]>(`/epochs/${epoch}/blocks`, { params: { page: page + 1, count } }),
        this.client.get<BfEpoch>(`/epochs/${epoch}`)
      ]);
      const rawBlocks = await Promise.all(hashesResp.data.map(h => this._fetchBlockRaw(h)));
      const poolMeta = await this._fetchPoolMetaBatch(rawBlocks.map(b => b.slot_leader));
      const blocks = rawBlocks.map(b => bfBlockToBlock(b, poolMeta));
      return {
        data: blocks,
        total: epochResp.data.block_count,
        lastUpdated: Date.now(),
        currentPage: page,
        pageSize: count,
      };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getBlockDetail(blockId: string): Promise<ApiReturnType<Block>> {
    try {
      const raw = await this._fetchBlockRaw(blockId);
      const poolMeta = await this._fetchPoolMetaBatch([raw.slot_leader]);
      return { data: bfBlockToBlock(raw, poolMeta), lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  private async _fetchBlockRaw(blockId: string | number): Promise<BfBlock> {
    const resp = await this.client.get<BfBlock>(`/blocks/${blockId}`);
    return resp.data;
  }

  private async _fetchPoolMetaBatch(slotLeaders: (string | undefined)[]): Promise<Map<string, { name: string; ticker: string }>> {
    const poolMeta = new Map<string, { name: string; ticker: string }>();
    const unique = [...new Set(slotLeaders.filter(l => l?.startsWith("pool")))] as string[];
    await Promise.all(unique.map(async (leader) => {
      try {
        const resp = await this.client.get<{ name?: string; ticker?: string }>(`/pools/${leader}/metadata`);
        poolMeta.set(leader, { name: resp.data.name ?? "", ticker: resp.data.ticker ?? "" });
      } catch { /* no metadata */ }
    }));
    return poolMeta;
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  async getTransactions(blockId: number | string | undefined, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    try {
      const page = Math.max(1, Number(pageInfo.page ?? 1));
      const size = Math.min(100, Number(pageInfo.size ?? 20));

      if (blockId) {
        // Transactions for a specific block — matches gateway block-controller
        const block = await this._fetchBlockRaw(String(blockId));
        const hashesResp = await this.client.get<string[]>(`/blocks/${block.hash}/txs`);
        const txs = await Promise.all(
          (hashesResp.data ?? []).map(hash => this._fetchTxSummary(hash, bfBlockToBlock(block)))
        );
        return {
          data: txs,
          total: txs.length,
          lastUpdated: Date.now(),
          currentPage: page - 1,
          pageSize: size,
        };
      }

      // General transaction list — walk backwards through blocks (matches gateway transaction-controller)
      const latestBlock = await this._fetchBlockRaw("latest");
      const epochStartSlot = (latestBlock.slot ?? 0) - (latestBlock.epoch_slot ?? 0);
      const txEntries: { txHash: string; blockHeight: number }[] = [];
      let blockHeight = latestBlock.height ?? 0;
      let toSkip = (page - 1) * size;
      const MAX_BLOCKS_TO_SCAN = 50;
      let blocksScanned = 0;

      while (txEntries.length < size && blockHeight > 0 && blocksScanned < MAX_BLOCKS_TO_SCAN) {
        const hashesResp = await this.client.get<string[]>(`/blocks/${blockHeight}/txs`);
        blocksScanned++;
        for (const txHash of hashesResp.data ?? []) {
          if (toSkip > 0) { toSkip--; continue; }
          if (txEntries.length >= size) break;
          txEntries.push({ txHash, blockHeight });
        }
        blockHeight--;
      }

      const txs = await Promise.all(
        txEntries.map(async ({ txHash }) => {
          const txResp = await this.client.get<BfTx>(`/txs/${txHash}`);
          const tx = txResp.data;
          return {
            blockNo: tx.block_height ?? 0,
            hash: txHash,
            time: tx.block_time.toString(),
            slot: tx.slot ?? 0,
            epochNo: latestBlock.epoch ?? 0,
            epochSlotNo: tx.slot ? tx.slot - epochStartSlot : 0,
            fee: parseInt(tx.fees ?? "0"),
            totalOutput: computeTotalLovelaceOutput(tx.output_amount ?? []),
            blockHash: tx.block,
            tags: computeTxTags(tx),
          } as Transaction;
        })
      );

      return {
        data: txs,
        total: latestBlock.height ?? 10000,
        lastUpdated: Date.now(),
        currentPage: page - 1,
        pageSize: size,
      };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getTxDetail(txHash: string): Promise<ApiReturnType<TransactionDetail>> {
    try {
      const [txResp, utxosResp, metaResp] = await Promise.all([
        this.client.get<BfTx>(`/txs/${txHash}`),
        this.client.get<BfTxUtxos>(`/txs/${txHash}/utxos`),
        this.client.get<any[]>(`/txs/${txHash}/metadata`).catch(() => ({ data: [] }))
      ]);
      const tx = txResp.data;
      const block = await this._fetchBlockRaw(tx.block);

      const metadata = (metaResp as any).data?.length
        ? (metaResp as any).data.map((m: any) => ({ label: parseInt(m.label, 10), value: m.json_metadata != null ? JSON.stringify(m.json_metadata) : (m.cbor_metadata ?? "null") }))
        : undefined;

      // Build summary map from UTXOs — matches gateway transactionService
      const summaryMap: Record<string, { address: string; value: number; tokens: Token[] }> = {};
      const allUtxos = [
        ...(utxosResp.data.inputs ?? []).map(u => ({ ...u, _isOutput: false })),
        ...(utxosResp.data.outputs ?? []).map(u => ({ ...u, _isOutput: true })),
      ];
      for (const u of allUtxos) {
        if ((u as any).reference) continue;
        const lovelace = parseInt(u.amount?.find((a: any) => a.unit === "lovelace")?.quantity ?? "0");
        const signed = u._isOutput ? -lovelace : lovelace;
        if (!summaryMap[u.address]) {
          summaryMap[u.address] = { address: u.address, value: 0, tokens: [] };
        }
        summaryMap[u.address].value += signed;

        for (const a of (u.amount ?? []).filter((a: any) => a.unit !== "lovelace")) {
          const qty = parseInt(a.quantity) * (u._isOutput ? -1 : 1);
          const existing = summaryMap[u.address].tokens.find(t => t.assetId === a.unit);
          if (existing) { existing.assetQuantity += qty; }
          else { summaryMap[u.address].tokens.push({ assetName: a.unit.slice(56), assetQuantity: qty, assetId: a.unit, policy: { policyId: a.unit.slice(0, 56) } }); }
        }
      }
      // Filter zero-quantity tokens
      for (const addr of Object.keys(summaryMap)) {
        summaryMap[addr].tokens = summaryMap[addr].tokens.filter(t => t.assetQuantity !== 0);
      }

      // Separate UTXOs and collaterals — matches gateway
      const inputUtxos = (utxosResp.data.inputs ?? []).filter((u: any) => !u.collateral && !u.reference).map(bfUtxoToUtxo);
      const outputUtxos = (utxosResp.data.outputs ?? []).filter((u: any) => !u.collateral).map(bfUtxoToUtxo);
      const inputCollaterals = (utxosResp.data.inputs ?? []).filter((u: any) => u.collateral).map(bfUtxoToUtxo);
      const outputCollaterals = (utxosResp.data.outputs ?? []).filter((u: any) => u.collateral).map(bfUtxoToUtxo);

      const detail: TransactionDetail = {
        tx: {
          hash: tx.hash,
          time: tx.block_time.toString(),
          blockNo: tx.block_height ?? 0,
          blockHash: tx.block,
          epochSlot: block.epoch_slot ?? 0,
          epochNo: block.epoch ?? 0,
          status: TRANSACTION_STATUS.SUCCESS,
          confirmation: block.confirmations ?? 0,
          fee: parseInt(tx.fees ?? "0"),
          totalOutput: computeTotalLovelaceOutput(tx.output_amount ?? []),
          maxEpochSlot: block.epoch_slot ?? 0,
          slotNo: tx.slot ?? 0,
          tags: computeTxTags(tx)
        },
        summary: { stakeAddress: Object.values(summaryMap) },
        utxOs: { inputs: inputUtxos, outputs: outputUtxos },
        collaterals: { collateralInputResponses: inputCollaterals, collateralOutputResponses: outputCollaterals },
        metadata,
        metadataHash: ""
      };

      // Fetch delegations — matches gateway
      if ((tx.delegation_count ?? 0) > 0) {
        const delegResp = await this.client.get<any[]>(`/txs/${txHash}/delegations`).catch(() => ({ data: [] }));
        detail.delegations = (delegResp.data ?? []).map((d: any) => ({ address: d.address, poolId: d.pool_id }));
      }

      // Fetch withdrawals
      if ((tx.withdrawal_count ?? 0) > 0) {
        const wdResp = await this.client.get<any[]>(`/txs/${txHash}/withdrawals`).catch(() => ({ data: [] }));
        detail.withdrawals = (wdResp.data ?? []).map((w: any) => ({
          stakeAddressFrom: w.address,
          addressTo: [""],
          amount: parseInt(w.amount)
        }));
      }

      // Fetch stake certificates
      if ((tx.stake_cert_count ?? 0) > 0) {
        const stakeResp = await this.client.get<any[]>(`/txs/${txHash}/stakes`).catch(() => ({ data: [] }));
        detail.stakeCertificates = (stakeResp.data ?? []).map((s: any) => ({
          stakeAddress: s.address,
          type: s.registration ? "STAKE_REGISTRATION" : "STAKE_DEREGISTRATION"
        }));
      }

      // Fetch pool certificates
      if ((tx.pool_update_count ?? 0) > 0 || (tx.pool_retire_count ?? 0) > 0) {
        const certs: TPoolCertificated[] = [];
        if ((tx.pool_update_count ?? 0) > 0) {
          const updResp = await this.client.get<any[]>(`/txs/${txHash}/pool_updates`).catch(() => ({ data: [] }));
          certs.push(...(updResp.data ?? []).map((cert: any) => ({
            cost: parseInt(cert.fixed_cost ?? "0"),
            margin: cert.margin_cost ?? 0,
            metadataHash: cert.metadata?.hash ?? "",
            metadataUrl: cert.metadata?.url ?? "",
            pledge: parseInt(cert.pledge ?? "0"),
            poolId: cert.pool_id,
            poolOwners: cert.owners ?? [],
            relays: (cert.relays ?? []).map((r: any) => ({
              dnsName: r.dns ?? "", dnsSrvName: r.dns_srv ?? "", ipv4: r.ipv4 ?? "", ipv6: r.ipv6 ?? "", port: r.port
            })),
            rewardAccount: cert.reward_account ?? "",
            type: "POOL_REGISTRATION" as const,
            vrfKey: cert.vrf_key ?? "",
            epoch: cert.active_epoch ?? 0,
          })));
        }
        if ((tx.pool_retire_count ?? 0) > 0) {
          const retResp = await this.client.get<any[]>(`/txs/${txHash}/pool_retires`).catch(() => ({ data: [] }));
          certs.push(...(retResp.data ?? []).map((cert: any) => ({
            poolId: cert.pool_id,
            epoch: cert.retiring_epoch ?? 0,
            type: "POOL_DEREGISTRATION" as const,
          } as TPoolCertificated)));
        }
        detail.poolCertificates = certs;
      }

      // Fetch MIR certificates
      if ((tx.mir_cert_count ?? 0) > 0) {
        const mirResp = await this.client.get<any[]>(`/txs/${txHash}/mirs`).catch(() => ({ data: [] }));
        detail.instantaneousRewards = (mirResp.data ?? []).map((m: any) => ({
          amount: m.amount,
          stakeAddress: m.address
        }));
      }

      return { data: detail, lastUpdated: Date.now() };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  private async _fetchTxSummary(hash: string, block: Block): Promise<Transaction> {
    const txResp = await this.client.get<BfTx>(`/txs/${hash}`);
    const tx = txResp.data;
    return {
      hash,
      blockNo: block.blockNo,
      time: tx.block_time.toString(),
      slot: tx.slot ?? 0,
      epochNo: block.epochNo ?? 0,
      epochSlotNo: block.epochSlotNo ?? 0,
      fee: parseInt(tx.fees ?? "0"),
      totalOutput: computeTotalLovelaceOutput(tx.output_amount ?? []),
      blockHash: tx.block,
      addressesInput: [],
      addressesOutput: [],
      balance: 0,
      tokens: [],
      tags: computeTxTags(tx)
    } satisfies Transaction;
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
        data: { address, balance, txCount: a.tx_count ?? 0, tokens, stakeAddress: a.stake_address ?? "", isContract: a.script ?? false },
        lastUpdated: Date.now()
      };
    } catch (e: any) {
      return { data: null, error: e.message, lastUpdated: Date.now() };
    }
  }

  async getAddressTxsFromAddress(address: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    try {
      const page = Math.max(1, Number(pageInfo.page ?? 1));
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<{ tx_hash: string; block_height: number; block_time: number }[]>(
        `/addresses/${address}/transactions`, { params: { page, count, order: "desc" } }
      );
      const txs = await Promise.all(
        (resp.data ?? []).map(async (t) => {
          const block = bfBlockToBlock(await this._fetchBlockRaw(String(t.block_height)));
          return this._fetchTxSummary(t.tx_hash, block);
        })
      );
      return { data: txs, lastUpdated: Date.now(), currentPage: page - 1, pageSize: count };
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
      const page = Math.max(1, Number(pageInfo.page ?? 1));
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<BfAsset[]>("/assets", { params: { page, count, order: "desc" } });
      return {
        data: (resp.data ?? []).map(bfAssetToTokenOverview),
        lastUpdated: Date.now(),
        currentPage: page - 1,
        pageSize: count,
      };
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
      const page = Math.max(1, Number(pageInfo.page ?? 1));
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<{ tx_hash: string; tx_index: number; block_height: number }[]>(
        `/assets/${tokenId}/transactions`, { params: { page, count, order: "desc" } }
      );
      const txs = await Promise.all(
        (resp.data ?? []).map(async (t) => {
          const block = bfBlockToBlock(await this._fetchBlockRaw(String(t.block_height)));
          return this._fetchTxSummary(t.tx_hash, block);
        })
      );
      return { data: txs, lastUpdated: Date.now(), currentPage: page - 1, pageSize: count };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getTokenHolders(tokenId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<TokenHolder[]>> {
    try {
      const page = Math.max(1, Number(pageInfo.page ?? 1));
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<{ address: string; quantity: string }[]>(
        `/assets/${tokenId}/addresses`, { params: { page, count } }
      );
      return {
        data: (resp.data ?? []).map((h) => ({ address: h.address, amount: parseInt(h.quantity), ratio: 0 })),
        lastUpdated: Date.now(),
        currentPage: page - 1,
        pageSize: count,
      };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getTokensByPolicy(policyId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<ITokenOverview[]>> {
    try {
      const page = Math.max(1, Number(pageInfo.page ?? 1));
      const count = Number(pageInfo.size ?? 50);
      const resp = await this.client.get<{ asset: string; quantity: string }[]>(
        `/assets/policy/${policyId}`, { params: { page, count } }
      );
      const tokens: ITokenOverview[] = (resp.data ?? []).map((a) => ({
        policy: policyId,
        displayName: hexToUtf8(a.asset.slice(56)) || a.asset.slice(56),
        supply: parseInt(a.quantity),
        fingerprint: a.asset
      }));
      return { data: tokens, lastUpdated: Date.now(), currentPage: page - 1, pageSize: count };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  // ── Governance ────────────────────────────────────────────────────────────

  async getGovernanceOverviewList(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>> {
    try {
      const page = Math.max(1, Number(pageInfo.page ?? 1));
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<any[]>(
        "/governance/proposals", { params: { page, count, order: "desc" } }
      );
      const items: GovernanceActionListItem[] = (resp.data ?? []).map((p) => ({
        txHash: p.tx_hash,
        index: p.cert_index,
        type: p.governance_type,
        status: p.expired_epoch ? "EXPIRED" : p.enacted_epoch ? "ENACTED" : "ACTIVE",
        expiredEpoch: p.expired_epoch ?? p.expiration ?? null,
        enactedEpoch: p.enacted_epoch ?? null,
      }));
      return { data: items, lastUpdated: Date.now(), currentPage: page - 1, pageSize: count };
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
      const page = Math.max(1, Number(pageInfo.page ?? 1));
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
      return { data: pools, lastUpdated: Date.now(), currentPage: page - 1, pageSize: count };
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
      const total: number = poolResp.data?.blocks_minted ?? 0;
      const rawBlocks = await Promise.all((hashesResp.data ?? []).map(h => this._fetchBlockRaw(h)));
      const poolMeta = await this._fetchPoolMetaBatch(rawBlocks.map(b => b.slot_leader));
      return {
        data: rawBlocks.map(b => bfBlockToBlock(b, poolMeta)),
        total,
        lastUpdated: Date.now(),
        currentPage: page - 1,
        pageSize: count,
      };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now(), total: 0, currentPage: 0, pageSize: 20 };
    }
  }

  // ── DReps ─────────────────────────────────────────────────────────────────

  async getDreps(pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Drep[]>> {
    try {
      const page = Math.max(1, Number(pageInfo.page ?? 1));
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<any[]>("/governance/dreps", { params: { page, count } });
      return { data: (resp.data ?? []).map(bfDrepToDrep), lastUpdated: Date.now(), currentPage: page - 1, pageSize: count };
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
      const page = Math.max(1, Number(pageInfo.page ?? 1));
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<any[]>(`/governance/dreps/${drepId}/votes`, { params: { page, count } });
      const items: GovernanceActionListItem[] = (resp.data ?? []).map((v) => ({
        txHash: v.proposal_tx_hash ?? "",
        index: v.proposal_cert_index ?? 0,
        vote: (v.vote ?? "abstain").toLowerCase() as "yes" | "no" | "abstain"
      }));
      return { data: items, lastUpdated: Date.now(), currentPage: page - 1, pageSize: count };
    } catch (e: any) {
      return { data: [], error: e.message, lastUpdated: Date.now() };
    }
  }

  async getDrepDelegates(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<DrepDelegates[]>> {
    try {
      const page = Math.max(1, Number(pageInfo.page ?? 1));
      const count = Number(pageInfo.size ?? 20);
      const resp = await this.client.get<any[]>(`/governance/dreps/${drepId}/delegators`, { params: { page, count } });
      return {
        data: (resp.data ?? []).map((d) => ({ address: d.address ?? "", amount: parseInt(d.amount ?? "0") })),
        lastUpdated: Date.now(), currentPage: page - 1, pageSize: count,
      };
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

  // ── Dashboard stats ────────────────────────────────────────────────────────

  async getDashboardStats(): Promise<ApiReturnType<DashboardStats>> {
    return this.request<DashboardStats>(async () => {
      const [latestBlock, network, latestEpoch] = await Promise.all([
        this.client.get<BfBlock>("/blocks/latest"),
        this.client.get<{ supply: { circulating: string; total: string; max: string; locked: string }; stake: { live: string; active: string } }>("/network"),
        this.client.get<BfEpoch>("/epochs/latest"),
      ]);
      const now = Math.floor(Date.now() / 1000);
      const epoch = latestEpoch.data;
      const block = latestBlock.data;
      const progressPercent = epoch.start_time && epoch.end_time
        ? Math.min(100, Math.round(((now - epoch.start_time) / (epoch.end_time - epoch.start_time)) * 100))
        : 0;
      return {
        currentEpoch: {
          no: epoch.epoch,
          startTime: epoch.start_time,
          endTime: epoch.end_time,
          txCount: epoch.tx_count,
          blkCount: epoch.block_count,
          outSum: epoch.output,
          fees: epoch.fees ?? null,
          activeStake: epoch.active_stake ?? null,
          progressPercent,
        },
        latestBlock: {
          height: block.height ?? null,
          hash: block.hash,
          slot: block.slot ?? null,
          epochNo: block.epoch ?? null,
          epochSlot: block.epoch_slot ?? null,
          time: block.time,
          txCount: block.tx_count ?? 0,
          size: block.size ?? 0,
        },
        supply: network.data.supply,
        stake: network.data.stake,
      };
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────

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
        probe(() => this.client.get(`/governance/proposals/${txHash}/${indexStr}`)),
        probe(() => this.client.get(`/txs/${txHash}`)),
      ]);
      if (govResult) results.push({ type: "gov_action", id: txHash, extraId: indexStr });
      else if (txResult) results.push({ type: "transaction", id: txHash });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // 64-char hex: transaction hash OR block hash
    if (/^[0-9a-f]{64}$/i.test(q)) {
      const [txResult, blockResult] = await Promise.all([
        probe(() => this.client.get<any>(`/txs/${q}`)),
        probe(() => this.client.get<any>(`/blocks/${q}`)),
      ]);
      if (txResult) results.push({ type: "transaction", id: q });
      if (blockResult) results.push({ type: "block", id: q, label: blockResult.data?.height != null ? String(blockResult.data.height) : undefined });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // 56-char hex: policy ID
    if (/^[0-9a-f]{56}$/i.test(q)) {
      const assets = await probe(() => this.client.get<any[]>(`/assets/policy/${q}`, { params: { count: 1, page: 1 } }));
      if (assets?.data?.length) results.push({ type: "policy", id: q });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    if (/^addr1[a-z0-9]+$/i.test(q)) {
      results.push({ type: "address", id: q });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    if (/^stake1[a-z0-9]+$/i.test(q)) {
      results.push({ type: "stake", id: q });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    if (/^pool1[a-z0-9]{50,}$/i.test(q)) {
      const poolResult = await probe(() => this.client.get<any>(`/pools/${q}`));
      if (poolResult) {
        const meta = await probe(() => this.client.get<any>(`/pools/${q}/metadata`));
        results.push({ type: "pool", id: q, label: meta?.data?.ticker ?? meta?.data?.name ?? undefined });
      }
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    if (/^drep1[a-z0-9]+$/i.test(q)) {
      const drepResult = await probe(() => this.client.get(`/governance/dreps/${q}`));
      if (drepResult) results.push({ type: "drep", id: q });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    if (/^asset1[a-z0-9]+$/i.test(q)) {
      const assetResult = await probe(() => this.client.get<any>(`/assets/${q}`));
      if (assetResult) {
        results.push({ type: "token", id: q, label: assetResult.data?.metadata?.name ?? undefined });
      }
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // Pure number: epoch or block
    if (/^\d+$/.test(q)) {
      const n = Number(q);
      const [epochResult, blockResult] = await Promise.all([
        probe(() => this.client.get<any>(`/epochs/${n}`)),
        probe(() => this.client.get<any>(`/blocks/${n}`)),
      ]);
      if (epochResult) results.push({ type: "epoch", id: q });
      if (blockResult) results.push({ type: "block", id: q, label: String(n) });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }

    // Free-text: scan recently-minted assets for name match
    if (/^[a-zA-Z0-9$.\-_ ]+$/.test(q)) {
      for (let page = 1; page <= 3 && results.length < 5; page++) {
        const assets = await probe(() => this.client.get<any[]>(`/assets`, { params: { count: 100, page } }));
        if (!assets?.data?.length) break;
        for (const asset of assets.data) {
          if (!asset.asset || asset.asset.length <= 56) continue;
          const decoded = hexToUtf8(asset.asset.slice(56));
          if (!decoded || !decoded.toLowerCase().includes(q.toLowerCase())) continue;
          results.push({ type: "token", id: asset.asset, label: decoded });
          if (results.length >= 5) break;
        }
      }
    }

    return { data: results, lastUpdated: Date.now(), total: results.length };
  }
}

// ── Blockfrost response types ────────────────────────────────────────────────

interface BfEpoch {
  epoch: number;
  start_time: number;
  end_time: number;
  block_count: number;
  tx_count: number;
  output: string;
  fees?: string;
  active_stake?: string;
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
  size?: number;
  previous_block?: string;
  next_block?: string;
  slot_leader?: string;
  confirmations?: number;
  block_vrf?: string;
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
  asset_mint_or_burn_count?: number;
  delegation_count?: number;
  stake_cert_count?: number;
  withdrawal_count?: number;
  mir_cert_count?: number;
  pool_update_count?: number;
  pool_retire_count?: number;
  redeemer_count?: number;
}

interface BfTxUtxos {
  inputs?: BfUtxo[];
  outputs?: BfUtxo[];
}

interface BfUtxo {
  address: string;
  amount: { unit: string; quantity: string }[];
  tx_hash: string;
  output_index?: number;
  collateral?: boolean;
  reference?: boolean;
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

// ── Helper functions ─────────────────────────────────────────────────────────

function bfEpochToOverview(e: BfEpoch, latestEpochNo: number): EpochOverview {
  const now = Math.floor(Date.now() / 1000);
  return {
    no: e.epoch,
    status: getEpochStatus(e.epoch, latestEpochNo),
    blkCount: e.block_count,
    txCount: e.tx_count,
    outSum: parseInt(e.output ?? "0"),
    startTime: e.start_time.toString(),
    endTime: e.end_time.toString(),
    syncingProgress: getEpochProgress(e.start_time, e.end_time, now),
    epochSlotNo: computeEpochSlotNo(e.epoch, latestEpochNo, e.start_time, e.end_time, now),
    maxSlot: MAINNET_EPOCH_MAX_SLOT,
    rewardsDistributed: 0,
    account: 0,
    fees: parseInt(e.fees ?? "0"),
    activeStake: parseInt(e.active_stake ?? "0"),
  };
}

function bfBlockToBlock(b: BfBlock, poolMeta?: Map<string, { name: string; ticker: string }>): Block {
  const meta = b.slot_leader && poolMeta ? poolMeta.get(b.slot_leader) : undefined;
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
    size: b.size ?? 0,
    previousBlock: b.previous_block,
    nextBlock: b.next_block,
    slotLeader: b.slot_leader,
    poolName: meta?.name ?? "",
    poolTicker: meta?.ticker ?? "",
    confirmation: b.confirmations,
    blockVrf: b.block_vrf,
  } as Block;
}

function bfUtxoToUtxo(u: BfUtxo): any {
  return {
    address: u.address,
    value: parseInt(u.amount?.find((a) => a.unit === "lovelace")?.quantity ?? "0"),
    txHash: u.tx_hash,
    index: String(u.output_index ?? 0),
    tokens: (u.amount ?? []).filter((a) => a.unit !== "lovelace").map((a) => ({
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
    displayName: hexToUtf8(a.asset.slice(56)) || a.asset.slice(56) || a.asset,
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

function hexToUtf8(hex: string): string {
  if (!hex) return "";
  try {
    const bytes = hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16));
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  } catch { return ""; }
}
