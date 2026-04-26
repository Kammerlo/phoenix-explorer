// @ts-ignore — TProtocolParam is a global declaration outside strict DTOs
import { TProtocolParam } from "src/types/protocol";

/**
 * Raw shape returned by Blockfrost's `/epochs/latest/parameters` endpoint.
 * All fields are snake_case strings or numbers; some Conway-era fields are
 * absent on networks that haven't crossed the Conway hard fork.
 */
export interface BfProtocolParamsRaw {
  min_fee_a?: number | string | null;
  min_fee_b?: number | string | null;
  max_block_size?: number | string | null;
  max_tx_size?: number | string | null;
  max_block_header_size?: number | string | null;
  key_deposit?: number | string | null;
  pool_deposit?: number | string | null;
  e_max?: number | string | null;
  n_opt?: number | string | null;
  a0?: number | string | null;
  rho?: number | string | null;
  tau?: number | string | null;
  decentralisation_param?: number | string | null;
  extra_entropy?: number | string | null;
  protocol_major_ver?: number | string | null;
  protocol_minor_ver?: number | string | null;
  min_utxo?: number | string | null;
  min_pool_cost?: number | string | null;
  price_mem?: number | string | null;
  price_step?: number | string | null;
  max_tx_ex_mem?: number | string | null;
  max_tx_ex_steps?: number | string | null;
  max_block_ex_mem?: number | string | null;
  max_block_ex_steps?: number | string | null;
  max_val_size?: number | string | null;
  collateral_percent?: number | string | null;
  max_collateral_inputs?: number | string | null;
  coins_per_utxo_size?: number | string | null;
  coins_per_utxo_word?: number | string | null;
  cost_models?: unknown;
  // Conway-era
  gov_action_lifetime?: number | string | null;
  gov_action_deposit?: number | string | null;
  drep_deposit?: number | string | null;
  drep_activity?: number | string | null;
  committee_min_size?: number | string | null;
  committee_max_term_length?: number | string | null;
}

const num = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Map Blockfrost's snake_case `/epochs/latest/parameters` response to the
 * camelCase `TProtocolParam` shape consumed by the frontend.
 *
 * Mirrors `packages/gateway/src/controller/protocol-params-controller.ts`,
 * including the `coins_per_utxo_word` legacy fallback.
 */
export function mapBfProtocolParams(raw: BfProtocolParamsRaw): TProtocolParam {
  const maxBlockSize = num(raw.max_block_size);
  const maxBHSize = num(raw.max_block_header_size);

  // Mirror gateway: coins_per_utxo_size with coins_per_utxo_word fallback.
  const coinsPerUTxOByte =
    raw.coins_per_utxo_size != null && raw.coins_per_utxo_size !== ""
      ? num(raw.coins_per_utxo_size)
      : num(raw.coins_per_utxo_word);

  return {
    minFeeA: num(raw.min_fee_a),
    minFeeB: num(raw.min_fee_b),
    maxBlockSize,
    maxTxSize: num(raw.max_tx_size),
    maxBHSize,
    keyDeposit: num(raw.key_deposit),
    poolDeposit: num(raw.pool_deposit),
    maxEpoch: num(raw.e_max),
    entropy: num(raw.extra_entropy),
    protocolMajor: num(raw.protocol_major_ver),
    protocolMinor: num(raw.protocol_minor_ver),
    minUtxoValue: num(raw.min_utxo),
    minPoolCost: num(raw.min_pool_cost),
    priceMem: num(raw.price_mem),
    priceStep: num(raw.price_step),
    maxTxExMem: num(raw.max_tx_ex_mem),
    maxTxExSteps: num(raw.max_tx_ex_steps),
    maxBlockExMem: num(raw.max_block_ex_mem),
    maxBlockExSteps: num(raw.max_block_ex_steps),
    maxValSize: num(raw.max_val_size),
    collateralPercent: num(raw.collateral_percent),
    maxCollateralInputs: num(raw.max_collateral_inputs),
    coinsPerUTxOByte,
    maxTxExUnits: 0,
    // Mirror gateway: maxBBSize (block body) defaults to maxBlockSize.
    maxBBSize: maxBlockSize,
    maxBlockExUnits: 0,
    rho: num(raw.rho),
    tau: num(raw.tau),
    a0: num(raw.a0),
    eMax: num(raw.e_max),
    nOpt: num(raw.n_opt),
    costModels: JSON.stringify(raw.cost_models ?? {}),
    collateralPercentage: num(raw.collateral_percent),
    govActionLifetime: num(raw.gov_action_lifetime),
    govActionDeposit: num(raw.gov_action_deposit),
    drepDeposit: num(raw.drep_deposit),
    drepActivity: num(raw.drep_activity),
    ccMinSize: num(raw.committee_min_size),
    ccMaxTermLength: num(raw.committee_max_term_length)
  };
}
