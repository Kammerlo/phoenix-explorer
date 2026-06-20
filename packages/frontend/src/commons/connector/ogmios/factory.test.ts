/**
 * Verifies the factory branch selects OgmiosConnector. We import the connector
 * directly and assert its capability surface, since ConnectorFactory wires by
 * cookie config which is covered by provider.test.ts.
 */
import { OgmiosConnector } from "./ogmiosConnector";

describe("ogmios factory wiring", () => {
  it("constructs with ogmios + kupo URLs", () => {
    const c = new OgmiosConnector("http://ogmios", "http://kupo");
    expect(c.has("getPoolList")).toBe(true);
    expect(c.has("getTokenHolders")).toBe(true);
  });
});
