import { mapUtxosToAddressDetail, mapRewardSummaryToStakeDetail } from "./address";
import { OgmiosUtxo, OgmiosRewardAccountSummary } from "../types";

const UTXOS: OgmiosUtxo[] = [
  { transaction: { id: "t1" }, index: 0, address: "addr1xyz", value: { ada: { lovelace: 1000000 }, pol: { name: 5 } } as any },
  { transaction: { id: "t2" }, index: 1, address: "addr1xyz", value: { ada: { lovelace: 2000000 }, pol: { name: 3 } } as any }
];

describe("mapUtxosToAddressDetail", () => {
  const d = mapUtxosToAddressDetail("addr1xyz", UTXOS);
  it("sums lovelace into balance", () => { expect(d.balance).toBe(3000000); });
  it("aggregates assets across utxos", () => {
    const tok = d.tokens.find((t) => t.fingerprint === "polname");
    expect(tok?.quantity).toBe(8);
  });
  it("has zero txCount (no history)", () => { expect(d.txCount).toBe(0); });
});

describe("mapRewardSummaryToStakeDetail", () => {
  const s: OgmiosRewardAccountSummary = {
    from: "verificationKey",
    credential: "876c8abaa636168c7d43623be103c6bfffcfb0337c05ffd1a7ea72e5",
    stakePool: { id: "pool1qqqqqdk4zhsjuxxd8jyvwncf5eucfskz0xjjj64fdmlgj735lr9" },
    rewards: { ada: { lovelace: 0 } }
  };
  const d = mapRewardSummaryToStakeDetail("stake1u...", s);
  it("maps pool + status + rewards", () => {
    expect(d.pool.poolId).toBe(s.stakePool!.id);
    expect(d.status).toBe("ACTIVE");
    expect(d.rewardAvailable).toBe(0);
  });
  it("returns INACTIVE when no summary", () => {
    expect(mapRewardSummaryToStakeDetail("stake1u...", undefined).status).toBe("INACTIVE");
  });
});
