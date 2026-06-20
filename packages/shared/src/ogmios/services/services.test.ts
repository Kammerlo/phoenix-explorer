import { ogmiosServices, OgmiosBackends } from "./index";
import { OgmiosClient } from "../client";
import ppFixture from "../__fixtures__/protocolParameters.json";

function fakeOgmios(routes: Record<string, unknown>): OgmiosClient {
  return { query: async (method: string) => {
    if (!(method in routes)) throw new Error(`unexpected method ${method}`);
    return routes[method];
  } } as unknown as OgmiosClient;
}

describe("ogmiosServices.getCurrentProtocolParameters", () => {
  it("returns an envelope with mapped params", async () => {
    const b: OgmiosBackends = { ogmios: fakeOgmios({ "queryLedgerState/protocolParameters": ppFixture }) };
    const res = await ogmiosServices.getCurrentProtocolParameters(b);
    expect(res.error).toBeUndefined();
    expect(res.data?.minFeeA).toBe((ppFixture as any).minFeeCoefficient);
    expect(typeof res.lastUpdated).toBe("number");
  });

  it("returns an error envelope when the query throws", async () => {
    const b: OgmiosBackends = { ogmios: { query: async () => { throw new Error("boom"); } } as any };
    const res = await ogmiosServices.getCurrentProtocolParameters(b);
    expect(res.error).toContain("boom");
    expect(res.data).toBeNull();
  });
});

describe("ogmiosServices.getDreps pagination", () => {
  it("slices the mapped list by pageInfo", async () => {
    const dreps = Array.from({ length: 5 }, (_, i) => ({ type: "registered", id: `d${i}`, stake: { ada: { lovelace: i } }, delegators: [] }));
    const b: OgmiosBackends = { ogmios: fakeOgmios({ "queryLedgerState/delegateRepresentatives": dreps }) };
    const res = await ogmiosServices.getDreps(b, { page: "2", size: "2" } as any);
    expect(res.data).toHaveLength(2);
    expect(res.total).toBe(5);
    expect(res.data?.[0].drepHash).toBe("d2");
  });
});
