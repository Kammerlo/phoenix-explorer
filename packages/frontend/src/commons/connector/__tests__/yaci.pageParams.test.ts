import { toYaciPageParams } from "src/commons/connector/yaci/mapper/PageInfoToYaciParams";

describe("toYaciPageParams", () => {
  it("renames size→count and sort→order, keeping only the sort direction", () => {
    expect(toYaciPageParams({ page: "2", size: "50", sort: "activeVoteStake,DESC" })).toEqual({
      page: 2,
      count: 50,
      order: "desc"
    });
  });

  it("passes page through unchanged (yaci /blocks and /txs are 1-based)", () => {
    expect(toYaciPageParams({ page: "1", size: "20" })).toEqual({ page: 1, count: 20 });
  });

  it("accepts numeric values (callers like BlockList pass numbers)", () => {
    expect(toYaciPageParams({ page: 3, size: 10 } as never)).toEqual({ page: 3, count: 10 });
  });

  it("omits count/order when size/sort are missing or empty", () => {
    expect(toYaciPageParams({ page: "1", sort: "" })).toEqual({ page: 1 });
    expect(toYaciPageParams({})).toEqual({});
    expect(toYaciPageParams(undefined as never)).toEqual({});
  });

  it("accepts a bare direction sort and ignores malformed directions", () => {
    expect(toYaciPageParams({ sort: "asc" })).toEqual({ order: "asc" });
    expect(toYaciPageParams({ sort: "fee,SIDEWAYS" })).toEqual({});
  });

  it("takes the first element of array values and preserves unrelated keys", () => {
    expect(toYaciPageParams({ page: ["2", "9"], size: ["25"], tokenName: "hosky" })).toEqual({
      page: 2,
      count: 25,
      tokenName: "hosky"
    });
  });

  it("drops non-positive sizes so yaci-store's own default applies", () => {
    expect(toYaciPageParams({ size: "0" })).toEqual({});
  });
});
