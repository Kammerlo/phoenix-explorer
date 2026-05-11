// packages/frontend/src/commons/connector/types/Capability.ts

/**
 * Capabilities are the set of `ApiConnector` methods a connector implements.
 * Each capability string is exactly the name of a method on `ApiConnector`.
 *
 * Adding a new method to `ApiConnector`?
 *   1. Add the method name to `ALL_CAPABILITIES` below.
 *   2. The `_CapabilitiesAreMethodNames` type-test will fail to compile if
 *      the capability string isn't a real method name — fix the typo.
 *   3. Update each connector's `getCapabilities()` to advertise it (or not).
 */
export const ALL_CAPABILITIES = [
  "getEpochs",
  "getEpoch",
  "getBlocksPage",
  "getBlocksByEpoch",
  "getBlockDetail",
  "getPoolBlocks",
  "getTxDetail",
  "getTransactions",
  "getWalletAddressFromAddress",
  "getAddressTxsFromAddress",
  "getWalletStakeFromAddress",
  "getStakeAddressRegistrations",
  "getStakeDelegations",
  "getPoolRegistrations",
  "getPoolList",
  "getPoolDetail",
  "getCurrentProtocolParameters",
  "getTokensPage",
  "getTokenDetail",
  "getTokenTransactions",
  "getTokenHolders",
  "getTokensByPolicy",
  "getGovernanceOverviewList",
  "getGovernanceDetail",
  "getGovernanceActionVotes",
  "getDreps",
  "getDrep",
  "getDrepVotes",
  "getDrepDelegates",
  "search",
  "getDashboardStats"
] as const;

export type Capability = (typeof ALL_CAPABILITIES)[number];

// ─── Compile-time guard ──────────────────────────────────────────────────────
//
// Forces every Capability string to be the name of a real method on
// ApiConnector. If you add to ALL_CAPABILITIES and the string is misspelled
// or the method doesn't exist, `_CapabilitiesAreMethodNames` fails to compile.

import type { ApiConnector } from "../ApiConnector";

type _MethodOf<T, K extends keyof T> = T[K] extends (...args: never[]) => unknown ? K : never;
type _MethodNames<T> = { [K in keyof T]: _MethodOf<T, K> }[keyof T];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _CapabilitiesAreMethodNames = Capability extends _MethodNames<ApiConnector> ? true : never;
