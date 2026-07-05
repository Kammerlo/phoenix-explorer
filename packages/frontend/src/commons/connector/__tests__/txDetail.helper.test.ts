import { buildTransactionDetail, RawAssetInfo } from "@shared/helpers/txDetail";

/**
 * Connector-parity tests for the shared TransactionDetail assembly.
 *
 * The same raw transaction must produce the identical DTO whether the fields
 * arrive snake_case (gateway / browser Blockfrost, raw wire format) or
 * camelCase (axios-case-converter style) — that is the invariant that keeps
 * all connectors interchangeable.
 */

const SNAKE_TO_CAMEL_EXEMPT = new Set(["json_metadata"]);

// Deep key-camelizer mimicking axios-case-converter, except metadata payloads
// (their JSON content is user data, not wire fields).
function camelize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        SNAKE_TO_CAMEL_EXEMPT.has(key) ? val : camelize(val)
      ])
    );
  }
  return value;
}

const TX = {
  hash: "txhash1",
  block: "blockhash1",
  block_height: 1000,
  block_time: 1774371612,
  slot: 5_000_000,
  fees: "168317",
  output_amount: [
    { unit: "lovelace", quantity: "42000000" },
    { unit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa746f6b656e", quantity: "7" }
  ],
  delegation_count: 1,
  withdrawal_count: 1,
  stake_cert_count: 1,
  pool_update_count: 1,
  pool_retire_count: 1,
  mir_cert_count: 1,
  redeemer_count: 0,
  asset_mint_or_burn_count: 0
};

const BLOCK = {
  hash: "blockhash1",
  epoch: 500,
  epoch_slot: 123456,
  confirmations: 42
};

const UNIT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa746f6b656e";

const UTXOS = {
  inputs: [
    {
      address: "addr1sender",
      amount: [
        { unit: "lovelace", quantity: "50000000" },
        { unit: UNIT, quantity: "7" }
      ],
      tx_hash: "prevtx1",
      output_index: 0,
      data_hash: "datahash1",
      inline_datum: "d87980",
      reference_script_hash: null,
      collateral: false,
      reference: false
    },
    {
      address: "addr1collateral",
      amount: [{ unit: "lovelace", quantity: "5000000" }],
      tx_hash: "prevtx2",
      output_index: 1,
      data_hash: null,
      inline_datum: null,
      reference_script_hash: null,
      collateral: true,
      reference: false
    },
    {
      address: "addr1refinput",
      amount: [{ unit: "lovelace", quantity: "1000000" }],
      tx_hash: "prevtx3",
      output_index: 2,
      data_hash: null,
      inline_datum: null,
      reference_script_hash: "refscript1",
      collateral: false,
      reference: true
    }
  ],
  outputs: [
    {
      address: "addr1receiver",
      amount: [
        { unit: "lovelace", quantity: "41831683" },
        { unit: UNIT, quantity: "7" }
      ],
      tx_hash: "txhash1",
      output_index: 0,
      data_hash: null,
      inline_datum: null,
      reference_script_hash: null,
      collateral: false
    }
  ]
};

const SOURCES = {
  tx: TX,
  block: BLOCK,
  utxos: UTXOS,
  metadata: [{ label: "674", json_metadata: { msg: ["hello"] } }],
  delegations: [{ address: "stake1delegator", pool_id: "pool1abc" }],
  withdrawals: [{ address: "stake1withdrawer", amount: "123456" }],
  stakes: [{ address: "stake1registrant", registration: true }],
  poolUpdates: [
    {
      fixed_cost: "340000000",
      margin_cost: 0.03,
      metadata: { hash: "mh", url: "https://pool.example/meta.json" },
      pledge: "100000000000",
      pool_id: "pool1abc",
      owners: ["stake1owner"],
      relays: [{ dns: "relay.example", dns_srv: null, ipv4: null, ipv6: null, port: 3001 }],
      reward_account: "stake1reward",
      vrf_key: "vrf1",
      active_epoch: 501
    }
  ],
  poolRetires: [{ pool_id: "pool1old", retiring_epoch: 510 }],
  mirs: [{ amount: "777", address: "stake1mir" }]
};

describe("buildTransactionDetail", () => {
  it("produces identical output for snake_case and camelCase input", async () => {
    const fromSnake = await buildTransactionDetail(SOURCES as never);
    const fromCamel = await buildTransactionDetail(camelize(SOURCES) as never);
    expect(fromCamel).toEqual(fromSnake);
  });

  it("assembles the tx header, tags and metadata", async () => {
    const detail = await buildTransactionDetail(SOURCES as never);
    expect(detail.tx).toMatchObject({
      hash: "txhash1",
      time: "1774371612",
      blockNo: 1000,
      blockHash: "blockhash1",
      epochNo: 500,
      epochSlot: 123456,
      confirmation: 42,
      fee: 168317,
      totalOutput: 42000000,
      status: "SUCCESS"
    });
    expect(detail.tx.tags).toEqual(expect.arrayContaining(["token", "stake", "pool"]));
    expect(detail.metadata).toEqual([{ label: 674, value: JSON.stringify({ msg: ["hello"] }) }]);
  });

  it("splits utxos into spend/collateral and drops reference inputs", async () => {
    const detail = await buildTransactionDetail(SOURCES as never);
    expect(detail.utxOs?.inputs.map((u) => u.address)).toEqual(["addr1sender"]);
    expect(detail.collaterals?.collateralInputResponses.map((u) => u.address)).toEqual([
      "addr1collateral"
    ]);
    // Smart-contract markers survive the mapping
    expect(detail.utxOs?.inputs[0]).toMatchObject({
      dataHash: "datahash1",
      inlineDatum: "d87980",
      index: "0",
      txHash: "prevtx1"
    });
  });

  it("aggregates the per-address summary with signed values and zero-sum token filtering", async () => {
    const detail = await buildTransactionDetail(SOURCES as never);
    const byAddress = Object.fromEntries(detail.summary.stakeAddress.map((s) => [s.address, s]));
    expect(byAddress["addr1sender"].value).toBe(-50000000 - 5000000 * 0); // collateral has its own address
    expect(byAddress["addr1collateral"].value).toBe(-5000000);
    expect(byAddress["addr1receiver"].value).toBe(41831683);
    // Reference input address must not appear in the summary
    expect(byAddress["addr1refinput"]).toBeUndefined();
    // Token moved 7 out of sender, 7 into receiver — both non-zero, kept
    expect(byAddress["addr1sender"].tokens[0].assetQuantity).toBe(-7);
    expect(byAddress["addr1receiver"].tokens[0].assetQuantity).toBe(7);
  });

  it("maps certificates, withdrawals and MIRs", async () => {
    const detail = await buildTransactionDetail(SOURCES as never);
    expect(detail.delegations).toEqual([{ address: "stake1delegator", poolId: "pool1abc" }]);
    expect(detail.withdrawals?.[0]).toMatchObject({ stakeAddressFrom: "stake1withdrawer", amount: 123456 });
    expect(detail.stakeCertificates).toEqual([
      { stakeAddress: "stake1registrant", type: "STAKE_REGISTRATION" }
    ]);
    expect(detail.poolCertificates?.map((c) => c.type)).toEqual([
      "POOL_REGISTRATION",
      "POOL_DEREGISTRATION"
    ]);
    expect(detail.poolCertificates?.[0]).toMatchObject({ poolId: "pool1abc", pledge: 100000000000 });
    expect(detail.instantaneousRewards).toEqual([{ amount: "777", stakeAddress: "stake1mir" }]);
  });

  it("enriches tokens via resolveAsset when provided, falls back to hex names without", async () => {
    const resolveAsset = async (): Promise<RawAssetInfo> => ({
      asset_name: "746f6b656e",
      policy_id: UNIT.slice(0, 56),
      onchain_metadata: { name: "Nice Token" },
      metadata: { ticker: "NICE", decimals: 6, description: "", url: "", logo: "" }
    });

    const enriched = await buildTransactionDetail({ ...SOURCES, resolveAsset } as never);
    const plain = await buildTransactionDetail(SOURCES as never);

    const enrichedToken = enriched.utxOs!.outputs[0].tokens[0];
    expect(enrichedToken.assetName).toBe("Nice Token");
    expect(enrichedToken.metadata?.ticker).toBe("NICE");
    expect(enrichedToken.metadata?.decimals).toBe(6);

    const plainToken = plain.utxOs!.outputs[0].tokens[0];
    expect(plainToken.assetName).toBe(UNIT.slice(56)); // hex asset-name fallback
    expect(plainToken.policy?.policyId).toBe(UNIT.slice(0, 56));
    expect(plainToken.metadata).toBeUndefined();
  });
});
