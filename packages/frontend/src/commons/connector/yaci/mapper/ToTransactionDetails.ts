import { TransactionDetails, TxInputsOutputs, TxMetadataLabelDto, Withdrawal } from "../types";
import { txUtxoToUtxo } from "./TxUtxoToUtxo";
import { txUtxoToCollateralResponse } from "./TxUtxoToCollateral";
import { txDetailsToTxSummary } from "./TxDetailsToTxSummary";
import { TransactionDetail } from "@shared/dtos/transaction.dto";
import { Block } from "@shared/dtos/block.dto";

export function toTransactionDetail(
  txDetails: TransactionDetails,
  block: Block | null,
  metadata: TxMetadataLabelDto[],
  utxos: TxInputsOutputs,
  withdrawals: Withdrawal[]
): TransactionDetail {
  const inputs = utxos.inputs ?? txDetails.inputs ?? [];
  const outputs = utxos.outputs ?? txDetails.outputs ?? [];

  const tx: TransactionDetail = {
    tx: {
      hash: txDetails.hash!,
      time: block ? block.time : "",
      blockNo: block ? block.blockNo : 0,
      blockHash: txDetails.blockHash ?? (block ? block.hash : ""),
      epochSlot: block ? block.epochSlotNo : 0,
      epochNo: block ? block.epochNo : 0,
      status: txDetails.invalid ? "FAILED" : "SUCCESS",
      confirmation: 0, // TODO: need to implement
      fee: Number(txDetails.fees ?? 0),
      totalOutput: Number(txDetails.totalOutput ?? 0),
      maxEpochSlot: 0, // TODO: need to implement
      slotNo: block ? block.slotNo : 0
    },
    utxOs: {
      inputs: inputs.map((input) => txUtxoToUtxo(input)),
      outputs: outputs.map((output) => txUtxoToUtxo(output))
    },
    // TODO will add later, when needed
    collaterals: {
      collateralInputResponses: txDetails.collateralInputs
        ? txDetails.collateralInputs.map((input) => txUtxoToCollateralResponse(input))
        : [],
      collateralOutputResponses: [] // TODO: need to implement
    },
    summary: {
      stakeAddress: txDetailsToTxSummary(txDetails)
    },
    // signersInformation: mapToSignersInformation(txDetails), // TODO requiredSigners is not available in response
    withdrawals: withdrawals.map((w) => ({
      stakeAddressFrom: w.address ?? "",
      addressTo: [],
      amount: Number(w.amount ?? 0)
    })),
    metadata: metadata.map((meta) => {
      const json = meta.jsonMetadata;
      let value = "";
      if (json != null) {
        value = typeof json === "string" ? json : JSON.stringify(json);
      }
      return {
        label: meta.label ? +meta.label : 0,
        value
      };
    }),
    metadataHash: "" // TODO
  };
  return tx;
}
