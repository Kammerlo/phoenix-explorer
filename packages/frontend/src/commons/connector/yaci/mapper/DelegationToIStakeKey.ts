import { Delegation } from "../types";

export function delegationToIStakeKey(stakeDetail: Delegation): IStakeKey {
  return {
    txHash: stakeDetail.txHash || "",
    txTime: stakeDetail.blockTime + "" || "",
    block: stakeDetail.blockNumber || 0,
    epoch: stakeDetail.epoch || 0,
    slotNo: stakeDetail.slot || 0,
    epochSlotNo: stakeDetail.slot || 0, // TODO: need to implement
    stakeKey: stakeDetail.address || "",
    poolName: stakeDetail.poolId || ""
  } as IStakeKey;
}
