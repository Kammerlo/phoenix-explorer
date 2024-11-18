import { PoolRetirement } from "../types";

export function poolRetirementsToRegistrations(data: PoolRetirement[]): Registration[] {
  return data.map((poolRetirement) => {
    return {
      txId: 0, // TODO check if really needed
      txHash: poolRetirement.txHash || "",
      txTime: poolRetirement.blockTime ? poolRetirement.blockTime.toString() : "",
      block: poolRetirement.blockNumber || 0,
      epoch: poolRetirement.epoch || 0,
      slotNo: poolRetirement.slot || 0,
      poolName: poolRetirement.poolId || "",
      poolId: poolRetirement.poolId || "",
      poolView: "", // TODO
      pledge: 0, // TODO
      cost: 0, // TODO
      margin: 0, // TODO
      stakeKey: [] // TODO
    };
  });
}
