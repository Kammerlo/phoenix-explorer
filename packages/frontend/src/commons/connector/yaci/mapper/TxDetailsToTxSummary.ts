import { TransactionDetails, TxUtxo } from "../types";
import { utxosToTokenArray } from "./TxUtxosToTokens";

export function txDetailsToTxSummary(txDetails: TransactionDetails) {
  const addresses = new Map<string, TxUtxo[]>();
  txDetails.inputs?.forEach((value) => {
    // Need to negate the amount for inputs
    value.amount?.forEach((amount) => {
      amount.quantity = amount.quantity ? amount.quantity * -1 : amount.quantity;
    });
    addresses.has(value.stakeAddress!)
      ? addresses.get(value.stakeAddress!)!.push(value)
      : addresses.set(value.stakeAddress!, [value]);
  });
  txDetails.outputs?.forEach((value) =>
    addresses.has(value.stakeAddress!)
      ? addresses.get(value.stakeAddress!)!.push(value)
      : addresses.set(value.stakeAddress!, [value])
  );
  const summary: {
    address: string;
    value: number;
    fee: number; // TODO
    tokens: never[]; // TODO
  }[] = [];
  addresses.forEach((utxos, stakeAddress) => {
    // Calculate the sum of lovelace for each stake address
    let map = utxos.map((utxo) => {
      return (
        utxo.amount
          ?.filter((amount) => amount.assetName === "lovelace")
          .map((amount) => amount.quantity)
          .reduce((acc, value) => (value ? acc! + value : acc), 0) || 0
      );
    });
    const value = map.reduce((acc, value) => acc + value, 0);
    summary.push({
      address: stakeAddress,
      value: value,
      fee: -1, // TODO made it in purpose -1 to notice if it will be displayed somewhere
      tokens: utxosToTokenArray(utxos)
    });
  });
  return summary;
}
