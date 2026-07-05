import { buildContracts } from "@shared/helpers/contracts";

/**
 * The Yaci connector feeds camelCased yaci-store redeemer rows straight into the
 * shared buildContracts (see yaciConnector.getTxDetail). These fixtures mirror
 * the live wire shapes after axios-case-converter: the spend pointer arrives as
 * `index` on some builds (`txIndex` per the OpenAPI schema) and ExUnits as
 * strings — the casing-agnostic helper must handle both.
 */
const resolvers = {
  scriptCbor: (h: string) => Promise.resolve(`cbor:${h}`),
  datumCbor: (h: string) => Promise.resolve(`datum:${h}`)
};

describe("yaci redeemers → buildContracts", () => {
  it("maps a camelCase spend redeemer with `index` pointer to its canonical input", async () => {
    const redeemers = [
      {
        index: 1, // yaci-store spend pointer (2nd input in canonical ordering)
        purpose: "spend",
        scriptHash: "sh1",
        redeemerDataHash: "rd1",
        unitMem: "1700",
        unitSteps: "476468"
      }
    ];
    // Canonical ordering sorts by (txHash, outputIndex): index 0 → aa#0 (wallet),
    // index 1 → bb#1 (script input carrying datum hash d1).
    const inputs = [
      { address: "addrWallet", txHash: "aa", outputIndex: 0, amount: [{ unit: "lovelace", quantity: "5" }] },
      { address: "addrScript", txHash: "bb", outputIndex: 1, dataHash: "d1" }
    ];
    const outputs = [{ address: "addrScript", txHash: "cc", outputIndex: 0, inlineDatum: "OUTDATUM", dataHash: "d2" }];

    const contracts = await buildContracts({ redeemers, inputs, outputs, resolvers });
    expect(contracts).toHaveLength(1);
    const [c] = contracts;
    expect(c.purpose).toBe("SPEND");
    expect(c.address).toBe("addrScript");
    expect(c.scriptHash).toBe("sh1");
    expect(c.scriptBytes).toBe("cbor:sh1");
    expect(c.redeemerBytes).toBe("datum:rd1");
    expect(c.datumHashIn).toBe("d1");
    expect(c.datumBytesIn).toBe("datum:d1"); // resolved via datumCbor (no inline datum)
    expect(c.datumHashOut).toBe("d2");
    expect(c.datumBytesOut).toBe("OUTDATUM"); // inline datum wins over resolver
    expect(c.redeemerMem).toBe(1700);
    expect(c.redeemerSteps).toBe(476468);
  });

  it("attaches yaci reference inputs merged with a `reference` flag", async () => {
    const redeemers = [{ index: 0, purpose: "spend", scriptHash: "sh1", unitMem: "1", unitSteps: "2" }];
    const inputs = [
      { address: "addrScript", txHash: "aa", outputIndex: 0, inlineDatum: "IN" },
      // getTxDetail merges txDetails.referenceInputs with { reference: true }:
      { address: "addrRef", txHash: "rr", outputIndex: 3, referenceScriptHash: "refsh", reference: true }
    ];

    const contracts = await buildContracts({ redeemers, inputs, outputs: [], resolvers });
    expect(contracts).toHaveLength(1);
    expect(contracts[0].address).toBe("addrScript");
    expect(contracts[0].referenceInputs).toHaveLength(1);
    expect(contracts[0].referenceInputs?.[0].scriptHash).toBe("refsh");
    expect(contracts[0].referenceInputs?.[0].script).toBe("cbor:refsh");
    expect(contracts[0].referenceInputs?.[0].txHash).toBe("rr");
  });

  it("handles a mint redeemer without touching inputs and survives failing resolvers", async () => {
    const redeemers = [{ index: 0, purpose: "mint", scriptHash: "policy1", unitMem: "10", unitSteps: "20" }];
    const failing = {
      scriptCbor: () => Promise.reject(new Error("no /scripts on this build")),
      datumCbor: () => Promise.reject(new Error("no datum"))
    };

    const contracts = await buildContracts({ redeemers, inputs: [], outputs: [], resolvers: failing });
    expect(contracts).toHaveLength(1);
    expect(contracts[0].purpose).toBe("MINT");
    expect(contracts[0].scriptHash).toBe("policy1");
    expect(contracts[0].scriptBytes).toBe(""); // resolver failure degrades to empty, not throw
    expect(contracts[0].address).toBe("");
  });
});
