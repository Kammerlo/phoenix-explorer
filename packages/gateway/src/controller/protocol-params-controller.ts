import { Router } from "express";
import { API } from "../config/blockfrost";
import { ApiReturnType } from "@shared/APIReturnType";

export const protocolParamsController = Router();

protocolParamsController.get("", async (_req, res) => {
  const params = await API.epochsLatestParameters();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {
    minFeeA: params.min_fee_a,
    minFeeB: params.min_fee_b,
    maxBlockSize: params.max_block_size,
    maxTxSize: params.max_tx_size,
    maxBHSize: params.max_block_header_size,
    keyDeposit: params.key_deposit,
    poolDeposit: params.pool_deposit,
    maxEpoch: params.e_max,
    entropy: 0,
    protocolMajor: params.protocol_major_ver,
    protocolMinor: params.protocol_minor_ver,
    minUtxoValue: params.min_utxo ?? 0,
    minPoolCost: params.min_pool_cost,
    priceMem: params.price_mem ?? 0,
    priceStep: params.price_step ?? 0,
    maxTxExMem: params.max_tx_ex_mem ?? 0,
    maxTxExSteps: params.max_tx_ex_steps ?? 0,
    maxBlockExMem: params.max_block_ex_mem ?? 0,
    maxBlockExSteps: params.max_block_ex_steps ?? 0,
    maxValSize: params.max_val_size ?? 0,
    collateralPercent: params.collateral_percent ?? 0,
    maxCollateralInputs: params.max_collateral_inputs ?? 0,
    coinsPerUTxOByte: params.coins_per_utxo_size ?? params.coins_per_utxo_word ?? 0,
    maxTxExUnits: 0,
    maxBBSize: params.max_block_size,
    maxBlockExUnits: 0,
    rho: params.rho,
    tau: params.tau,
    a0: params.a0,
    eMax: params.e_max,
    nOpt: params.n_opt,
    costModels: JSON.stringify(params.cost_models ?? {}),
    collateralPercentage: params.collateral_percent ?? 0,
    govActionLifetime: (params as any).gov_action_lifetime ?? 0,
    govActionDeposit: (params as any).gov_action_deposit ?? 0,
    drepDeposit: (params as any).drep_deposit ?? 0,
    drepActivity: (params as any).drep_activity ?? 0,
    ccMinSize: (params as any).committee_min_size ?? 0,
    ccMaxTermLength: (params as any).committee_max_term_length ?? 0
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.json({ data: result, lastUpdated: Date.now() } as ApiReturnType<any>);
});
