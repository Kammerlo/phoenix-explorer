import { Amt } from "../types";

export function amtToToken(amount: Amt): Token {
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
}
