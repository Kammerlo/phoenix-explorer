import { OgmiosUtxo, OgmiosRewardAccountSummary } from "../types";
import { AddressDetail, Token, StakeAddressDetail } from "../../dtos/address.dto";
import { flattenValue } from "../helpers/value";

export function mapUtxosToAddressDetail(address: string, utxos: OgmiosUtxo[]): AddressDetail {
  let balance = 0;
  const byUnit = new Map<string, { policyId: string; assetName: string; quantity: number }>();
  for (const u of utxos) {
    const { lovelace, assets } = flattenValue(u.value);
    balance += lovelace;
    for (const a of assets) {
      const prev = byUnit.get(a.unit);
      if (prev) prev.quantity += a.quantity;
      else byUnit.set(a.unit, { policyId: a.policyId, assetName: a.assetName, quantity: a.quantity });
    }
  }
  const tokens: Token[] = [...byUnit.entries()].map(([unit, a]) => ({
    address,
    name: a.assetName,
    displayName: hexToUtf8(a.assetName),
    fingerprint: unit,
    quantity: a.quantity
  }));
  return {
    address,
    txCount: 0,
    balance,
    tokens,
    stakeAddress: "",
    isContract: address.startsWith("addr1w") || address.startsWith("addr_test1w")
  };
}

export function mapRewardSummaryToStakeDetail(
  stakeAddress: string,
  summary: OgmiosRewardAccountSummary | undefined
): StakeAddressDetail {
  if (!summary) {
    return {
      status: "INACTIVE",
      stakeAddress,
      totalStake: 0,
      rewardAvailable: 0,
      rewardWithdrawn: 0,
      pool: { tickerName: "", poolName: "", poolId: "" }
    };
  }
  return {
    status: "ACTIVE",
    stakeAddress,
    totalStake: 0,
    rewardAvailable: summary.rewards.ada.lovelace,
    rewardWithdrawn: 0,
    pool: { tickerName: "", poolName: "", poolId: summary.stakePool?.id ?? "" }
  };
}

function hexToUtf8(hex: string): string {
  try {
    const bytes = new Uint8Array((hex.match(/.{1,2}/g) ?? []).map((b) => parseInt(b, 16)));
    const s = new TextDecoder("utf-8").decode(bytes);
    return /^[\x20-\x7e]*$/.test(s) ? s : hex;
  } catch {
    return hex;
  }
}
