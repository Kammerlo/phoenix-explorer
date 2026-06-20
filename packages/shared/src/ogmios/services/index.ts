import { ParsedUrlQuery } from "querystring";
import { ApiReturnType } from "../../APIReturnType";
import { envelope, errorEnvelope } from "../../helpers/envelope";
import { OgmiosClient, KupoClient } from "../client";
import {
  OgmiosProtocolParameters, OgmiosStakePools, OgmiosStakePool, OgmiosDelegateRepresentative,
  OgmiosGovernanceProposal, OgmiosTip, OgmiosEraSummary, OgmiosTreasuryAndReserves,
  OgmiosUtxo, OgmiosRewardAccountSummary, KupoMatch
} from "../types";
import { mapProtocolParameters } from "../mappers/protocolParameters";
import { mapDashboardStats } from "../mappers/dashboard";
import { mapStakePoolsToOverviews, mapStakePoolToDetail } from "../mappers/pools";
import { mapDelegateRepresentative } from "../mappers/dreps";
import { mapProposalToListItem, mapProposalToDetail, mapProposalVotes } from "../mappers/governance";
import { mapUtxosToAddressDetail, mapRewardSummaryToStakeDetail } from "../mappers/address";
import { mapKupoMatchesToHolders } from "../mappers/tokens";
import { epochBounds } from "../helpers/era";
import { EpochStatus } from "../../dtos/epoch.dto";
import { SearchResult } from "../../dtos/seach.dto";

export interface OgmiosBackends {
  ogmios: OgmiosClient;
  kupo?: KupoClient;
}

function pageOf(pageInfo: ParsedUrlQuery): { page: number; size: number } {
  const page = Math.max(1, parseInt(String(pageInfo?.page ?? "1"), 10) || 1);
  const size = Math.max(1, parseInt(String(pageInfo?.size ?? "50"), 10) || 50);
  return { page, size };
}

function paginate<T>(
  all: T[],
  pageInfo: ParsedUrlQuery
): { slice: T[]; total: number; extras: { total: number; currentPage: number; pageSize: number; totalPage: number } } {
  const { page, size } = pageOf(pageInfo);
  const start = (page - 1) * size;
  return {
    slice: all.slice(start, start + size),
    total: all.length,
    extras: { total: all.length, currentPage: page, pageSize: size, totalPage: Math.ceil(all.length / size) }
  };
}

async function run<T>(fn: () => Promise<T>, fallback: T | null = null): Promise<ApiReturnType<T>> {
  try { return envelope<T>(await fn()); } catch (err) { return errorEnvelope<T>(err, fallback); }
}

async function runPaged<T>(
  fn: () => Promise<{ slice: T[]; extras: { total: number; currentPage: number; pageSize: number; totalPage: number } }>,
  fallback: T[] = []
): Promise<ApiReturnType<T[]>> {
  try {
    const { slice, extras } = await fn();
    return envelope<T[]>(slice, extras);
  } catch (err) {
    return errorEnvelope<T[]>(err, fallback);
  }
}

