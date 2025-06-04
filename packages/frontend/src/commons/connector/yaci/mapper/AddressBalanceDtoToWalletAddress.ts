import { AddressBalanceDto } from "../types";

export function addressBalanceDtoToWalletAddress(
  addressBalance: AddressBalanceDto,
  stakeAddress: string,
  address: string
): WalletAddress {
  const amounts = addressBalance?.amounts ?? [];

  const balance = amounts
    .filter((amt) => amt.unit === "lovelace")
    .reduce((sum, amt) => sum + Number(amt.quantity ?? 0), 0);

  const tokens  = amounts
    .filter((amt) => amt.unit !== "lovelace")
    .map((token) => ({
      address,
      name: token.assetName ?? "",
      displayName: token.assetName ?? "",
      fingerprint: token.assetName ?? "",
      quantity: token.quantity ?? 0,
    } as WalletToken));

  return {
    isContract: false, // TODO
    txCount: 0, // TODO
    address: addressBalance?.address ?? "",
    stakeAddress,
    balance,
    tokens
  };
}
