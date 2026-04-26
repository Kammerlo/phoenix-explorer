import { mapBfProtocolParams, BfProtocolParamsRaw } from "./protocolParams";

// A representative `/epochs/latest/parameters` response captured from
// Blockfrost mainnet (Conway era). Trimmed to the fields the mapper reads.
const fixture: BfProtocolParamsRaw = {
  min_fee_a: 44,
  min_fee_b: 155381,
  max_block_size: 90112,
  max_tx_size: 16384,
  max_block_header_size: 1100,
  key_deposit: "2000000",
  pool_deposit: "500000000",
  e_max: 18,
  n_opt: 500,
  a0: 0.3,
  rho: 0.003,
  tau: 0.2,
  decentralisation_param: 0,
  extra_entropy: 0,
  protocol_major_ver: 10,
  protocol_minor_ver: 0,
  min_utxo: "4310",
  min_pool_cost: "170000000",
  price_mem: 0.0577,
  price_step: 0.0000721,
  max_tx_ex_mem: "14000000",
  max_tx_ex_steps: "10000000000",
  max_block_ex_mem: "62000000",
  max_block_ex_steps: "20000000000",
  max_val_size: "5000",
  collateral_percent: 150,
  max_collateral_inputs: 3,
  coins_per_utxo_size: "4310",
  cost_models: { PlutusV1: { addInteger: 100 } },
  gov_action_lifetime: 6,
  gov_action_deposit: "100000000000",
  drep_deposit: "500000000",
  drep_activity: 20,
  committee_min_size: 7,
  committee_max_term_length: 146
};

describe("mapBfProtocolParams", () => {
  it("maps every snake_case Blockfrost field to its camelCase TProtocolParam counterpart", () => {
    const r = mapBfProtocolParams(fixture);

    expect(r.minFeeA).toBe(44);
    expect(r.minFeeB).toBe(155381);
    expect(r.maxBlockSize).toBe(90112);
    expect(r.maxTxSize).toBe(16384);
    expect(r.maxBHSize).toBe(1100);
    expect(r.keyDeposit).toBe(2000000);
    expect(r.poolDeposit).toBe(500000000);
    expect(r.maxEpoch).toBe(18);
    expect(r.eMax).toBe(18);
    expect(r.nOpt).toBe(500);
    expect(r.a0).toBe(0.3);
    expect(r.rho).toBe(0.003);
    expect(r.tau).toBe(0.2);
    expect(r.protocolMajor).toBe(10);
    expect(r.protocolMinor).toBe(0);
    expect(r.minPoolCost).toBe(170000000);
    expect(r.priceMem).toBe(0.0577);
    expect(r.priceStep).toBe(0.0000721);
    expect(r.maxTxExMem).toBe(14000000);
    expect(r.maxTxExSteps).toBe(10000000000);
    expect(r.maxBlockExMem).toBe(62000000);
    expect(r.maxBlockExSteps).toBe(20000000000);
    expect(r.maxValSize).toBe(5000);
    expect(r.collateralPercent).toBe(150);
    expect(r.collateralPercentage).toBe(150);
    expect(r.maxCollateralInputs).toBe(3);
    expect(r.coinsPerUTxOByte).toBe(4310);
    // Conway-era
    expect(r.govActionLifetime).toBe(6);
    expect(r.govActionDeposit).toBe(100000000000);
    expect(r.drepDeposit).toBe(500000000);
    expect(r.drepActivity).toBe(20);
    expect(r.ccMinSize).toBe(7);
    expect(r.ccMaxTermLength).toBe(146);
    // costModels JSON-stringified to match gateway behavior
    expect(typeof r.costModels).toBe("string");
    expect(JSON.parse(r.costModels as string)).toEqual({ PlutusV1: { addInteger: 100 } });
  });

  it("falls back to coins_per_utxo_word when coins_per_utxo_size is missing (legacy Alonzo)", () => {
    const legacy: BfProtocolParamsRaw = {
      ...fixture,
      coins_per_utxo_size: undefined,
      coins_per_utxo_word: "34482"
    };
    const r = mapBfProtocolParams(legacy);
    expect(r.coinsPerUTxOByte).toBe(34482);
  });

  it("returns 0 for absent / null / non-numeric values rather than NaN or undefined", () => {
    const sparse: BfProtocolParamsRaw = {};
    const r = mapBfProtocolParams(sparse);
    // Every numeric field should be 0 — never NaN, never undefined.
    expect(r.minFeeA).toBe(0);
    expect(r.minFeeB).toBe(0);
    expect(r.maxBlockSize).toBe(0);
    expect(r.govActionLifetime).toBe(0);
    expect(r.drepDeposit).toBe(0);
    expect(r.coinsPerUTxOByte).toBe(0);
    expect(Number.isNaN(r.minFeeA as number)).toBe(false);
    expect(r.costModels).toBe("{}");
  });

  it("treats decimal strings as numbers (Blockfrost sometimes serializes large lovelace as strings)", () => {
    const r = mapBfProtocolParams({
      ...fixture,
      pool_deposit: "500000000",
      gov_action_deposit: "100000000000"
    });
    expect(r.poolDeposit).toBe(500000000);
    expect(r.govActionDeposit).toBe(100000000000);
  });
});
