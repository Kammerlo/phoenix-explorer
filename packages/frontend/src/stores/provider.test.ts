import { ProviderConfig, ProviderType } from "./provider";

describe("provider config types", () => {
  it("accepts OGMIOS with a kupoUrl", () => {
    const cfg: ProviderConfig = { type: "OGMIOS", baseUrl: "http://ogmios", kupoUrl: "http://kupo", network: "mainnet" };
    const t: ProviderType = "OGMIOS";
    expect(cfg.kupoUrl).toBe("http://kupo");
    expect(t).toBe("OGMIOS");
  });
});
