import { PoolRegistration } from "../types";
import { getPoolMetadataFromURL } from "../util/PoolMetadataUtil";

export async function poolRegistrationsToRegistrations(data: PoolRegistration[]): Promise<Registration[]> {
  const registrations: Registration[] = [];
  for (const poolRegistration of data) {
    let poolName = "";
    if (poolRegistration.metadataUrl) {
      const poolMetadata = await getPoolMetadataFromURL(poolRegistration.metadataUrl);
      poolName = poolMetadata?.name || poolRegistration.poolId || "";
    } else {
      poolName = poolRegistration.poolId || "";
    }
    registrations.push({
      txId: 0, // TODO check if really needed
      txHash: poolRegistration.txHash || "",
      txTime: poolRegistration.blockTime ? poolRegistration.blockTime.toString() : "",
      block: poolRegistration.blockNumber || 0,
      epoch: poolRegistration.epoch || 0,
      slotNo: poolRegistration.slot || 0,
      poolName: poolName,
      poolId: poolRegistration.poolId || "",
      poolView: "", // TODO
      pledge: poolRegistration.pledge || 0,
      cost: poolRegistration.cost || 0,
      margin: poolRegistration.margin || 0,
      stakeKey: [] // TODO
    });
  }
  return registrations;
}
