import { OgmiosStakePool, OgmiosStakePools } from "../types";
import { PoolOverview, PoolDetail, POOL_STATUS } from "../../dtos/pool.dto";
import { parseRatio } from "../helpers/parseRatio";

export function poolSaturation(stake: number, totalActiveStake: number, nOpt: number): number {
  if (!totalActiveStake || !nOpt) return 0;
  const saturationPoint = totalActiveStake / nOpt;
  return saturationPoint > 0 ? stake / saturationPoint : 0;
}

export function mapStakePoolsToOverviews(
  pools: OgmiosStakePools,
  ctx: { totalActiveStake: number; nOpt: number }
): PoolOverview[] {
  return Object.entries(pools).map(([id, p], index) => {
    const stake = p.stake?.ada.lovelace ?? 0;
    return {
      id: index,
      poolId: id,
      poolName: "",
      tickerName: "",
      poolSize: stake,
      declaredPledge: p.pledge.ada.lovelace,
      saturation: poolSaturation(stake, ctx.totalActiveStake, ctx.nOpt),
      lifetimeBlock: 0
    };
  });
}

export function mapStakePoolToDetail(
  pool: OgmiosStakePool,
  ctx: { totalActiveStake: number; nOpt: number }
): PoolDetail {
  const stake = pool.stake?.ada.lovelace ?? 0;
  return {
    poolName: "",
    tickerName: "",
    poolView: pool.id,
    poolStatus: POOL_STATUS.ACTIVE,
    createDate: "",
    rewardAccounts: pool.rewardAccount ? [pool.rewardAccount] : [],
    ownerAccounts: pool.owners ?? [],
    poolSize: stake,
    stakeLimit: ctx.nOpt ? ctx.totalActiveStake / ctx.nOpt : 0,
    delegators: 0,
    saturation: poolSaturation(stake, ctx.totalActiveStake, ctx.nOpt),
    totalBalanceOfPoolOwners: 0,
    reward: 0,
    ros: 0,
    pledge: pool.pledge.ada.lovelace,
    cost: pool.cost.ada.lovelace,
    margin: parseRatio(pool.margin),
    epochBlock: 0,
    lifetimeBlock: 0,
    vrfKey: pool.vrfVerificationKeyHash,
    homepage: pool.metadata?.url,
    relays: (pool.relays ?? []).map((r) => ({
      dns: r.hostname,
      ipv4: r.ipv4,
      ipv6: r.ipv6,
      port: r.port
    }))
  };
}
