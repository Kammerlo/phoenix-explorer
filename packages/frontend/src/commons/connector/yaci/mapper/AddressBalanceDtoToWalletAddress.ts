import { AddressBalanceDto } from "../types";
import { AddressDetail, Token } from "@shared/dtos/address.dto";

export function addressBalanceDtoToWalletAddress(
  addressBalance: AddressBalanceDto,
  stakeAddress: string,
  address: string
): AddressDetail {
  const amounts = addressBalance?.amounts ?? [];

  const balance = amounts
    .filter((amt) => amt.unit === "lovelace")
    .reduce((sum, amt) => sum + Number(amt.quantity ?? 0), 0);

  const tokens: Token[] = amounts
    .filter((amt) => amt.unit !== "lovelace")
    .map((t) => ({
      address,
      name: t.assetName ?? "",
      displayName: t.assetName ?? "",
      fingerprint: t.assetName ?? "",
      quantity: Number(t.quantity ?? 0)
    }));

  return {
    address: addressBalance?.address ?? address,
    txCount: 0,
    balance,
    tokens,
    stakeAddress,
    isContract: false
  };
}
