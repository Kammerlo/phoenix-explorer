import { IContractItemTx, ReferenceInput } from "@shared/dtos/transaction.dto";
import { TxUtxo } from "../types";

function toReferenceInput(u: TxUtxo): ReferenceInput {
  return {
    address: u.address ?? "",
    index: u.outputIndex ?? 0,
    script: u.scriptRef ?? "",
    scriptHash: u.referenceScriptHash ?? "",
    txHash: u.txHash ?? "",
    value: 0,
    datumHash: u.dataHash ?? "",
    datum: u.inlineDatum ?? "",
    scriptType: ""
  };
}

/**
 * Build `TransactionDetail.contracts` from yaci-store transaction data so the
 * smart-contract visualization works identically on the Yaci connector.
 *
 * yaci-store does not expose per-redeemer execution units the way Blockfrost
 * does, so we derive one SPEND contract per datum-bearing (script-locked) input
 * — every datum on an input implies a script address being spent. Script bytes
 * come from an inline reference script when present; redeemer ExUnits are left at
 * zero (unavailable from this provider). The returned shape is identical to the
 * Blockfrost path so the UI is provider-agnostic.
 */
export function toContracts(inputs: TxUtxo[], outputs: TxUtxo[], referenceInputs: TxUtxo[] = []): IContractItemTx[] {
  const references = (referenceInputs ?? []).map(toReferenceInput);
  const scriptOutputs = (outputs ?? []).filter((o) => o.inlineDatum || o.dataHash);
  const contracts: IContractItemTx[] = [];

  for (const input of inputs ?? []) {
    if (!input.inlineDatum && !input.dataHash) continue; // not a script-locked input
    const continuingOutput = scriptOutputs.find((o) => o.address === input.address);
    contracts.push({
      contract: input.referenceScriptHash ?? "",
      address: input.address ?? "",
      datumBytesIn: input.inlineDatum ?? "",
      datumBytesOut: continuingOutput?.inlineDatum ?? "",
      datumHashIn: input.dataHash ?? "",
      datumHashOut: continuingOutput?.dataHash ?? "",
      purpose: "SPEND",
      redeemerBytes: "",
      redeemerMem: 0,
      redeemerSteps: 0,
      scriptBytes: input.scriptRef ?? "",
      scriptHash: input.referenceScriptHash ?? "",
      ...(references.length ? { referenceInputs: references } : {})
    });
  }

  return contracts;
}
