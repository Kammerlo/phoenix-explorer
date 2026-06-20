import express from "express";
import request from "supertest";

// Capture mock functions so we can assert args.
const mockGetEpoch = jest.fn(async (_b: unknown, _epochId: number) => ({ data: { no: _epochId }, lastUpdated: 1 }));
const mockGetPoolDetail = jest.fn(async (_b: unknown, _poolId: string) => ({ data: { poolId: _poolId }, lastUpdated: 1 }));
const mockGetDrep = jest.fn(async (_b: unknown, _drepId: string) => ({ data: { drepHash: _drepId }, lastUpdated: 1 }));
const mockGetGovernanceOverviewList = jest.fn(async (_b: unknown, _q: unknown) => ({ data: [], lastUpdated: 1 }));
const mockGetGovernanceDetail = jest.fn(async (_b: unknown, _tx: string, _idx: string) => ({ data: { txHash: _tx, index: _idx }, lastUpdated: 1 }));
const mockGetGovernanceActionVotes = jest.fn(async (_b: unknown, _tx: string, _idx: string) => ({ data: [], lastUpdated: 1 }));
const mockGetTokensByPolicy = jest.fn(async (_b: unknown, _policyId: string, _q: unknown) => ({ data: [], lastUpdated: 1 }));
const mockGetTokenDetail = jest.fn(async (_b: unknown, _tokenId: string) => ({ data: { fingerprint: _tokenId }, lastUpdated: 1 }));
const mockGetTokenHolders = jest.fn(async (_b: unknown, _tokenId: string, _q: unknown) => ({ data: [], lastUpdated: 1 }));
const mockSearch = jest.fn(async (_b: unknown, q: string) => ({ data: [{ type: "pool", id: q }], lastUpdated: 1 }));

// Mock the shared services so we don't need a live Ogmios.
jest.mock("@shared/ogmios/services", () => ({
  ogmiosServices: {
    getCurrentProtocolParameters: async () => ({ data: { minFeeA: 44 }, lastUpdated: 1 }),
    getDashboardStats: async () => ({ data: { ok: true }, lastUpdated: 1 }),
    getPoolList: async () => ({ data: [], lastUpdated: 1 }),
    getDreps: async () => ({ data: [], lastUpdated: 1 }),
    getEpoch: (b: unknown, epochId: number) => mockGetEpoch(b, epochId),
    getPoolDetail: (b: unknown, poolId: string) => mockGetPoolDetail(b, poolId),
    getDrep: (b: unknown, drepId: string) => mockGetDrep(b, drepId),
    getGovernanceOverviewList: (b: unknown, q: unknown) => mockGetGovernanceOverviewList(b, q),
    getGovernanceDetail: (b: unknown, tx: string, idx: string) => mockGetGovernanceDetail(b, tx, idx),
    getGovernanceActionVotes: (b: unknown, tx: string, idx: string) => mockGetGovernanceActionVotes(b, tx, idx),
    getTokensByPolicy: (b: unknown, policyId: string, q: unknown) => mockGetTokensByPolicy(b, policyId, q),
    getTokenDetail: (b: unknown, tokenId: string) => mockGetTokenDetail(b, tokenId),
    getTokenHolders: (b: unknown, tokenId: string, q: unknown) => mockGetTokenHolders(b, tokenId, q),
    search: (b: unknown, q: string) => mockSearch(b, q)
  }
}));
jest.mock("../../config/ogmios", () => ({
  ogmiosBackends: () => ({ ogmios: {}, kupo: undefined }),
  IS_OGMIOS_ACTIVE: true
}));

import { mountOgmiosControllers } from "./index";

