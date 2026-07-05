import { StakeAddressDetail } from "@shared/dtos/address.dto";
import { StakeAccountInfo } from "../types";

/**
 * Map yaci-store's GET /accounts/{stakeAddress} response
 * ({ stakeAddress, controlledAmount, withdrawableAmount, poolId }) to the
 * shared `StakeAddressDetail` DTO.
 *
 * yaci-store exposes neither lifetime withdrawn rewards nor pool metadata, so
 * rewardWithdrawn stays 0 and the pool carries only its id.
 */
export function toStakeAddressDetail(account: StakeAccountInfo): StakeAddressDetail {
  return {
    status: account.poolId ? "ACTIVE" : "INACTIVE",
    stakeAddress: account.stakeAddress ?? "",
    totalStake: Number(account.controlledAmount ?? 0),
    rewardAvailable: Number(account.withdrawableAmount ?? 0),
    rewardWithdrawn: 0,
    pool: {
      poolId: account.poolId ?? "",
      poolName: "",
      tickerName: ""
    }
  };
}
