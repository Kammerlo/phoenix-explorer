/**
 * Named real-world scenarios that drive the per-section simulators.
 *
 * Each scenario carries a short, plain-English label, a one-sentence
 * description, and the input values it should snap the simulator to.
 *
 * Byte counts are typical empirical values cross-checked against mainnet
 * traffic on cexplorer.io and pool.pm. They're estimates, not exact constants.
 */

// ── Fees ────────────────────────────────────────────────────────────────────
export interface FeesScenario {
  id: string;
  label: string;
  description: string;
  txBytes: number;
}

export const FEES_SCENARIOS: FeesScenario[] = [
  {
    id: "wallet-send",
    label: "Wallet → wallet",
    description: "A vanilla ADA transfer between two single-output wallets.",
    txBytes: 300
  },
  {
    id: "ada-handle",
    label: "ADA Handle send",
    description: "Resolving an $adahandle adds a token reference, growing the tx slightly.",
    txBytes: 380
  },
  {
    id: "dex-swap",
    label: "DEX swap",
    description: "A Plutus swap through Minswap / Sundae carries datums and witnesses.",
    txBytes: 1400
  },
  {
    id: "nft-mint",
    label: "NFT mint",
    description: "On-chain mint with CIP-25 metadata and image references.",
    txBytes: 5000
  }
];

// ── Throughput ──────────────────────────────────────────────────────────────
export interface ThroughputScenario {
  id: string;
  label: string;
  description: string;
  avgTxBytes: number;
  utxoOutputBytes: number;
}

export const THROUGHPUT_SCENARIOS: ThroughputScenario[] = [
  {
    id: "empirical",
    label: "Mainnet average",
    description: "Empirical mainnet-wide average transaction size.",
    avgTxBytes: 330,
    utxoOutputBytes: 60
  },
  {
    id: "ada-only",
    label: "Pure ADA send",
    description: "A simple two-output ADA-only transaction.",
    avgTxBytes: 300,
    utxoOutputBytes: 38
  },
  {
    id: "dex-swap",
    label: "DEX swap traffic",
    description: "Block dominated by Plutus swaps with native asset outputs.",
    avgTxBytes: 1400,
    utxoOutputBytes: 110
  },
  {
    id: "heavy",
    label: "Smart-contract heavy",
    description: "Maximum-size scripted transactions packed back-to-back.",
    avgTxBytes: 16000,
    utxoOutputBytes: 280
  }
];

// ── Deposits ────────────────────────────────────────────────────────────────
export interface DepositsScenario {
  id: string;
  label: string;
  description: string;
  /** Which deposits this scenario locks, by participation type. */
  participants: Array<"key" | "pool" | "drep" | "govAction">;
}

export const DEPOSITS_SCENARIOS: DepositsScenario[] = [
  {
    id: "delegate",
    label: "Just delegate stake",
    description: "Delegators only need a stake-key registration.",
    participants: ["key"]
  },
  {
    id: "spo",
    label: "Run a stake pool",
    description: "Operators register both a stake key and the pool itself.",
    participants: ["key", "pool"]
  },
  {
    id: "drep",
    label: "Become a DRep",
    description: "DRep registration plus a stake key for self-delegation.",
    participants: ["key", "drep"]
  },
  {
    id: "gov",
    label: "Submit a governance action",
    description: "The gov-action deposit is the largest single lock on Cardano.",
    participants: ["govAction"]
  },
  {
    id: "all",
    label: "Do everything",
    description: "Total ADA you'd lock to participate at every layer.",
    participants: ["key", "pool", "drep", "govAction"]
  }
];

// ── Rewards ─────────────────────────────────────────────────────────────────
export interface RewardsScenario {
  id: string;
  label: string;
  description: string;
  /** Reserves in ADA used as the reward source. */
  reservesAda: number;
  /** Multiplier on ρ (1 = current). */
  rhoMultiplier: number;
  /** Multiplier on τ (1 = current). */
  tauMultiplier: number;
}

export const REWARDS_SCENARIOS: RewardsScenario[] = [
  {
    id: "today",
    label: "Today",
    description: "ρ and τ exactly as set on chain.",
    reservesAda: 6_410_000_000,
    rhoMultiplier: 1,
    tauMultiplier: 1
  },
  {
    id: "rho-doubled",
    label: "If ρ doubled",
    description: "More inflation now, faster reserve drain.",
    reservesAda: 6_410_000_000,
    rhoMultiplier: 2,
    tauMultiplier: 1
  },
  {
    id: "rho-halved",
    label: "If ρ halved",
    description: "Slower drain — extends reward life, lowers staking APY.",
    reservesAda: 6_410_000_000,
    rhoMultiplier: 0.5,
    tauMultiplier: 1
  },
  {
    id: "tau-doubled",
    label: "If τ doubled",
    description: "Treasury fattens, delegator yields drop.",
    reservesAda: 6_410_000_000,
    rhoMultiplier: 1,
    tauMultiplier: 2
  }
];

