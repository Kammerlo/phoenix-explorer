import { AddressBalanceDto } from "../types";

export function addressBalanceDtoToWalletAddress<T>(
  addressBalance: AddressBalanceDto,
  stakeAddress: string,
  address: string
) {
  const walletAddress: WalletAddress = {
    address: addressBalance?.address || "",
    stakeAddress: stakeAddress,
    balance: addressBalance?.amounts
      ? addressBalance.amounts
          .map((amt) => {
            return amt.unit === "lovelace" ? +amt.quantity! : 0;
          })
          .reduce((a, b) => a + b, 0)
      : 0,
    tokens: addressBalance.amounts
      ?.filter((amt) => amt.assetName !== "lovelace")
      .map((token) => {
        return {
          address: address,
          name: token.assetName || "",
          displayName: token.assetName || "",
          fingerprint: token.assetName || "",
          quantity: token.quantity || 0
        };
      })
  };
  return walletAddress;
}
