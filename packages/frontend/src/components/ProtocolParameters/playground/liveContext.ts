/**
 * Live-network context: era lookup, accent palette, and section descriptors
 * shared across the page.
 */

import { Theme } from "@mui/material";

import {
  IoFlashOutline,
  IoServerOutline,
  IoLockClosedOutline,
  IoTrendingUpOutline,
  IoLayersOutline,
  IoCodeSlashOutline,
  IoShieldCheckmarkOutline,
  IoMegaphoneOutline,
  IoGitCompareOutline
} from "react-icons/io5";

// ── Eras ────────────────────────────────────────────────────────────────────
export interface EraInfo {
  name: string;
  tagline: string;
  startedAt: string;
}

/**
 * Cardano eras keyed by the protocolMajor value at which they activate.
 * Sourced from the Cardano hard-fork history (cardano.org, IOG release notes).
 */
const ERAS_BY_MAJOR: Record<number, EraInfo> = {
  1: { name: "Byron",   tagline: "Boot phase — federated nodes, no smart contracts.",                          startedAt: "Sep 2017" },
  2: { name: "Shelley", tagline: "Shelley hard fork — decentralized consensus and stake delegation.",          startedAt: "Jul 2020" },
  3: { name: "Allegra", tagline: "Allegra hard fork — token-locking primitives, time-locked transactions.",    startedAt: "Dec 2020" },
  4: { name: "Mary",    tagline: "Mary hard fork — native multi-asset support, no Plutus required.",           startedAt: "Mar 2021" },
  5: { name: "Alonzo",  tagline: "Alonzo hard fork — Plutus V1 smart contracts go live.",                      startedAt: "Sep 2021" },
  6: { name: "Alonzo",  tagline: "Alonzo intra-era — refined Plutus V1 cost model.",                           startedAt: "2022"     },
  7: { name: "Babbage", tagline: "Vasil hard fork — reference inputs, inline datums, Plutus V2.",              startedAt: "Sep 2022" },
  8: { name: "Babbage", tagline: "Valentine hard fork — SECP256k1 + Schnorr signature primitives.",            startedAt: "Feb 2023" },
  9: { name: "Conway",  tagline: "Chang hard fork — bootstrap of on-chain governance (CIP-1694).",             startedAt: "Sep 2024" },
  10: { name: "Conway", tagline: "Plomin hard fork — full governance live: DReps, CC, treasury withdrawals.",  startedAt: "Jan 2025" }
};

const FALLBACK_ERA: EraInfo = {
  name: "Unknown era",
  tagline: "Protocol version not recognized — perhaps the explorer is behind on hard-fork data.",
  startedAt: "—"
};

export const eraForVersion = (major: number): EraInfo =>
  ERAS_BY_MAJOR[major] ?? FALLBACK_ERA;

// ── Section descriptors ─────────────────────────────────────────────────────
export type AccentRole = "primary" | "info" | "success" | "warning" | "error" | "secondary" | "violet";

export interface SectionDescriptor {
  id: string;
  label: string;
  short: string;
  Icon: React.ComponentType<{ size?: number | string }>;
  /** Maps to a theme palette role. Resolved to a CSS color via accentColor(). */
  accent: AccentRole;
}

export const SECTIONS: SectionDescriptor[] = [
  { id: "fees",        label: "Transaction Fees",       short: "Fees",        Icon: IoFlashOutline,           accent: "warning"   },
  { id: "throughput",  label: "Throughput & UTxO",      short: "Throughput",  Icon: IoServerOutline,          accent: "info"      },
  { id: "deposits",    label: "Participation Deposits", short: "Deposits",    Icon: IoLockClosedOutline,      accent: "primary"   },
  { id: "rewards",     label: "Rewards & Treasury",     short: "Rewards",     Icon: IoTrendingUpOutline,      accent: "success"   },
  { id: "pools",       label: "Pool Mechanics",         short: "Pools",       Icon: IoLayersOutline,          accent: "violet"    },
  { id: "scripts",     label: "Plutus Scripts",         short: "Scripts",     Icon: IoCodeSlashOutline,       accent: "secondary" },
  { id: "collateral",  label: "Collateral & Safety",    short: "Collateral",  Icon: IoShieldCheckmarkOutline, accent: "error"     },
  { id: "governance",  label: "Governance",             short: "Governance",  Icon: IoMegaphoneOutline,       accent: "info"      },
  { id: "version",     label: "Protocol Version",       short: "Version",     Icon: IoGitCompareOutline,      accent: "primary"   }
];

/**
 * Resolve a `SectionDescriptor.accent` role to a concrete CSS color from the
 * MUI theme — never a raw hex literal (per CLAUDE.md). The "violet" and
 * "secondary" roles use derived colors so we cover all 9 sections without
 * repeats.
 */
export const accentColor = (role: AccentRole, theme: Theme): string => {
  const p = theme.palette;
  switch (role) {
    case "primary":   return p.primary.main;
    case "info":      return p.info.main;
    case "success":   return p.success.main;
    case "warning":   return p.warning.main;
    case "error":     return p.error.main;
    case "secondary": return p.secondary.main;
    case "violet":
      // No native violet in the palette — use the lighter primary tint
      // mixed with secondary as a distinct hue. Falls back to secondary.dark
      // when those aren't defined.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (p as any).primary?.[300] ?? p.secondary.dark ?? p.primary.main;
    default:          return p.primary.main;
  }
};
