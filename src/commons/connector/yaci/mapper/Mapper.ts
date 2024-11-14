import { Amt, BlockDto, Epoch, TransactionDetails, TxUtxo } from "../types";

export function mapTxUtxoToUtxo(input: TxUtxo) {
  return {
    address: input.address || "",
    stakeAddress: input.stakeAddress || "",
    value: input.amount && input.amount[0].assetName === "lovelace" ? input.amount[0].quantity! : 0,
    txHash: input.txHash || "",
    index: input.outputIndex ? input.outputIndex.toString() : "",
    tokens: (input.amount!.length > 0 && input.amount![0].unit === "lovelace"
      ? input.amount!.slice(1)
      : input.amount!
    ).map((amount) => {
      return amtToToken(amount);
    })
  };
}

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
export function mapTxUtxoToCollateralResponse(input: TxUtxo): CollateralResponses {
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

export function mapBlockDTOToBlock(input: BlockDto): Block {
  return {
    time: input.time ? input.time!.toString() : "",
    blockNo: input.number || 0,
    hash: input.hash || "",
    slotNo: input.slot || 0,
    epochNo: input.epoch || 0,
    epochSlotNo: input.epochSlot || 0,
    slotLeader: input.slotLeader || "",
    txCount: input.txCount || 0,
    totalOutput: input.output || 0,
    totalFees: input.fees || 0,
    maxEpochSlot: 0,
    poolName: "",
    poolTicker: "",
    poolView: "",
    description: ""
  };
}

function utxosToTokenArray(utxos: TxUtxo[]): Token[] {
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

export function mapTxDetailsToTxSummary(txDetails: TransactionDetails) {
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

export function epochToIEpochData(epoch: Epoch): IDataEpoch {
  const DAY_IN_SECONDS = 86400;
  const epochData: IDataEpoch = {
    no: epoch.number || 0,
    status: epoch.endTime! < Date.now() ? "FINISHED" : "IN_PROGRESS",
    blkCount: epoch.blockCount || 0,
    endTime: epoch.endTime ? epoch.endTime.toString() : "",
    startTime: epoch.startTime ? epoch.startTime.toString() : "",
    outSum: epoch.totalOutput || 0,
    txCount: epoch.transactionCount || 0,
    epochSlotNo: epoch.maxSlot || 0, // TODO: need to check it, since I used this value twice
    maxSlot: epoch.maxSlot || 0,
    rewardsDistributed: 0, // TODO: need to implement
    account: 0,
    // If syncing is still ongoing in the current epoch, then endTime is nearly Date.now() in seconds
    // We assume an epoch is 5 Days long, so we calculate the progress based on that
    syncingProgress:
      epoch.endTime && epoch.startTime ? ((epoch.endTime - epoch.startTime) / (DAY_IN_SECONDS * 5)) * 100 : 0
  };
  console.log(
    "Now " + Date.now() + " StartTime: ",
    epoch.startTime,
    "EndTime: ",
    epoch.endTime,
    "Progress: ",
    epochData.syncingProgress
  );
  return epochData;
}
