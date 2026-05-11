// packages/frontend/src/commons/connector/capabilities/filterSearchResults.test.ts
import { filterSearchResultsByCapabilities } from "./filterSearchResults";
import { SearchResult } from "@shared/dtos/seach.dto";

const results: SearchResult[] = [
  { type: "block", id: "1" },
  { type: "transaction", id: "abc" },
  { type: "token", id: "asset1xyz" },
  { type: "pool", id: "pool1abc" },
  { type: "gov_action", id: "tx1", extraId: "0" },
  { type: "drep", id: "drep1xyz" },
  { type: "epoch", id: "100" },
  { type: "address", id: "addr1xyz" },
  { type: "stake", id: "stake1xyz" },
  { type: "policy", id: "pol1xyz" }
];

describe("filterSearchResultsByCapabilities", () => {
  it("drops results whose detail capability is missing", () => {
    const hasCap = (c: any) => ["getBlockDetail", "getTxDetail"].includes(c);
    const filtered = filterSearchResultsByCapabilities(results, hasCap as any);
    expect(filtered.map((r) => r.type)).toEqual(["block", "transaction"]);
  });

  it("keeps results when their detail capability is supported", () => {
    const hasCap = (c: any) => true;
    expect(filterSearchResultsByCapabilities(results, hasCap as any)).toHaveLength(results.length);
  });

  it("returns an empty array when none are supported", () => {
    const hasCap = (_c: any) => false;
    expect(filterSearchResultsByCapabilities(results, hasCap as any)).toEqual([]);
  });
});
