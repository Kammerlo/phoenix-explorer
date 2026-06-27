import { IContractItemTx, ReferenceInput } from "../dtos/transaction.dto";

/**
 * Connector-agnostic assembly of `TransactionDetail.contracts` (script / datum /
 * redeemer data) from raw transaction data.
 *
 * This is the single source of truth shared by the gateway (Blockfrost SDK,
 * snake_case fields) and the in-browser `BlockfrostConnector` (axios +
 * axios-case-converter, camelCase fields). Both feed the same normalized data in
 * and get the same `IContractItemTx[]` out — guaranteeing identical behaviour
 * across providers. The Yaci connector reuses it too.
 *
 * The caller supplies async resolvers for script CBOR and datum CBOR (keyed by
 * hash) so each environment can fetch with its own client; the assembly and the
 * canonical redeemer→input ordering live here.
 */

export const CONTRACT_PURPOSES = ["SPEND", "MINT", "CERT", "REWARD", "VOTING", "PROPOSING"] as const;
export type ContractPurpose = (typeof CONTRACT_PURPOSES)[number];

/** Normalize a Blockfrost/Yaci redeemer purpose to the explorer's canonical form. */
export function mapRedeemerPurpose(purpose: string | undefined | null): ContractPurpose {
  switch ((purpose ?? "").toLowerCase()) {
    case "spend":
      return "SPEND";
    case "mint":
      return "MINT";
    case "cert":
      return "CERT";
    case "reward":
    case "withdraw":
      return "REWARD";
    case "vote":
    case "voting":
      return "VOTING";
    case "propose":
    case "proposing":
      return "PROPOSING";
    default:
      return "SPEND";
  }
}

export interface ContractResolvers {
  /** Resolve a script's CBOR by script hash (null when unavailable / native). */
  scriptCbor: (scriptHash: string) => Promise<string | null | undefined>;
  /** Resolve a datum/redeemer-data CBOR by its hash (null when unavailable). */
  datumCbor: (dataHash: string) => Promise<string | null | undefined>;
}

export interface BuildContractsArgs {
  /** Raw redeemers (Blockfrost `tx_content_redeemers` or camelCased equivalent). */
  redeemers: unknown[];
  /** Raw tx inputs (Blockfrost `tx_content_utxo.inputs` or camelCased equivalent). */
  inputs: unknown[];
  /** Raw tx outputs (Blockfrost `tx_content_utxo.outputs` or camelCased equivalent). */
  outputs: unknown[];
  resolvers: ContractResolvers;
}

// ---- small casing-agnostic accessors -------------------------------------

