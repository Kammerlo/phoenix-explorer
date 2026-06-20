import { ReeveReportData, ReeveRoot } from "./types";

const REEVE_LABEL = 1447;

// ---------------------------------------------------------------------------
// Metadata extraction
// ---------------------------------------------------------------------------

interface RawMetadataEntry {
  label: number | string;
  value: unknown;
}

/**
 * Pull the Reeve root object out of a transaction's metadata array (the
 * `[{ label, value }]` shape used across the explorer). `value` may be a JSON
 * string or an already-parsed object, and the payload may be wrapped under a
 * "1447" key or be the root itself. Returns null when absent or malformed.
 */
export function parseReeveMetadata(rawMetadata: unknown): ReeveRoot | null {
  if (!Array.isArray(rawMetadata)) return null;

  const entry = (rawMetadata as RawMetadataEntry[]).find(
    (m) => Number(m?.label) === REEVE_LABEL
  );
  if (!entry) return null;

  let parsed: unknown = entry.value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;

  const wrapper = parsed as Record<string, unknown>;
  const root = (wrapper[REEVE_LABEL] ?? wrapper[String(REEVE_LABEL)] ?? wrapper) as unknown;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    return root as ReeveRoot;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Report normalization
// ---------------------------------------------------------------------------

export interface ReportLeaf {
  kind: "value";
  key: string;
  label: string;
  order: number;
  /** Numeric value when parseable, otherwise null (then `text` carries the raw). */
  value: number | null;
  text?: string;
}

export interface ReportCategory {
  kind: "category";
  key: string;
  label: string;
  order: number;
  children: ReportNode[];
  /** Explicit on-chain branch total if present, otherwise the sum of descendant
   *  numeric leaves (derived). */
  subtotal: number;
  /** True when the branch (or a descendant) carries any numeric value, so a
   *  purely-structural branch can avoid rendering a misleading "0.00". */
  hasValue: boolean;
}

export type ReportNode = ReportLeaf | ReportCategory;

const ORDER_KEY = "_o";
const VALUE_KEY = "v";
// Untagged siblings sort after any explicitly `_o`-ordered ones (1-based on-chain),
// so the index fallback never collides with the `_o` namespace.
const ORDER_OFFSET = 1_000_000;

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function toNumber(x: unknown): number | null {
  if (typeof x === "number") return Number.isFinite(x) ? x : null;
  if (typeof x === "string" && x.trim() !== "") {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Keys of an object excluding the `_o` ordering hint. */
function dataKeys(obj: Record<string, unknown>): string[] {
  return Object.keys(obj).filter((k) => k !== ORDER_KEY);
}

/** An object that is purely a value leaf: a `v` and nothing but `_o` besides. */
export function isReeveLeafObject(raw: unknown): raw is Record<string, unknown> {
  if (!isPlainObject(raw)) return false;
  const keys = dataKeys(raw);
  return keys.length === 1 && keys[0] === VALUE_KEY;
}

export function reeveLeafValue(raw: Record<string, unknown>): unknown {
  return raw[VALUE_KEY];
}

/** "non-current_assets" -> "Non-current assets" (underscores → spaces, sentence case). */
function humanizeKey(key: string): string {
  const spaced = key.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function orderOf(raw: unknown, index: number, siblingHasOrder: boolean): number {
  if (isPlainObject(raw) && raw[ORDER_KEY] !== undefined) {
    const n = Number(raw[ORDER_KEY]);
    if (Number.isFinite(n)) return n;
  }
  return siblingHasOrder ? ORDER_OFFSET + index : index;
}

function leafText(rawValue: unknown): string {
  return isPlainObject(rawValue) || Array.isArray(rawValue) ? JSON.stringify(rawValue) : String(rawValue);
}

function makeLeaf(key: string, label: string, order: number, rawValue: unknown): ReportLeaf {
  const value = toNumber(rawValue);
  return value !== null
    ? { kind: "value", key, label, order, value }
    : { kind: "value", key, label, order, value: null, text: leafText(rawValue) };
}

/** Ordered [key, value] entries of an object: `_o` stripped, sorted by `_o`. */
export function reeveOrderedEntries(obj: Record<string, unknown>): [string, unknown][] {
  const keys = dataKeys(obj);
  const siblingHasOrder = keys.some((k) => isPlainObject(obj[k]) && obj[k][ORDER_KEY] !== undefined);
  return keys
    .map((k, i) => ({ k, raw: obj[k], order: orderOf(obj[k], i, siblingHasOrder) }))
    .sort((a, b) => a.order - b.order)
    .map(({ k, raw }) => [k, raw] as [string, unknown]);
}

function buildNode(key: string, raw: unknown, index: number, siblingHasOrder: boolean): ReportNode {
  const order = orderOf(raw, index, siblingHasOrder);
  const label = humanizeKey(key);

  // Bare primitive (published plain form), or an object that is purely `{ v, _o }`.
  if (!isPlainObject(raw)) return makeLeaf(key, label, order, raw);
  if (isReeveLeafObject(raw)) return makeLeaf(key, label, order, raw[VALUE_KEY]);

  // Category: recurse into children, excluding `_o` and the branch's own total `v`.
  const childData: Record<string, unknown> = {};
  for (const k of dataKeys(raw)) {
    if (k !== VALUE_KEY) childData[k] = raw[k];
  }
  const children = normalizeReport(childData);

  const computed = children.reduce(
    (sum, child) => sum + (child.kind === "value" ? child.value ?? 0 : child.subtotal),
    0
  );
  const explicit = VALUE_KEY in raw ? toNumber(raw[VALUE_KEY]) : null;
  const hasValue =
    explicit !== null ||
    children.some((c) => (c.kind === "value" ? c.value !== null : c.hasValue));

  return {
    kind: "category",
    key,
    label,
    order,
    children,
    subtotal: explicit !== null ? explicit : computed,
    hasValue
  };
}

/**
 * Turn a report `data` object into an ordered tree of categories and value leaves.
 * Handles both the production `{ v, _o }` encoding (including branches that carry
 * their own roll-up `v`) and the published plain form (`{ "cash": "1000" }`).
 * Siblings are ordered by `_o` when present, else by original key order.
 * Returns [] for non-object input.
 */
export function normalizeReport(data: unknown): ReportNode[] {
  if (!isPlainObject(data)) return [];

  const keys = dataKeys(data);
  const siblingHasOrder = keys.some((k) => isPlainObject(data[k]) && data[k][ORDER_KEY] !== undefined);
  const nodes = keys.map((key, index) =>
    buildNode(key, (data as ReeveReportData)[key], index, siblingHasOrder)
  );

  return nodes.sort((a, b) => a.order - b.order);
}
