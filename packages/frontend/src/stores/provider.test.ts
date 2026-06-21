import { ProviderConfig, ProviderType, loadProviderConfig } from "./provider";

describe("provider config types", () => {
  it("accepts OGMIOS with a kupoUrl", () => {
    const cfg: ProviderConfig = { type: "OGMIOS", baseUrl: "http://ogmios", kupoUrl: "http://kupo", network: "mainnet" };
    const t: ProviderType = "OGMIOS";
    expect(cfg.kupoUrl).toBe("http://kupo");
    expect(t).toBe("OGMIOS");
  });
});

describe("loadProviderConfig defaults", () => {
  beforeEach(() => {
    // Clear any persisted provider so the env/default path is exercised.
    document.cookie = "phoenix_provider=;path=/;max-age=0";
    localStorage.clear();
    delete process.env.REACT_APP_API_TYPE;
    delete process.env.REACT_APP_API_URL;
  });

  it("defaults to the local gateway when REACT_APP_API_URL is unset (so npm run dev works)", () => {
    const cfg = loadProviderConfig();
    expect(cfg.type).toBe("GATEWAY");
    // A non-empty, absolute base URL is required: there is no Vite dev proxy for /api,
    // so an empty baseUrl sends requests to the Vite origin and 404s.
    expect(cfg.baseUrl).toBe("http://localhost:3000/api");
  });
});
