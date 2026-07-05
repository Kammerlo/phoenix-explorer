import { AddressDetail, Token } from "@shared/dtos/address.dto";
import { AddressBalanceDto, Amt, TxUtxo } from "../types";

function amtToAddressToken(address: string, amt: Amt): Token {
  return {
    address,
    name: amt.assetName ?? amt.unit ?? "",
    displayName: amt.assetName ?? amt.unit ?? "",
    fingerprint: amt.fingerprint ?? "",
    quantity: Number(amt.quantity ?? 0)
  };
}

/**
 * Compose an `AddressDetail` from yaci-store's GET /addresses/{address}/balance
 * response plus (optionally) rows of GET /addresses/{address}/utxos, which may
 * carry the owner's stake address on some yaci-store builds.
 *
 * Honesty notes:
 * - yaci-store exposes no cheap per-address tx count → txCount stays 0.
 * - the 0.10.6 utxo rows carry no stake address → stakeAddress falls back to "".
 * - there is no script/contract classification endpoint → isContract is false.
 */
export function toAddressDetail(balance: AddressBalanceDto, utxos: TxUtxo[] = []): AddressDetail {
  const amounts = balance.amounts ?? [];
  const address = balance.address ?? "";
  return {
    address,
    txCount: 0,
    balance: Number(amounts.find((a) => a.unit === "lovelace")?.quantity ?? 0),
    tokens: amounts.filter((a) => a.unit && a.unit !== "lovelace").map((a) => amtToAddressToken(address, a)),
    stakeAddress: utxos.find((u) => u.stakeAddress)?.stakeAddress ?? "",
    isContract: false
  };
}
