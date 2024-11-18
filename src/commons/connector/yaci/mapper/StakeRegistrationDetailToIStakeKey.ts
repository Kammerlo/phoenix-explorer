import { StakeRegistrationDetail } from "../types";

export function stakeRegistrationDetailToIStakeKey(stakeDetail: StakeRegistrationDetail): IStakeKey {
  return {
    txHash: stakeDetail.txHash || "",
    txTime: stakeDetail.blockTime + "" || "",
    block: stakeDetail.blockNumber || 0,
    epoch: stakeDetail.epoch || 0,
    slotNo: stakeDetail.slot || 0,
    epochSlotNo: stakeDetail.slot || 0, // TODO: need to implement
    stakeKey: stakeDetail.address || ""
  } as IStakeKey;
}
