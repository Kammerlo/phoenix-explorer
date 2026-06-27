import { toContracts } from "src/commons/connector/yaci/mapper/ToContracts";
import { txUtxoToUtxo } from "src/commons/connector/yaci/mapper/TxUtxoToUtxo";

describe("yaci toContracts", () => {
  it("derives a SPEND contract per script-locked input and attaches reference inputs", () => {
    const inputs = [
      { address: "addrScript", txHash: "aa", outputIndex: 0, inlineDatum: "INLINE", dataHash: "d1", referenceScriptHash: "sh1" },
      { address: "addrWallet", txHash: "bb", outputIndex: 1 }
    ];
    const outputs = [{ address: "addrScript", outputIndex: 0, dataHash: "d2" }];
    const refs = [{ address: "addrRef", outputIndex: 2, scriptRef: "SCRIPTCBOR", referenceScriptHash: "refh", inlineDatum: "RD" }];

    const contracts = toContracts(inputs, outputs, refs);
    expect(contracts).toHaveLength(1);
    const [c] = contracts;
    expect(c.purpose).toBe("SPEND");
    expect(c.address).toBe("addrScript");
    expect(c.datumBytesIn).toBe("INLINE");
    expect(c.datumHashIn).toBe("d1");
    expect(c.datumHashOut).toBe("d2");
    expect(c.scriptHash).toBe("sh1");
    expect(c.referenceInputs?.[0].script).toBe("SCRIPTCBOR");
    expect(c.referenceInputs?.[0].scriptHash).toBe("refh");
  });

  it("returns [] when no input carries a datum", () => {
    expect(toContracts([{ address: "a", txHash: "aa", outputIndex: 0 }], [])).toEqual([]);
  });
});

describe("yaci txUtxoToUtxo", () => {
  it("retains datum / reference-script markers", () => {
    const u = txUtxoToUtxo({
      address: "a",
      txHash: "aa",
      outputIndex: 0,
      amount: [{ unit: "lovelace", assetName: "lovelace", quantity: "1000000" } as any],
      dataHash: "d1",
      inlineDatum: "INLINE",
      referenceScriptHash: "rsh"
    });
    expect(u.dataHash).toBe("d1");
    expect(u.inlineDatum).toBe("INLINE");
    expect(u.referenceScriptHash).toBe("rsh");
  });
});
