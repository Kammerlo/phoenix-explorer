import { IContractItemTx, Token, TPoolCertificated, TransactionDetail } from "../dtos/transaction.dto";
import { computeTxTags, computeTotalLovelaceOutput, TxTagInput } from "./txTags";

/**
 * Connector-agnostic assembly of a full `TransactionDetail` from raw
 * Blockfrost-shaped transaction data.
 *
 * Single source of truth shared by the gateway (`transactionService`) and the
 * in-browser `BlockfrostConnector` — both fetch raw data with their own client
 * and caching, then feed it here and get the identical DTO out. Casing-agnostic
 * (snake_case wire format and camelCased equivalents), same pattern as
 * `helpers/contracts.ts`.
 *
 * Asset metadata enrichment is optional: pass `resolveAsset` (the gateway does,
 * backed by its 1h cache) to get token names/decimals/logos from the asset
 * registry; without it tokens fall back to the hex asset-name embedded in the
 * unit — which is all a browser-direct connector can afford.
 */

const pick = (obj: any, ...keys: string[]): any => {
  for (const key of keys) {
    if (obj?.[key] !== undefined) return obj[key];
  }
  return undefined;
};

/** Minimal slice of Blockfrost's `/assets/{unit}` payload used for enrichment. */
export interface RawAssetInfo {
  asset_name?: string | null;
  policy_id?: string | null;
  mint_or_burn_count?: number | null;
  onchain_metadata?: Record<string, unknown> | null;
  metadata?: {
    description?: string | null;
    url?: string | null;
    logo?: string | null;
    ticker?: string | null;
    decimals?: number | null;
  } | null;
}

export type AssetResolver = (unit: string) => Promise<RawAssetInfo | null>;

export interface TxDetailSources {
  /** Raw tx (`tx_content`). */
  tx: any;
  /** Raw block header of the containing block (`block_content`). */
  block: any;
  /** Raw UTxO set (`tx_content_utxo`): `{ inputs, outputs }`. */
  utxos: { inputs?: any[]; outputs?: any[] };
  /** Raw metadata list (`tx_content_metadata`). */
  metadata?: any[];
  delegations?: any[];
  withdrawals?: any[];
  stakes?: any[];
  poolUpdates?: any[];
  poolRetires?: any[];
  mirs?: any[];
  /** Pre-built contract items (see `helpers/contracts.ts`). */
  contracts?: IContractItemTx[];
  resolveAsset?: AssetResolver;
}

/** Normalize a raw tx to the snake_case count fields `computeTxTags` expects. */
export function normalizeTxTagInput(tx: any): TxTagInput {
  return {
    output_amount: pick(tx, "output_amount", "outputAmount"),
    asset_mint_or_burn_count: pick(tx, "asset_mint_or_burn_count", "assetMintOrBurnCount"),
    delegation_count: pick(tx, "delegation_count", "delegationCount"),
    stake_cert_count: pick(tx, "stake_cert_count", "stakeCertCount"),
    withdrawal_count: pick(tx, "withdrawal_count", "withdrawalCount"),
    mir_cert_count: pick(tx, "mir_cert_count", "mirCertCount"),
    pool_update_count: pick(tx, "pool_update_count", "poolUpdateCount"),
    pool_retire_count: pick(tx, "pool_retire_count", "poolRetireCount"),
    redeemer_count: pick(tx, "redeemer_count", "redeemerCount")
  };
}

const lovelaceOf = (utxo: any): number =>
  parseInt((utxo?.amount ?? []).find((a: any) => a.unit === "lovelace")?.quantity ?? "0");

const nonLovelace = (utxo: any): { unit: string; quantity: string }[] =>
  (utxo?.amount ?? []).filter((a: any) => a.unit !== "lovelace");

const isReference = (utxo: any): boolean => Boolean(pick(utxo, "reference"));
const isCollateral = (utxo: any): boolean => Boolean(pick(utxo, "collateral"));

/** Resolve every distinct asset once; returns an empty map without a resolver. */
async function resolveDistinctAssets(
  utxos: any[],
  resolveAsset?: AssetResolver
): Promise<Map<string, RawAssetInfo | null>> {
  const assets = new Map<string, RawAssetInfo | null>();
  if (!resolveAsset) return assets;
  const units = new Set<string>();
  for (const utxo of utxos) {
    for (const { unit } of nonLovelace(utxo)) units.add(unit);
  }
  await Promise.all(
    [...units].map(async (unit) => {
      assets.set(unit, await resolveAsset(unit).catch(() => null));
    })
  );
  return assets;
}

