import { BlockDto } from "../types";

export function blockDTOToBlock(input: BlockDto): Block {
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
