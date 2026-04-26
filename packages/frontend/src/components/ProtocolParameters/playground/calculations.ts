/**
 * Pure functions used by every playground simulator. Kept side-effect-free
 * so they can be unit-tested in isolation and reused across sections.
 *
 * All ADA values are returned in lovelace unless the function name says
 * otherwise (`ada` suffix, or a comment).
 */

export const LOVELACE_PER_ADA = 1_000_000;

// Approx Cardano constants used for live-anchor estimates when an exact
// real-time number isn't reachable from the connector. Sourced from
// yaci-store mainnet snapshots (Apr 2026) — refresh periodically. Adjust
// here, not inline in components.
export const APPROX_TOTAL_SUPPLY_ADA = 45_000_000_000;
export const APPROX_CIRCULATING_ADA = 38_600_000_000;
export const APPROX_TREASURY_ADA = 1_620_000_000;
export const APPROX_RESERVES_ADA = 6_410_000_000;
export const APPROX_ACTIVE_STAKE_ADA = 21_800_000_000;
export const APPROX_ACTIVE_STAKE_KEYS = 1_280_000;
export const APPROX_ACTIVE_POOLS = 3_000;
export const APPROX_OPEN_GOV_ACTIONS = 30;

export const EPOCHS_PER_YEAR = 73;
export const MAINNET_EPOCH_DAYS = 5;
export const AVG_BLOCK_TIME_SECONDS = 20;

// ── Fees ────────────────────────────────────────────────────────────────────
export const txFeeLovelace = (txBytes: number, minFeeA: number, minFeeB: number): number =>
  Math.round(minFeeB + Math.max(0, txBytes) * Math.max(0, minFeeA));

export const lovelaceToAda = (l: number): number => l / LOVELACE_PER_ADA;

// ── Throughput ──────────────────────────────────────────────────────────────
export const txPerBlock = (maxBlockBytes: number, avgTxBytes: number): number =>
  avgTxBytes > 0 ? Math.floor(maxBlockBytes / avgTxBytes) : 0;

export const tpsEstimate = (maxBlockBytes: number, avgTxBytes: number): number => {
  const perBlock = txPerBlock(maxBlockBytes, avgTxBytes);
  return perBlock / AVG_BLOCK_TIME_SECONDS;
};

// ── UTxO min-ADA ────────────────────────────────────────────────────────────
export const minAdaForUtxoLovelace = (coinsPerUTxOByte: number, outputBytes: number): number =>
  Math.max(0, coinsPerUTxOByte) * Math.max(0, outputBytes);

// ── Rewards ─────────────────────────────────────────────────────────────────
/**
 * Epoch reward pool minted from reserves: `reservesADA * rho`.
 */
export const epochRewardsAda = (reservesAda: number, rho: number): number =>
  Math.max(0, reservesAda) * Math.max(0, rho);

export const treasuryShareAda = (epochRewardsAda: number, tau: number): number =>
  epochRewardsAda * Math.max(0, Math.min(1, tau));

export const poolsShareAda = (epochRewardsAda: number, tau: number): number =>
  epochRewardsAda * (1 - Math.max(0, Math.min(1, tau)));

/**
 * Coarse staking APY estimate. Real APY varies with pool performance, fees,
 * and luck — this function intentionally produces a network-wide upper bound.
 */
export const estimatedStakingApyPct = (
  reservesAda: number,
  rho: number,
  tau: number,
  activeStakeAda: number = APPROX_ACTIVE_STAKE_ADA
): number => {
  if (activeStakeAda <= 0) return 0;
  const epochToPools = poolsShareAda(epochRewardsAda(reservesAda, rho), tau);
  const annualToPools = epochToPools * EPOCHS_PER_YEAR;
  return (annualToPools / activeStakeAda) * 100;
};

/**
 * Years of reward distribution remaining at current ρ before reserves halve.
 * Reserves decay multiplicatively: reserves(n+1) = reserves(n) * (1 - ρ).
 */
export const halfLifeEpochs = (rho: number): number => {
  if (rho <= 0 || rho >= 1) return Number.POSITIVE_INFINITY;
  return Math.log(0.5) / Math.log(1 - rho);
};

export const halfLifeYears = (rho: number): number =>
  halfLifeEpochs(rho) / EPOCHS_PER_YEAR;

// ── Pool mechanics ──────────────────────────────────────────────────────────
export const saturationPointAda = (
  k: number,
  totalActiveStakeAda: number = APPROX_ACTIVE_STAKE_ADA
): number => (k > 0 ? totalActiveStakeAda / k : 0);

export const saturationPct = (
  poolStakeAda: number,
  k: number,
  totalActiveStakeAda: number = APPROX_ACTIVE_STAKE_ADA
): number => {
  const sat = saturationPointAda(k, totalActiveStakeAda);
  return sat > 0 ? (poolStakeAda / sat) * 100 : 0;
};

/**
 * Pledge influence bonus (% rewards uplift) approximated as a0 × pledge/sat.
 * The exact ledger formula is non-linear; this is the linearized first-order
 * term that's accurate when pool stake ≈ saturation point and pledge is small.
 * Documented as an approximation in the UI.
 */