function toToken(unit: string, quantity: string, assets: Map<string, RawAssetInfo | null>): Token {
  const asset = assets.get(unit);
  const token: Token = {
    assetName:
      (asset?.onchain_metadata?.["name"] as string | undefined) ??
      asset?.asset_name ??
      unit.slice(56),
    assetQuantity: parseInt(quantity),
    assetId: unit,
    policy: {
      policyId: asset?.policy_id ?? unit.slice(0, 56),
      totalToken: asset?.mint_or_burn_count ?? 0
    }
  };
  if (asset?.metadata) {
    token.metadata = {
      description: asset.metadata.description ?? "",
      url: asset.metadata.url ?? "",
      logo: asset.metadata.logo ?? "",
      ticker: asset.metadata.ticker ?? "",
      decimals: asset.metadata.decimals ?? 0
    };
  }
  return token;
}

/**
 * Per-address balance summary. Outputs add to an address (received → positive);
 * inputs subtract (sent → negative) — the Summary UI treats value > 0 as
 * received. Reference inputs are not part of the transaction balance.
 */
type SummaryEntry = { address: string; value: number; tokens: Token[] };

function buildSummary(
  inputs: any[],
  outputs: any[],
  assets: Map<string, RawAssetInfo | null>
): TransactionDetail["summary"]["stakeAddress"] {
  const byAddress = new Map<string, SummaryEntry>();

  const add = (utxo: any, sign: 1 | -1) => {
    if (isReference(utxo)) return;
    const entry: SummaryEntry = byAddress.get(utxo.address) ?? { address: utxo.address, value: 0, tokens: [] };
    entry.value += sign * lovelaceOf(utxo);
    for (const { unit, quantity } of nonLovelace(utxo)) {
      const signedQuantity = sign * parseInt(quantity);
      const existing = entry.tokens.find((t) => t.assetId === unit);
      if (existing) {
        existing.assetQuantity += signedQuantity;
      } else {
        entry.tokens.push({ ...toToken(unit, quantity, assets), assetQuantity: signedQuantity });
      }
    }
    byAddress.set(utxo.address, entry);
  };

  inputs.forEach((utxo) => add(utxo, -1));
  outputs.forEach((utxo) => add(utxo, 1));

  return [...byAddress.values()].map((entry) => ({
    ...entry,
    tokens: entry.tokens.filter((t) => t.assetQuantity !== 0)
  }));
}

function toUtxoView(utxo: any, assets: Map<string, RawAssetInfo | null>) {
  return {
    address: utxo.address as string,
    // Required by the CollateralResponses DTO; raw Blockfrost UTxOs don't carry it.
    assetId: (utxo.assetId as string) ?? "",
    value: lovelaceOf(utxo),
    txHash: String(pick(utxo, "tx_hash", "txHash") ?? ""),
    index: String(pick(utxo, "output_index", "outputIndex") ?? 0),
    // Smart-contract markers so the flow view can flag datum / reference-script UTxOs.
    dataHash: pick(utxo, "data_hash", "dataHash") ?? null,
    inlineDatum: pick(utxo, "inline_datum", "inlineDatum") ?? null,
    referenceScriptHash: pick(utxo, "reference_script_hash", "referenceScriptHash") ?? null,
    tokens: nonLovelace(utxo).map(({ unit, quantity }) => toToken(unit, quantity, assets))
  };
}

/** Split a raw UTxO list into spendable vs collateral views (reference inputs dropped). */
function splitUtxos(utxos: any[], assets: Map<string, RawAssetInfo | null>) {
  const spend: ReturnType<typeof toUtxoView>[] = [];
  const collateral: ReturnType<typeof toUtxoView>[] = [];
  for (const utxo of utxos) {
    if (isReference(utxo)) continue;
    (isCollateral(utxo) ? collateral : spend).push(toUtxoView(utxo, assets));
  }
  return { spend, collateral };
}

