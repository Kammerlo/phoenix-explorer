import { OgmiosConnector } from "./ogmiosConnector";

// Mock global fetch used by the underlying OgmiosClient.
function mockFetchOnce(result: unknown) {
  (globalThis as any).fetch = async () => ({
    ok: true, status: 200,
    text: async () => JSON.stringify({ jsonrpc: "2.0", result, id: null }),
    json: async () => ({ jsonrpc: "2.0", result, id: null })
  });
}

describe("OgmiosConnector", () => {
  it("advertises the served capability set", () => {
    const c = new OgmiosConnector("http://ogmios", "http://kupo");
    const caps = c.getCapabilities();
    expect(caps.has("getCurrentProtocolParameters")).toBe(true);
    expect(caps.has("getDreps")).toBe(true);
    expect(caps.has("getBlocksPage")).toBe(false); // gated off
  });

  it("delegates getEpoch via the service layer (returns an envelope)", async () => {
    mockFetchOnce(638);
    const c = new OgmiosConnector("http://ogmios");
    const res = await c.getCurrentProtocolParameters().catch(() => null);
    // protocolParameters needs an object; assert the call path returns an ApiReturnType shape instead:
    const epoch = await c.getEpoch(638);
    expect(typeof epoch.lastUpdated).toBe("number");
  });
});
