import { TxUtxo } from "../types";
import { amtToToken } from "./AmtToToken";

export function txUtxoToUtxo(input: TxUtxo) {
  return {
    address: input.address || "",
    stakeAddress: input.stakeAddress || "",
    value: input.amount && input.amount[0].assetName === "lovelace" ? Number(input.amount[0].quantity ?? 0) : 0,
    txHash: input.txHash || "",
    index: input.outputIndex ? input.outputIndex.toString() : "",
    // Smart-contract markers — yaci-store already carries these; surface them so
    // the flow view can flag datum / reference-script UTxOs (parity with Blockfrost).
    dataHash: input.dataHash ?? null,
    inlineDatum: input.inlineDatum ?? null,
    referenceScriptHash: input.referenceScriptHash ?? null,
    tokens: (input.amount!.length > 0 && input.amount![0].unit === "lovelace"
      ? input.amount!.slice(1)
      : input.amount!
    ).map((amount) => {
      return amtToToken(amount);
    })
  };
}
