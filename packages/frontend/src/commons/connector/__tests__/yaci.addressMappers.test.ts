import { toAddressDetail } from "src/commons/connector/yaci/mapper/ToAddressDetail";
import { toStakeAddressDetail } from "src/commons/connector/yaci/mapper/ToStakeAddressDetail";

// Fixtures mirror live yaci-store 0.10.6 responses after axios-case-converter.

describe("yaci toAddressDetail", () => {
  const balance = {
    blockNumber: 13277,
    blockTime: 1783083593,
    address: "addr_test1qryvgass5dsrf2kxl3vgfz76uhp",
    amounts: [
      { unit: "lovelace", policyId: undefined, assetName: undefined, quantity: 9999795207 },
      { unit: "abc123def456", policyId: "abc123", assetName: "TOK", fingerprint: "asset1xyz", quantity: "42" }
    ],
    slot: 13877,
    lastBalanceCalculationBlock: 129415
  };

  it("maps balance + tokens and leaves unknowable fields honest", () => {
    const d = toAddressDetail(balance, []);
    expect(d.address).toBe("addr_test1qryvgass5dsrf2kxl3vgfz76uhp");
    expect(d.balance).toBe(9999795207);
    expect(d.tokens).toHaveLength(1);
    expect(d.tokens[0]).toEqual({
      address: "addr_test1qryvgass5dsrf2kxl3vgfz76uhp",
      name: "TOK",
      displayName: "TOK",
      fingerprint: "asset1xyz",
      quantity: 42
    });
    expect(d.txCount).toBe(0); // yaci has no cheap per-address tx count — never invented
    expect(d.isContract).toBe(false);
    expect(d.stakeAddress).toBe("");
  });

  it("picks the stake address from a utxo row when a build provides it", () => {
    const utxos = [
      { txHash: "7e85", outputIndex: 0, address: balance.address },
      { txHash: "7e86", outputIndex: 1, address: balance.address, stakeAddress: "stake_test1uruw6wsw" }
    ];
    expect(toAddressDetail(balance, utxos).stakeAddress).toBe("stake_test1uruw6wsw");
  });

  it("handles an empty balance without throwing", () => {
    const d = toAddressDetail({}, []);
    expect(d.address).toBe("");
    expect(d.balance).toBe(0);
    expect(d.tokens).toEqual([]);
  });
});

describe("yaci toStakeAddressDetail", () => {
  it("maps an undelegated account to INACTIVE with empty pool", () => {
    const d = toStakeAddressDetail({
      stakeAddress: "stake_test1uruw6wswag80sd0l57alehj47llf6tx96402vt8vks46k0q0e2ne6",
      controlledAmount: 9999795207,
      withdrawableAmount: 0,
      poolId: undefined
    });
    expect(d.status).toBe("INACTIVE");
    expect(d.stakeAddress).toBe("stake_test1uruw6wswag80sd0l57alehj47llf6tx96402vt8vks46k0q0e2ne6");
    expect(d.totalStake).toBe(9999795207);
    expect(d.rewardAvailable).toBe(0);
    expect(d.rewardWithdrawn).toBe(0); // not exposed by yaci-store — honest zero
    expect(d.pool).toEqual({ poolId: "", poolName: "", tickerName: "" });
  });

  it("maps a delegated account to ACTIVE carrying the pool id only", () => {
    const d = toStakeAddressDetail({
      stakeAddress: "stake_test1abc",
      controlledAmount: 5_000_000,
      withdrawableAmount: 123,
      poolId: "pool1xyz"
    });
    expect(d.status).toBe("ACTIVE");
    expect(d.rewardAvailable).toBe(123);
    expect(d.pool).toEqual({ poolId: "pool1xyz", poolName: "", tickerName: "" });
  });
});