function pick<T = unknown>(obj: unknown, ...keys: string[]): T | undefined {
  const o = obj as Record<string, unknown> | null | undefined;
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  const n = parseInt(String(v ?? "0"), 10);
  return Number.isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

interface NormUtxo {
  address: string;
  txHash: string;
  outputIndex: number;
  dataHash: string | null;
  inlineDatum: string | null;
  referenceScriptHash: string | null;
  collateral: boolean;
  reference: boolean;
  lovelace: number;
}

function normUtxo(u: unknown): NormUtxo {
  const amount = pick<{ unit: string; quantity: string }[]>(u, "amount", "amounts") ?? [];
  const lovelace = num(amount.find((a) => a?.unit === "lovelace")?.quantity);
  return {
    address: str(pick(u, "address")),
    txHash: str(pick(u, "tx_hash", "txHash")),
    outputIndex: num(pick(u, "output_index", "outputIndex")),
    dataHash: (pick<string>(u, "data_hash", "dataHash") as string) ?? null,
    inlineDatum: (pick<string>(u, "inline_datum", "inlineDatum") as string) ?? null,
    referenceScriptHash: (pick<string>(u, "reference_script_hash", "referenceScriptHash") as string) ?? null,
    collateral: Boolean(pick(u, "collateral")),
    reference: Boolean(pick(u, "reference")),
    lovelace,
  };
}

export async function buildContracts(args: BuildContractsArgs): Promise<IContractItemTx[]> {
  const { redeemers, inputs, outputs, resolvers } = args;
  if (!redeemers || redeemers.length === 0) return [];

  // Memoize hash-keyed resolver calls within a single transaction so the same
  // script/datum is only fetched once even when referenced by many redeemers.
  const scriptCache = new Map<string, Promise<string>>();
  const datumCache = new Map<string, Promise<string>>();
  const resolveScript = (hash: string): Promise<string> => {
    if (!hash) return Promise.resolve("");
    let p = scriptCache.get(hash);
    if (!p) {
      p = Promise.resolve()
        .then(() => resolvers.scriptCbor(hash))
        .then((v) => v ?? "")
        .catch(() => "");
      scriptCache.set(hash, p);
    }
    return p;
  };
  const resolveDatum = (hash: string): Promise<string> => {
    if (!hash) return Promise.resolve("");
    let p = datumCache.get(hash);
    if (!p) {
      p = Promise.resolve()
        .then(() => resolvers.datumCbor(hash))
        .then((v) => v ?? "")
        .catch(() => "");
      datumCache.set(hash, p);
    }
    return p;
  };

  const allInputs = inputs.map(normUtxo);
  const allOutputs = outputs.map(normUtxo);

  // Spend redeemers point at inputs by index into the ledger-canonical ordering:
  // real (non-collateral, non-reference) inputs sorted lexicographically by
  // (tx_hash, output_index). Reproduce that ordering so `tx_index` resolves.
  const spendInputs = allInputs
    .filter((i) => !i.collateral && !i.reference)
    .sort((a, b) => (a.txHash === b.txHash ? a.outputIndex - b.outputIndex : a.txHash < b.txHash ? -1 : 1));

  const scriptOutputs = allOutputs.filter((o) => o.dataHash || o.inlineDatum);

  // Reference inputs (CIP-31/33) are transaction-level; attach to every contract
  // item so the detail view can surface inline reference scripts/datums.
  const referenceInputs: ReferenceInput[] = [];
  for (const ref of allInputs.filter((i) => i.reference)) {
    const rsh = ref.referenceScriptHash ?? "";
    referenceInputs.push({
      address: ref.address,
      index: ref.outputIndex,
      script: rsh ? await resolveScript(rsh) : "",
      scriptHash: rsh,
      txHash: ref.txHash,
      value: ref.lovelace,
      datumHash: ref.dataHash ?? "",
      datum: ref.inlineDatum ?? (ref.dataHash ? await resolveDatum(ref.dataHash) : ""),
      scriptType: "",
    });
  }

  const contracts: IContractItemTx[] = [];
  for (const r of redeemers) {
    const purpose = mapRedeemerPurpose(pick<string>(r, "purpose"));
    const scriptHash = str(pick(r, "script_hash", "scriptHash"));
    const redeemerDataHash = str(pick(r, "redeemer_data_hash", "redeemerDataHash", "datum_hash", "datumHash"));

    const scriptBytes = await resolveScript(scriptHash);
    const redeemerBytes = redeemerDataHash ? await resolveDatum(redeemerDataHash) : "";

    let address = "";
    let datumHashIn = "";
    let datumBytesIn = "";
    let datumHashOut = "";
    let datumBytesOut = "";

    if (purpose === "SPEND") {
      const input = spendInputs[num(pick(r, "tx_index", "txIndex"))];
      if (input) {
        address = input.address;
        datumHashIn = input.dataHash ?? "";
        datumBytesIn = input.inlineDatum ?? (input.dataHash ? await resolveDatum(input.dataHash) : "");
        // A continuing-state output at the same script address (if any).
        const out = scriptOutputs.find((o) => o.address === input.address);
        if (out) {
          datumHashOut = out.dataHash ?? "";
          datumBytesOut = out.inlineDatum ?? (out.dataHash ? await resolveDatum(out.dataHash) : "");
        }
      }
    }

    contracts.push({
      contract: scriptHash,
      address,
      datumBytesIn,
      datumBytesOut,
      datumHashIn,
      datumHashOut,
      purpose,
      redeemerBytes,
      redeemerMem: num(pick(r, "unit_mem", "unitMem")),
      redeemerSteps: num(pick(r, "unit_steps", "unitSteps")),
      scriptBytes,
      scriptHash,
      ...(referenceInputs.length ? { referenceInputs } : {}),
    });
  }

  return contracts;
}