export const pledgeBonusPct = (
  pledgeAda: number,
  k: number,
  a0: number,
  totalActiveStakeAda: number = APPROX_ACTIVE_STAKE_ADA
): number => {
  const sat = saturationPointAda(k, totalActiveStakeAda);
  if (sat <= 0) return 0;
  // The real ledger formula caps the bonus at saturation: extra pledge past
  // the saturation point gives no additional reward share.
  const effective = Math.min(Math.max(0, pledgeAda), sat);
  return a0 * (effective / sat) * 100;
};

// ── Plutus scripts ──────────────────────────────────────────────────────────
export const scriptFeeLovelace = (
  memUnits: number,
  cpuSteps: number,
  priceMem: number,
  priceStep: number
): number => Math.round(memUnits * priceMem + cpuSteps * priceStep);

// ── Collateral ──────────────────────────────────────────────────────────────
export const requiredCollateralLovelace = (
  scriptFeeLovelace: number,
  collateralPercent: number
): number => Math.ceil(scriptFeeLovelace * (collateralPercent / 100));

// ── Governance / time ───────────────────────────────────────────────────────
export const epochsToDays = (epochs: number, epochDays: number = MAINNET_EPOCH_DAYS): number =>
  Math.max(0, epochs) * epochDays;

export const epochsToMonths = (epochs: number, epochDays: number = MAINNET_EPOCH_DAYS): number =>
  epochsToDays(epochs, epochDays) / 30.4375;

export const epochsToYears = (epochs: number, epochDays: number = MAINNET_EPOCH_DAYS): number =>
  epochsToDays(epochs, epochDays) / 365.25;

// ── Reserves projection ─────────────────────────────────────────────────────

export interface ReserveProjectionPoint {
  /** Epochs from now. */
  epoch: number;
  /** Years from now (epoch / EPOCHS_PER_YEAR). */
  years: number;
  /** Projected reserves at this epoch, in billions of ADA. */
  reservesB: number;
  /** Projected per-epoch pool+delegator reward, in millions of ADA. */
  rewardsM: number;
}

/**
 * Project reserves and per-epoch rewards forward at constant ρ and τ.
 *
 * Reserves decay multiplicatively: `reserves(n) = reserves(0) × (1 - ρ)ⁿ`.
 * Per-epoch rewards to pools/delegators: `reserves(n) × ρ × (1 - τ)`.
 */
export const projectReserves = (
  initialReservesAda: number,
  rho: number,
  tau: number,
  horizonEpochs: number = 1500,
  stepEpochs: number = 25
): ReserveProjectionPoint[] => {
  const out: ReserveProjectionPoint[] = [];
  const decay = 1 - Math.max(0, Math.min(1, rho));
  for (let epoch = 0; epoch <= horizonEpochs; epoch += stepEpochs) {
    const r = initialReservesAda * Math.pow(decay, epoch);
    const rewards = r * rho * (1 - Math.max(0, Math.min(1, tau)));
    out.push({
      epoch,
      years: epoch / EPOCHS_PER_YEAR,
      reservesB: r / 1_000_000_000,
      rewardsM: rewards / 1_000_000
    });
  }
  return out;
};

// ── Sustainability ──────────────────────────────────────────────────────────

export const SECONDS_PER_EPOCH_MAINNET = MAINNET_EPOCH_DAYS * 24 * 60 * 60;

/**
 * Fee revenue (ADA) collected per epoch at a sustained throughput, given a
 * fixed average per-tx fee. Assumes uniform traffic across the epoch.
 */
export const feeRevenuePerEpochAda = (
  tps: number,
  avgFeeAda: number,
  secondsPerEpoch: number = SECONDS_PER_EPOCH_MAINNET
): number => Math.max(0, tps) * Math.max(0, avgFeeAda) * secondsPerEpoch;

/**
 * Minimum sustained TPS required to fund a target per-epoch reward pool out
 * of transaction fees alone — i.e. the post-reserves equilibrium.
 */
export const tpsNeededForRewardsAda = (
  targetRewardsAda: number,
  avgFeeAda: number,
  secondsPerEpoch: number = SECONDS_PER_EPOCH_MAINNET
): number => {
  const denom = Math.max(0, avgFeeAda) * secondsPerEpoch;
  return denom > 0 ? targetRewardsAda / denom : 0;
};

// ── Deposits ────────────────────────────────────────────────────────────────
export interface NetworkDepositTotals {
  poolsLockedLovelace: number;
  stakeKeysLockedLovelace: number;
  govActionsLockedLovelace: number;
  totalLockedLovelace: number;
}

export const estimateNetworkDeposits = (
  keyDeposit: number,
  poolDeposit: number,
  govActionDeposit: number,
  pools: number = APPROX_ACTIVE_POOLS,
  stakeKeys: number = APPROX_ACTIVE_STAKE_KEYS,
  govActions: number = APPROX_OPEN_GOV_ACTIONS
): NetworkDepositTotals => {
  const poolsLockedLovelace = pools * Math.max(0, poolDeposit);
  const stakeKeysLockedLovelace = stakeKeys * Math.max(0, keyDeposit);
  const govActionsLockedLovelace = govActions * Math.max(0, govActionDeposit);
  return {
    poolsLockedLovelace,
    stakeKeysLockedLovelace,
    govActionsLockedLovelace,
    totalLockedLovelace:
      poolsLockedLovelace + stakeKeysLockedLovelace + govActionsLockedLovelace
  };
};
