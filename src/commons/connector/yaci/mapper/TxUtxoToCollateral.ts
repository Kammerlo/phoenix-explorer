import { TxUtxo } from "../types";

export function txUtxoToCollateralResponse(input: TxUtxo): CollateralResponses {
  return {
    address: input.address || "",
    assetId: "", // TODO: need to implement
    index: input.outputIndex ? input.outputIndex.toString() : "",
    txHash: input.txHash || "",
    value: input.amount && input.amount[0].assetName === "lovelace" ? input.amount[0].quantity! : 0,
    tokens: input.amount!.map((amount) => {
      return {
        assetName: amount.assetName,
        assetId: amount.unit!.replace(amount.policyId!, ""),
        assetQuantity: amount.quantity,
        policy: {
          policyId: amount.policyId,
          totalToken: 0, // TODO: need to implement
          policyScript: "" // TODO: need to implement
        }
      } as Token;
    })
  };
}
