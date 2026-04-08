import { TxTag } from "../dtos/transaction.dto";

/**
 * Computes transaction tags from Blockfrost tx fields.
 * Shared between the backend controllers and the direct BlockfrostConnector.
 */
export interface TxTagInput {
  output_amount?: { unit: string; quantity: string }[];
  asset_mint_or_burn_count?: number;
  delegation_count?: number;
  stake_cert_count?: number;
  withdrawal_count?: number;
  mir_cert_count?: number;
  pool_update_count?: number;
  pool_retire_count?: number;
  redeemer_count?: number;
}

export function computeTxTags(tx: TxTagInput): TxTag[] {
  const tags: TxTag[] = [];
  const hasNativeTokens = (tx.output_amount ?? []).some(a => a.unit !== "lovelace");
  if (hasNativeTokens || (tx.asset_mint_or_burn_count ?? 0) > 0) tags.push("token");
  if ((tx.asset_mint_or_burn_count ?? 0) > 0) tags.push("mint");
  if ((tx.delegation_count ?? 0) > 0 || (tx.stake_cert_count ?? 0) > 0 || (tx.withdrawal_count ?? 0) > 0 || (tx.mir_cert_count ?? 0) > 0) tags.push("stake");
  if ((tx.pool_update_count ?? 0) > 0 || (tx.pool_retire_count ?? 0) > 0) tags.push("pool");
  if ((tx.redeemer_count ?? 0) > 0) tags.push("script");
  if (tags.length === 0) tags.push("transfer");
  return tags;
}

export function computeTotalLovelaceOutput(outputAmount: { unit: string; quantity: string }[]): number {
  return outputAmount
    .filter(a => a.unit === "lovelace")
    .reduce((acc, a) => acc + parseInt(a.quantity), 0);
}
