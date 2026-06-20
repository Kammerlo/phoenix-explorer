import express from "express";
import request from "supertest";

// Mock the shared services so we don't need a live Ogmios.
jest.mock("@shared/ogmios/services", () => ({
  ogmiosServices: {
    getCurrentProtocolParameters: async () => ({ data: { minFeeA: 44 }, lastUpdated: 1 }),
    getDashboardStats: async () => ({ data: { ok: true }, lastUpdated: 1 }),
    getPoolList: async () => ({ data: [], lastUpdated: 1 }),
    getDreps: async () => ({ data: [], lastUpdated: 1 })
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
});
