export interface Block {
  blockNo: number;
  epochNo: number;
  epochSlotNo: number;
  slotNo: number;
  hash: string;
  slotLeader?: string;
  time: string;
  totalFees: number;
  totalOutput: number;
  txCount: number;
  maxEpochSlot?: number;
  poolName?: string;
  poolTicker?: string;
  poolView?: string;
  description?: string;
  size?: number;          // block size in bytes
  confirmations?: number; // number of confirmations
  blockVrf?: string;      // VRF key used to mint the block
  previousBlock?: string; // hash of the previous block
  nextBlock?: string;     // hash of the next block
}
