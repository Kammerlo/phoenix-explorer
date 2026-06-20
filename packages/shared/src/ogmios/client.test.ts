import { OgmiosClient, KupoClient, FetchLike } from "./client";

function mockFetch(handler: (url: string, init: any) => { status?: number; body: unknown }): FetchLike {
  return async (url, init) => {
    const { status = 200, body } = handler(url, init);
    const text = typeof body === "string" ? body : JSON.stringify(body);
    return { ok: status >= 200 && status < 300, status, text: async () => text, json: async () => JSON.parse(text) };
  };
}

describe("OgmiosClient", () => {
  it("POSTs a JSON-RPC envelope and returns result", async () => {
    let captured: any = null;
    const fetchImpl = mockFetch((_url, init) => {
      captured = JSON.parse(init.body);
      return { body: { jsonrpc: "2.0", method: captured.method, result: 638, id: null } };
    });
    const c = new OgmiosClient("http://ogmios", { fetchImpl });
    const result = await c.query<number>("queryLedgerState/epoch");
    expect(result).toBe(638);
    expect(captured).toEqual({ jsonrpc: "2.0", method: "queryLedgerState/epoch", id: null });
  });

  it("includes params when provided", async () => {
    let captured: any = null;
    const fetchImpl = mockFetch((_u, init) => { captured = JSON.parse(init.body); return { body: { result: {} } }; });
    await new OgmiosClient("http://ogmios", { fetchImpl }).query("queryLedgerState/stakePools", { includeStake: true });
    expect(captured.params).toEqual({ includeStake: true });
  });

  it("throws on a JSON-RPC error response", async () => {
    const fetchImpl = mockFetch(() => ({ body: { jsonrpc: "2.0", error: { code: -32600, message: "Invalid request" }, id: null } }));
    await expect(new OgmiosClient("http://ogmios", { fetchImpl }).query("bad")).rejects.toThrow("Invalid request");
  });

  it("throws on a non-2xx HTTP status", async () => {
    const fetchImpl = mockFetch(() => ({ status: 500, body: "boom" }));
    await expect(new OgmiosClient("http://ogmios", { fetchImpl }).query("x")).rejects.toThrow(/500/);
  });
});

describe("KupoClient", () => {
  it("GETs /matches/{pattern}?unspent and returns the array", async () => {
    let url = "";
    const fetchImpl = mockFetch((u) => { url = u; return { body: [{ address: "addr1", value: { coins: 5 } }] }; });
    const out = await new KupoClient("http://kupo", { fetchImpl }).matches<any[]>("pol.name", { unspent: true });
    expect(url).toBe("http://kupo/matches/pol.name?unspent");
    expect(out).toHaveLength(1);
  });

  it("GETs /health", async () => {
    const fetchImpl = mockFetch(() => ({ body: { connection_status: "connected" } }));
    const h = await new KupoClient("http://kupo", { fetchImpl }).health<any>();
    expect(h.connection_status).toBe("connected");
  });
});
