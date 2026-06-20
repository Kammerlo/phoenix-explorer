import { mapDelegateRepresentative } from "./dreps";
import { OgmiosDelegateRepresentative } from "../types";

const RAW: OgmiosDelegateRepresentative = {
  type: "registered",
  from: "verificationKey",
  id: "00663f00c4c1ca6bb6405c68b5c30023a8d8c7f6acbeb06b7d0a4d2c",
  mandate: { epoch: 650 },
  deposit: { ada: { lovelace: 500000000 } },
  stake: { ada: { lovelace: 331716016177 } },
  delegators: [
    { from: "verificationKey", credential: "0e3298a21cdcd6d0de7ef80405ce02d834d7279ca5c1b841f7f560e5" },
    { from: "verificationKey", credential: "1a4a4978ba8c3642be07b697e09eeac346059508bcf320019d9b0713" }
  ]
};

describe("mapDelegateRepresentative", () => {
  const d = mapDelegateRepresentative(RAW);
  it("maps stake to active vote stake + voting power", () => {
    expect(d.activeVoteStake).toBe(331716016177);
    expect(d.votingPower).toBe(331716016177);
  });
  it("counts delegators and sets hash/status", () => {
    expect(d.delegators).toBe(2);
    expect(d.drepHash).toBe(RAW.id);
    expect(d.status).toBe("ACTIVE");
  });
});
