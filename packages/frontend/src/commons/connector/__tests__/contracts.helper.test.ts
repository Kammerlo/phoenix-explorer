import { buildContracts, mapRedeemerPurpose } from "@shared/helpers/contracts";

const resolvers = {
  scriptCbor: (h: string) => Promise.resolve(`script:${h}`),
  datumCbor: (h: string) => Promise.resolve(`datum:${h}`)
};

describe("mapRedeemerPurpose", () => {
  it("normalizes Blockfrost lowercase purposes to canonical uppercase", () => {
    expect(mapRedeemerPurpose("spend")).toBe("SPEND");
    expect(mapRedeemerPurpose("mint")).toBe("MINT");
    expect(mapRedeemerPurpose("cert")).toBe("CERT");
    expect(mapRedeemerPurpose("reward")).toBe("REWARD");
    expect(mapRedeemerPurpose("vote")).toBe("VOTING");
    expect(mapRedeemerPurpose("propose")).toBe("PROPOSING");
    expect(mapRedeemerPurpose(undefined)).toBe("SPEND");
  });
});

describe("buildContracts", () => {
  it("returns [] when there are no redeemers", async () => {
    expect(await buildContracts({ redeemers: [], inputs: [], outputs: [], resolvers })).toEqual([]);
  });

  it("maps a spend redeemer to its canonical input and resolves script/datum/redeemer", async () => {
    // Canonical ordering sorts non-collateral, non-reference inputs by (tx_hash, output_index):
    //   index 0 -> aa#0 (plain wallet), index 1 -> bb#1 (script input with datum d1)
    const inputs = [
      { address: "addrScript", tx_hash: "bb", output_index: 1, data_hash: "d1", collateral: false },
      { address: "addrWallet", tx_hash: "aa", output_index: 0, collateral: false },
      { address: "addrColl", tx_hash: "cc", output_index: 0, collateral: true },
      { address: "addrRef", tx_hash: "rr", output_index: 2, reference: true, reference_script_hash: "refsh", inline_datum: "refInlineDatum" }
    ];
    const outputs = [{ address: "addrScript", output_index: 0, data_hash: "d2" }];
    const redeemers = [
      { tx_index: 1, purpose: "spend", script_hash: "s1", redeemer_data_hash: "r1", unit_mem: "1700", unit_steps: "476468" }
    ];

    const [c] = await buildContracts({ redeemers, inputs, outputs, resolvers });

    expect(c.purpose).toBe("SPEND");
    expect(c.address).toBe("addrScript");
    expect(c.scriptHash).toBe("s1");
    expect(c.scriptBytes).toBe("script:s1");
    expect(c.redeemerBytes).toBe("datum:r1");
    expect(c.redeemerMem).toBe(1700);
    expect(c.redeemerSteps).toBe(476468);
    expect(c.datumHashIn).toBe("d1");
    expect(c.datumBytesIn).toBe("datum:d1");
    expect(c.datumHashOut).toBe("d2");
    expect(c.datumBytesOut).toBe("datum:d2");
    // reference input (CIP-31/33) attached
    expect(c.referenceInputs).toHaveLength(1);
    expect(c.referenceInputs?.[0].scriptHash).toBe("refsh");
    expect(c.referenceInputs?.[0].script).toBe("script:refsh");
    expect(c.referenceInputs?.[0].datum).toBe("refInlineDatum");
  });

  it("prefers an inline datum over a hash-resolved datum", async () => {
    const inputs = [{ address: "addrScript", tx_hash: "aa", output_index: 0, inline_datum: "INLINE", data_hash: "d1" }];
    const redeemers = [{ tx_index: 0, purpose: "spend", script_hash: "s1", redeemer_data_hash: "r1" }];
    const [c] = await buildContracts({ redeemers, inputs, outputs: [], resolvers });
    expect(c.datumBytesIn).toBe("INLINE");
  });

  it("produces identical output for camelCase (axios-case-converter) inputs", async () => {
    const snake = {
      redeemers: [{ tx_index: 0, purpose: "spend", script_hash: "s1", redeemer_data_hash: "r1", unit_mem: "10", unit_steps: "20" }],
      inputs: [{ address: "a", tx_hash: "aa", output_index: 0, data_hash: "d1" }],
      outputs: [],
      resolvers
    };
    const camel = {
      redeemers: [{ txIndex: 0, purpose: "spend", scriptHash: "s1", redeemerDataHash: "r1", unitMem: "10", unitSteps: "20" }],
      inputs: [{ address: "a", txHash: "aa", outputIndex: 0, dataHash: "d1" }],
      outputs: [],
      resolvers
    };
    expect(await buildContracts(camel)).toEqual(await buildContracts(snake));
  });

  it("handles mint redeemers without datum lookups", async () => {
    const redeemers = [{ tx_index: 0, purpose: "mint", script_hash: "policy1", redeemer_data_hash: "r1", unit_mem: "5", unit_steps: "6" }];
    const [c] = await buildContracts({ redeemers, inputs: [], outputs: [], resolvers });
    expect(c.purpose).toBe("MINT");
    expect(c.scriptHash).toBe("policy1");
    expect(c.scriptBytes).toBe("script:policy1");
    expect(c.datumHashIn).toBe("");
    expect(c.datumBytesIn).toBe("");
  });
});
