import { TransactionDetails, TxMetadataLabelDto } from "../types";
import { txUtxoToUtxo } from "./TxUtxoToUtxo";
import { txUtxoToCollateralResponse } from "./TxUtxoToCollateral";
import { txDetailsToTxSummary } from "./TxDetailsToTxSummary";
import {TransactionDetail} from "@shared/dtos/transaction.dto";
import {Block} from "@shared/dtos/block.dto";

export function toTransactionDetail<T>(
  txDetails: TransactionDetails,
  block: Block | null,
  metadata: TxMetadataLabelDto[]
) {
  const tx: TransactionDetail = {
    tx: {
      hash: txDetails.hash!,
      time: block ? block.time : "",
      blockNo: block ? block.blockNo : 0,
      epochSlot: block ? block.epochSlotNo : 0,
      epochNo: block ? block.epochNo : 0,
      status: txDetails.invalid ? 'FAILED' : 'SUCCESS',
      confirmation: 0, // TODO: need to implement
      fee: txDetails.fees || 0,
      totalOutput: txDetails.totalOutput || 0,
      maxEpochSlot: 0, // TODO: need to implement
      slotNo: block ? block.slotNo : 0
    },
    utxOs: {
      inputs: txDetails.inputs!.map((input) => {
        return txUtxoToUtxo(input);
      }),
      outputs: txDetails.outputs!.map((output) => {
        return txUtxoToUtxo(output);
      })
    },
    // TODO will add later, when needed
    collaterals: {
      collateralInputResponses: txDetails.collateralInputs
        ? txDetails.collateralInputs.map((input) => {
            return txUtxoToCollateralResponse(input);
          })
        : [],
      collateralOutputResponses: [] // TODO: need to implement
    },
    summary: {
      stakeAddress: txDetailsToTxSummary(txDetails)
    },
    // signersInformation: mapToSignersInformation(txDetails), // TODO requiredSigners is not available in response
    metadata: metadata.map((meta) => {
      return {
        label: meta.label ? +meta.label : 0,
        value: meta.jsonMetadata?.toString() || ""
      };
    }),
    metadataHash: "" // TODO
  };
  return tx;
}
