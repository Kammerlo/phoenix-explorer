// Hermetic setup: set OGMIOS_URL before any imports so config/blockfrost.ts
// startup guard (which throws when no provider is configured) is satisfied.
process.env.OGMIOS_URL = "http://ogmios";

import request from "supertest";

jest.mock("./config/ogmios", () => ({
  IS_OGMIOS_ACTIVE: true,
  ogmiosBackends: () => ({ ogmios: {}, kupo: undefined })
}));
jest.mock("@shared/ogmios/services", () => ({
  ogmiosServices: { getCurrentProtocolParameters: async () => ({ data: { minFeeA: 44 }, lastUpdated: 1 }) }
}));

import app from "./app";

describe("app mode-select (Ogmios active)", () => {
  it("serves Ogmios protocol params", async () => {
    const res = await request(app).get("/api/protocol-params");
    expect(res.status).toBe(200);
    expect(res.body.data.minFeeA).toBe(44);
  });
  it("501s blocks in Ogmios mode", async () => {
    const res = await request(app).get("/api/blocks");
    expect(res.status).toBe(501);
  });
});