// ── Pool Mechanics ──────────────────────────────────────────────────────────
export interface PoolsScenario {
  id: string;
  label: string;
  description: string;
  poolStakeAda: number;
  pledgeAda: number;
}

/**
 * Pool presets calibrated against the live saturation point on mainnet
 * (~43.6 M ADA = 21.8 B active stake / k=500). Refresh whenever the
 * `APPROX_ACTIVE_STAKE_ADA` constant moves significantly so "Healthy" stays
 * comfortably under saturation.
 */
export const POOLS_SCENARIOS: PoolsScenario[] = [
  {
    id: "tiny",
    label: "Tiny pool",
    description: "A new pool with minimal stake and a single delegator. Far below saturation.",
    poolStakeAda: 1_000_000,
    pledgeAda: 100_000
  },
  {
    id: "healthy",
    label: "Healthy pool",
    description: "Around two-thirds saturated — enough room to grow, full reward share.",
    poolStakeAda: 30_000_000,
    pledgeAda: 500_000
  },
  {
    id: "saturated",
    label: "Saturated pool",
    description: "Just past the saturation point — rewards are clipped, delegators start migrating.",
    poolStakeAda: 50_000_000,
    pledgeAda: 500_000
  },
  {
    id: "whale-pledge",
    label: "Whale pledge",
    description: "Healthy stake, but a 5 M ADA pledge — maximum pledge influence on rewards.",
    poolStakeAda: 30_000_000,
    pledgeAda: 5_000_000
  }
];

// ── Plutus Scripts ──────────────────────────────────────────────────────────
export interface ScriptsScenario {
  id: string;
  label: string;
  description: string;
  memUnits: number;
  cpuSteps: number;
}

export const SCRIPTS_SCENARIOS: ScriptsScenario[] = [
  {
    id: "simple",
    label: "Simple lock / unlock",
    description: "A minimal Plutus validator releasing a single UTxO.",
    memUnits: 200_000,
    cpuSteps: 80_000_000
  },
  {
    id: "dex-swap",
    label: "Typical DEX swap",
    description: "A Minswap V2 / Wingriders / Sundae swap with native asset outputs.",
    memUnits: 5_000_000,
    cpuSteps: 2_000_000_000
  },
  {
    id: "heavy",
    label: "Heavy contract",
    description: "Multi-step Plutus V2 logic near the per-tx ceiling.",
    memUnits: 14_000_000,
    cpuSteps: 9_000_000_000
  }
];

// ── Collateral ──────────────────────────────────────────────────────────────
export interface CollateralScenario {
  id: string;
  label: string;
  description: string;
  scriptFeeAda: number;
  valueFieldBytes: number;
}

export const COLLATERAL_SCENARIOS: CollateralScenario[] = [
  {
    id: "lightweight",
    label: "Lightweight script",
    description: "A small validator unlocking a single UTxO.",
    scriptFeeAda: 0.1,
    valueFieldBytes: 80
  },
  {
    id: "dex-swap",
    label: "DEX swap",
    description: "Typical AMM / order-book interaction with multi-asset outputs.",
    scriptFeeAda: 0.4,
    valueFieldBytes: 700
  },
  {
    id: "asset-heavy",
    label: "Multi-asset heavy",
    description: "Wallet bundling many native tokens — stresses maxValSize.",
    scriptFeeAda: 0.7,
    valueFieldBytes: 4500
  }
];

// ── Governance ──────────────────────────────────────────────────────────────
export interface GovernanceScenario {
  id: string;
  label: string;
  description: string;
  /** When set, derive `epochs` from this protocol param key. */
  paramKey?: "govActionLifetime" | "drepActivity" | "ccMaxTermLength";
  epochs?: number;
}

export const GOVERNANCE_SCENARIOS: GovernanceScenario[] = [
  {
    id: "lifetime",
    label: "Proposal lifetime",
    description: "Window during which a governance action accepts votes.",
    paramKey: "govActionLifetime"
  },
  {
    id: "drep-window",
    label: "DRep activity window",
    description: "Inactivity grace period before a DRep's voting power lapses.",
    paramKey: "drepActivity"
  },
  {
    id: "cc-term",
    label: "CC max term",
    description: "Longest term a Constitutional Committee member may serve.",
    paramKey: "ccMaxTermLength"
  },
  {
    id: "year",
    label: "One year",
    description: "Roughly 73 epochs — a useful comparison anchor.",
    epochs: 73
  }
];