function mapPoolUpdate(cert: any): TPoolCertificated {
  return {
    cost: Number.parseInt(pick(cert, "fixed_cost", "fixedCost") ?? "0"),
    margin: pick(cert, "margin_cost", "marginCost") ?? 0,
    metadataHash: cert.metadata?.hash ?? "",
    metadataUrl: cert.metadata?.url ?? "",
    pledge: cert.pledge ? Number.parseInt(cert.pledge) : 0,
    poolId: pick(cert, "pool_id", "poolId"),
    poolOwners: cert.owners ?? [],
    relays: (cert.relays ?? []).map((relay: any) => ({
      dnsName: relay.dns ?? "",
      dnsSrvName: pick(relay, "dns_srv", "dnsSrv") ?? "",
      ipv4: relay.ipv4 ?? "",
      ipv6: relay.ipv6 ?? "",
      port: relay.port
    })),
    rewardAccount: pick(cert, "reward_account", "rewardAccount") ?? "",
    type: "POOL_REGISTRATION",
    vrfKey: pick(cert, "vrf_key", "vrfKey") ?? "",
    epoch: pick(cert, "active_epoch", "activeEpoch") ?? 0
  } as TPoolCertificated;
}

function mapPoolRetire(cert: any): TPoolCertificated {
  return {
    poolId: pick(cert, "pool_id", "poolId"),
    epoch: pick(cert, "retiring_epoch", "retiringEpoch") ?? 0,
    type: "POOL_DEREGISTRATION"
  } as TPoolCertificated;
}

export async function buildTransactionDetail(src: TxDetailSources): Promise<TransactionDetail> {
  const { tx, block } = src;
  const inputs = src.utxos.inputs ?? [];
  const outputs = src.utxos.outputs ?? [];

  const assets = await resolveDistinctAssets([...inputs, ...outputs], src.resolveAsset);

  const inputViews = splitUtxos(inputs, assets);
  const outputViews = splitUtxos(outputs, assets);
  const tagInput = normalizeTxTagInput(tx);

  const detail: TransactionDetail = {
    tx: {
      hash: tx.hash,
      time: String(pick(tx, "block_time", "blockTime") ?? ""),
      blockNo: pick(tx, "block_height", "blockHeight") ?? 0,
      blockHash: block?.hash ?? tx.block ?? "",
      epochSlot: pick(block ?? {}, "epoch_slot", "epochSlot") ?? 0,
      epochNo: block?.epoch ?? 0,
      status: "SUCCESS",
      confirmation: block?.confirmations ?? 0,
      fee: parseInt(tx.fees ?? "0"),
      totalOutput: computeTotalLovelaceOutput(tagInput.output_amount ?? []),
      maxEpochSlot: pick(block ?? {}, "epoch_slot", "epochSlot") ?? 0,
      slotNo: tx.slot ?? 0,
      tags: computeTxTags(tagInput)
    },
    summary: {
      stakeAddress: buildSummary(inputs, outputs, assets)
    },
    collaterals: {
      collateralInputResponses: inputViews.collateral,
      collateralOutputResponses: outputViews.collateral
    },
    utxOs: {
      inputs: inputViews.spend,
      outputs: outputViews.spend
    },
    metadata: src.metadata?.length
      ? src.metadata.map((m: any) => {
          const json = pick(m, "json_metadata", "jsonMetadata");
          return {
            label: parseInt(m.label, 10),
            value: json != null ? JSON.stringify(json) : (pick(m, "cbor_metadata", "cborMetadata") ?? "null")
          };
        })
      : undefined,
    metadataHash: ""
  };

  if (src.delegations?.length) {
    detail.delegations = src.delegations.map((d: any) => ({
      address: d.address,
      poolId: pick(d, "pool_id", "poolId")
    }));
  }

  if (src.withdrawals?.length) {
    detail.withdrawals = src.withdrawals.map((w: any) => ({
      stakeAddressFrom: w.address,
      addressTo: [""], // TODO: Handle multiple addresses
      amount: Number.parseInt(w.amount)
    }));
  }

  if (src.stakes?.length) {
    detail.stakeCertificates = src.stakes.map((s: any) => ({
      stakeAddress: s.address,
      type: s.registration ? ("STAKE_REGISTRATION" as const) : ("STAKE_DEREGISTRATION" as const)
    }));
  }

  const poolCertificates = [
    ...(src.poolUpdates ?? []).map(mapPoolUpdate),
    ...(src.poolRetires ?? []).map(mapPoolRetire)
  ];
  if (poolCertificates.length) {
    detail.poolCertificates = poolCertificates;
  }

  if (src.mirs?.length) {
    detail.instantaneousRewards = src.mirs.map((mir: any) => ({
      amount: mir.amount,
      stakeAddress: mir.address
    }));
  }

  if (src.contracts?.length) {
    detail.contracts = src.contracts;
  }

  return detail;
}
