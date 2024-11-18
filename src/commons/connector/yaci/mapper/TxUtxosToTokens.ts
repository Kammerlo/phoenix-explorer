import { TxUtxo } from "../types";

export function utxosToTokenArray(utxos: TxUtxo[]): Token[] {
  const tokenMap = new Map<string, Token>();
  utxos.forEach((utxo) => {
    utxo.amount?.forEach((amount) => {
      if (amount.assetName !== "lovelace") {
        if (tokenMap.has(amount.assetName!)) {
          if (tokenMap.get(amount.assetName!)!.assetQuantity + amount.quantity! === 0) {
            tokenMap.delete(amount.assetName!);
          } else {
            tokenMap.get(amount.assetName!)!.assetQuantity += amount.quantity!;
          }
        } else {
          tokenMap.set(amount.assetName!, {
            assetName: amount.assetName!,
            assetId: amount.unit!.replace(amount.policyId!, ""),
            assetQuantity: amount.quantity!,
            policy: {
              policyId: amount.policyId!,
              totalToken: 0, // TODO: need to implement
              policyScript: "" // TODO: need to implement
            }
          });
        }
      }
    });
  });
  // returning only tokens where quantity is not 0
  return Array.from<Token>(tokenMap.values());
}