export const ogmiosServices = {
  getCurrentProtocolParameters: ({ ogmios }: OgmiosBackends) =>
    run(async () => mapProtocolParameters(await ogmios.query<OgmiosProtocolParameters>("queryLedgerState/protocolParameters"))),

  getDashboardStats: ({ ogmios }: OgmiosBackends) =>
    run(async () => {
      const [blockHeight, tip, epoch, eras, tr] = await Promise.all([
        ogmios.query<number>("queryNetwork/blockHeight"),
        ogmios.query<OgmiosTip>("queryNetwork/tip"),
        ogmios.query<number>("queryLedgerState/epoch"),
        ogmios.query<OgmiosEraSummary[]>("queryLedgerState/eraSummaries"),
        ogmios.query<OgmiosTreasuryAndReserves>("queryLedgerState/treasuryAndReserves")
      ]);
      // Total live/active stake is not cheaply available from local state; reported as 0 (documented degradation).
      return mapDashboardStats({ blockHeight, tip, epoch, eras, treasuryAndReserves: tr, liveStake: 0 });
    }),

  getEpoch: ({ ogmios }: OgmiosBackends, _epochId: number) =>
    run(async () => {
      const [epoch, eras] = await Promise.all([
        ogmios.query<number>("queryLedgerState/epoch"),
        ogmios.query<OgmiosEraSummary[]>("queryLedgerState/eraSummaries")
      ]);
      const b = epochBounds(epoch, eras);
      return {
        no: epoch, status: EpochStatus.IN_PROGRESS, blkCount: 0,
        endTime: String(b.endTime), startTime: String(b.startTime),
        outSum: 0, txCount: 0, epochSlotNo: 0, maxSlot: b.epochLength,
        rewardsDistributed: 0, account: 0, syncingProgress: 0
      };
    }),

  getPoolList: ({ ogmios }: OgmiosBackends, pageInfo: ParsedUrlQuery) =>
    runPaged(async () => {
      const [pools, pp] = await Promise.all([
        ogmios.query<OgmiosStakePools>("queryLedgerState/stakePools", { includeStake: true }),
        ogmios.query<OgmiosProtocolParameters>("queryLedgerState/protocolParameters")
      ]);
      const totalActiveStake = Object.values(pools).reduce((s, p) => s + (p.stake?.ada.lovelace ?? 0), 0);
      const ctx = { totalActiveStake, nOpt: pp.desiredNumberOfStakePools };
      const all = mapStakePoolsToOverviews(pools, ctx);
      return paginate(all, pageInfo);
    }),

  getPoolDetail: ({ ogmios }: OgmiosBackends, poolId: string) =>
    run(async () => {
      const [pools, pp] = await Promise.all([
        ogmios.query<OgmiosStakePools>("queryLedgerState/stakePools", { includeStake: true }),
        ogmios.query<OgmiosProtocolParameters>("queryLedgerState/protocolParameters")
      ]);
      const totalActiveStake = Object.values(pools).reduce((s, p) => s + (p.stake?.ada.lovelace ?? 0), 0);
      const ctx = { totalActiveStake, nOpt: pp.desiredNumberOfStakePools };
      const raw: OgmiosStakePool | undefined = pools[poolId];
      if (!raw) throw new Error(`pool not found: ${poolId}`);
      return mapStakePoolToDetail(raw, ctx);
    }),

  getDreps: ({ ogmios }: OgmiosBackends, pageInfo: ParsedUrlQuery) =>
    runPaged(async () => {
      const dreps = await ogmios.query<OgmiosDelegateRepresentative[]>("queryLedgerState/delegateRepresentatives");
      const all = dreps.map(mapDelegateRepresentative);
      return paginate(all, pageInfo);
    }),

  getDrep: ({ ogmios }: OgmiosBackends, drepId: string) =>
    run(async () => {
      const dreps = await ogmios.query<OgmiosDelegateRepresentative[]>("queryLedgerState/delegateRepresentatives");
      const found = dreps.find((d) => d.id === drepId);
      if (!found) throw new Error(`drep not found: ${drepId}`);
      return mapDelegateRepresentative(found);
    }),

  getGovernanceOverviewList: ({ ogmios }: OgmiosBackends, pageInfo: ParsedUrlQuery) =>
    runPaged(async () => {
      const props = await ogmios.query<OgmiosGovernanceProposal[]>("queryLedgerState/governanceProposals");
      const all = props.map(mapProposalToListItem);
      return paginate(all, pageInfo);
    }),

  getGovernanceDetail: ({ ogmios }: OgmiosBackends, txHash: string, index: string) =>
    run(async () => {
      const props = await ogmios.query<OgmiosGovernanceProposal[]>("queryLedgerState/governanceProposals");
      const found = props.find((p) => p.proposal.transaction.id === txHash && String(p.proposal.index) === String(index));
      if (!found) throw new Error(`proposal not found: ${txHash}#${index}`);
      return mapProposalToDetail(found);
    }),

  getGovernanceActionVotes: ({ ogmios }: OgmiosBackends, txHash: string, index: string) =>
    run(async () => {
      const props = await ogmios.query<OgmiosGovernanceProposal[]>("queryLedgerState/governanceProposals");
      const found = props.find((p) => p.proposal.transaction.id === txHash && String(p.proposal.index) === String(index));
      return found ? mapProposalVotes(found) : [];
    }, []),

  getWalletAddressFromAddress: ({ ogmios }: OgmiosBackends, address: string) =>
    run(async () => {
      const utxos = await ogmios.query<OgmiosUtxo[]>("queryLedgerState/utxo", { addresses: [address] });
      return mapUtxosToAddressDetail(address, utxos);
    }),

  getWalletStakeFromAddress: ({ ogmios }: OgmiosBackends, address: string) =>
    run(async () => {
      const summaries = await ogmios.query<OgmiosRewardAccountSummary[]>("queryLedgerState/rewardAccountSummaries", { keys: [address] });
      return mapRewardSummaryToStakeDetail(address, summaries[0]);
    }),

  getTokenHolders: ({ kupo }: OgmiosBackends, tokenId: string, pageInfo: ParsedUrlQuery) =>
    runPaged(async () => {
      if (!kupo) throw new Error("Kupo not configured");
      const matches = await kupo.matches<KupoMatch[]>(unitToKupoPattern(tokenId), { unspent: true });
      const all = mapKupoMatchesToHolders(matches, tokenId);
      return paginate(all, pageInfo);
    }),

  getTokensByPolicy: ({ kupo }: OgmiosBackends, policyId: string, pageInfo: ParsedUrlQuery) =>
    runPaged(async () => {
      if (!kupo) throw new Error("Kupo not configured");
      const matches = await kupo.matches<KupoMatch[]>(`${policyId}.*`, { unspent: true });
      const byUnit = new Map<string, number>();
      for (const m of matches) for (const [unit, qty] of Object.entries(m.value.assets ?? {})) if (unit.startsWith(policyId)) byUnit.set(unit, (byUnit.get(unit) ?? 0) + qty);
      const all = [...byUnit.entries()].map(([unit, supply]) => ({ policy: policyId, fingerprint: unit, supply, name: unit.slice(policyId.length) }));
      return paginate(all, pageInfo);
    }),

  getTokenDetail: ({ kupo }: OgmiosBackends, tokenId: string) =>
    run(async () => {
      if (!kupo) throw new Error("Kupo not configured");
      const matches = await kupo.matches<KupoMatch[]>(unitToKupoPattern(tokenId), { unspent: true });
      let supply = 0;
      const holders = new Set<string>();
      for (const m of matches) { const q = m.value.assets?.[tokenId] ?? 0; if (q > 0) { supply += q; holders.add(m.address); } }
      const policy = tokenId.slice(0, 56);
      return { policy, fingerprint: tokenId, name: tokenId.slice(56), supply, numberOfHolders: holders.size };
    }),

  search: ({ ogmios, kupo }: OgmiosBackends, query: string) =>
    run(async () => {
      const q = query.trim();
      const results: SearchResult[] = [];
      if (q.startsWith("pool1")) results.push({ type: "pool", id: q });
      else if (q.startsWith("drep1")) results.push({ type: "drep", id: q });
      else if (q.startsWith("stake1")) results.push({ type: "stake", id: q });
      else if (q.startsWith("addr1")) results.push({ type: "address", id: q });
      else if (/^[0-9a-fA-F]{56}$/.test(q)) results.push({ type: "policy", id: q });
      void ogmios; void kupo;
      return results;
    }, [])
};

function unitToKupoPattern(unit: string): string {
  return unit.length > 56 ? `${unit.slice(0, 56)}.${unit.slice(56)}` : unit;
}
