// packages/frontend/src/commons/connector/capabilities/filterSearchResults.ts
import { SearchResult, SearchResultType } from "@shared/dtos/seach.dto";
import { Capability } from "../types/Capability";
import { CapabilityPredicate } from "./filterMenus";

/** Maps each search result type to the connector capability needed to view its detail page. */
const RESULT_TYPE_CAPABILITY: Record<SearchResultType, Capability> = {
  transaction: "getTxDetail",
  block: "getBlockDetail",
  epoch: "getEpoch",
  address: "getWalletAddressFromAddress",
  stake: "getWalletStakeFromAddress",
  pool: "getPoolDetail",
  token: "getTokenDetail",
  policy: "getTokensByPolicy",
  drep: "getDrep",
  gov_action: "getGovernanceDetail"
};

export function filterSearchResultsByCapabilities(
  results: readonly SearchResult[],
  hasCap: CapabilityPredicate
): SearchResult[] {
  return results.filter((r) => hasCap(RESULT_TYPE_CAPABILITY[r.type]));
}
