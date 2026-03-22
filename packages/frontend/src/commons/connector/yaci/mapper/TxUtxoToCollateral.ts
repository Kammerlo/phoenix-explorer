import { TxUtxo } from "../types";

export function txUtxoToCollateralResponse(input: TxUtxo): CollateralResponses {
  const amounts = input.amount || [];
  const lovelace = amounts.find((a) => a.unit === "lovelace" || a.assetName === "lovelace");
  return {
    address: input.address || "",
    assetId: "",
    index: input.outputIndex != null ? input.outputIndex.toString() : "",
    txHash: input.txHash || "",
    value: lovelace?.quantity ?? 0,
    tokens: amounts.map((amount) => {
      const policyId = amount.policyId || "";
      const unit = amount.unit || "";
      const assetId = policyId ? unit.replace(policyId, "") : unit;
      return {
        assetName: amount.assetName || "",
        assetId,
        assetQuantity: amount.quantity ?? 0,
        policy: {
          policyId,
          totalToken: 0,
          policyScript: ""
        }
      } as Token;
    })
  };
}