function appWithOgmios() {
  const app = express();
  app.use(express.json());
  mountOgmiosControllers(app);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Ogmios gateway routes", () => {
  it("serves protocol params", async () => {
    const res = await request(appWithOgmios()).get("/api/protocol-params");
    expect(res.status).toBe(200);
    expect(res.body.data.minFeeA).toBe(44);
  });

  it("serves dashboard stats", async () => {
    const res = await request(appWithOgmios()).get("/api/dashboard/stats");
    expect(res.status).toBe(200);
  });

  it("returns 501 for an unsupported historical endpoint", async () => {
    const res = await request(appWithOgmios()).get("/api/blocks");
    expect(res.status).toBe(501);
    expect(res.body.error).toMatch(/not supported/i);
  });

  it("GET /api/epochs/:epochId routes to getEpoch with numeric epoch", async () => {
    const res = await request(appWithOgmios()).get("/api/epochs/450");
    expect(res.status).toBe(200);
    expect(mockGetEpoch).toHaveBeenCalledTimes(1);
    const calls = mockGetEpoch.mock.calls as Array<[unknown, number]>;
    expect(calls[0][1]).toBe(450);
  });

  it("GET /api/governance/actions routes to getGovernanceOverviewList", async () => {
    const res = await request(appWithOgmios()).get("/api/governance/actions");
    expect(res.status).toBe(200);
    expect(mockGetGovernanceOverviewList).toHaveBeenCalledTimes(1);
  });

  it("GET /api/governance/actions/:txHash/:index routes to getGovernanceDetail", async () => {
    const res = await request(appWithOgmios()).get("/api/governance/actions/abc/0");
    expect(res.status).toBe(200);
    expect(mockGetGovernanceDetail).toHaveBeenCalledTimes(1);
    const calls = mockGetGovernanceDetail.mock.calls as Array<[unknown, string, string]>;
    expect(calls[0][1]).toBe("abc");
    expect(calls[0][2]).toBe("0");
  });

  it("GET /api/governance/actions/:txHash/:index/votes routes to getGovernanceActionVotes", async () => {
    const res = await request(appWithOgmios()).get("/api/governance/actions/abc/0/votes");
    expect(res.status).toBe(200);
    expect(mockGetGovernanceActionVotes).toHaveBeenCalledTimes(1);
    const calls = mockGetGovernanceActionVotes.mock.calls as Array<[unknown, string, string]>;
    expect(calls[0][1]).toBe("abc");
    expect(calls[0][2]).toBe("0");
  });

  it("GET /api/governance/dreps/:drepId routes to getDrep", async () => {
    const res = await request(appWithOgmios()).get("/api/governance/dreps/drep1xyz");
    expect(res.status).toBe(200);
    expect(mockGetDrep).toHaveBeenCalledTimes(1);
    const calls = mockGetDrep.mock.calls as Array<[unknown, string]>;
    expect(calls[0][1]).toBe("drep1xyz");
  });

  const POLICY_ID = "a".repeat(56);

  it("GET /api/tokens/policy/:policyId routes to getTokensByPolicy (not getTokenDetail)", async () => {
    const res = await request(appWithOgmios()).get(`/api/tokens/policy/${POLICY_ID}`);
    expect(res.status).toBe(200);
    expect(mockGetTokensByPolicy).toHaveBeenCalledTimes(1);
    const calls = mockGetTokensByPolicy.mock.calls as Array<[unknown, string, unknown]>;
    expect(calls[0][1]).toBe(POLICY_ID);
    expect(mockGetTokenDetail).not.toHaveBeenCalled();
  });

  it("GET /api/tokens/:tokenId routes to getTokenDetail", async () => {
    const res = await request(appWithOgmios()).get("/api/tokens/unit123");
    expect(res.status).toBe(200);
    expect(mockGetTokenDetail).toHaveBeenCalledTimes(1);
    const calls = mockGetTokenDetail.mock.calls as Array<[unknown, string]>;
    expect(calls[0][1]).toBe("unit123");
  });

  it("GET /api/tokens/:tokenId/holders routes to getTokenHolders", async () => {
    const res = await request(appWithOgmios()).get("/api/tokens/unit123/holders");
    expect(res.status).toBe(200);
    expect(mockGetTokenHolders).toHaveBeenCalledTimes(1);
    const calls = mockGetTokenHolders.mock.calls as Array<[unknown, string, unknown]>;
    expect(calls[0][1]).toBe("unit123");
  });

  it("GET /api/search?q=pool1abc passes the search term via q param", async () => {
    const res = await request(appWithOgmios()).get("/api/search?q=pool1abc");
    expect(res.status).toBe(200);
    expect(mockSearch).toHaveBeenCalledTimes(1);
    const calls = mockSearch.mock.calls as Array<[unknown, string]>;
    expect(calls[0][1]).toBe("pool1abc");
  });

  it("GET /api/search with no q param passes empty string", async () => {
    const res = await request(appWithOgmios()).get("/api/search");
    expect(res.status).toBe(200);
    expect(mockSearch).toHaveBeenCalledTimes(1);
    const calls = mockSearch.mock.calls as Array<[unknown, string]>;
    expect(calls[0][1]).toBe("");
  });
});
