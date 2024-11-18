import { TransactionSummary } from "../types";
import { ApiReturnType } from "../../types/APIReturnType";

export function transactionSummaryAndBlockToTransaction(txSummary: TransactionSummary, block: ApiReturnType<Block>) {
  const tx: Transaction = {
    hash: txSummary.txHash || "",
    time: block.data?.time || "", // TODO: need to implement
    blockNo: txSummary.blockNumber || 0,
    blockHash: block.data?.hash || "", // TODO: need to implement
    fee: txSummary.fee || 0,
    epochNo: block.data?.epochNo || 0, // TODO: need to implement
    epochSlotNo: block.data?.epochSlotNo || 0, // TODO: need to implement
    slot: block.data?.slotNo || 0, // TODO: need to implement
    totalOutput: txSummary.totalOutput || 0,
    addressesOutput: txSummary.outputAddresses || [],
    addressesInput: [],
    balance: 0,
    tokens: [] // TODO: need to implement
  };
  return tx;
}
