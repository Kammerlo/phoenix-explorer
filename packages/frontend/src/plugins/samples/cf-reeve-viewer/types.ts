// ---------------------------------------------------------------------------
// Reeve on-chain metadata (label 1447) — type definitions
// Mirrors https://github.com/cardano-foundation/cf-reeve-platform/blob/main/docs/onChainFormat.md
// Amount-bearing fields are string|number because the production format encodes
// them as strings ("30760.41") while some producers emit raw numbers.
// ---------------------------------------------------------------------------

export interface ReeveOrg {
  id?: string;
  name?: string;
  currency_id?: string;
  country_code?: string;
  tax_id_number?: string;
}

export interface ReeveMetadata {
  creation_slot?: number;
  timestamp?: string;
  version?: string;
}

export interface ReeveCurrency {
  id?: string;
  cust_code?: string;
}

export interface ReeveDocument {
  type?: string;
  number?: string;
  date?: string;
  currency?: ReeveCurrency;
  vat?: { cust_code?: string; rate?: string | number };
  counterparty?: { cust_code?: string; type?: string };
}

export interface ReeveNamedCode {
  name?: string;
  cust_code?: string;
  code?: string;
}

export interface ReeveItemEvent {
  code?: string;
  name?: string;
}

export interface ReeveTransactionItem {
  id?: string;
  amount?: string | number;
  fx_rate?: string | number;
  document?: ReeveDocument;
  event?: ReeveItemEvent;
  project?: string | ReeveNamedCode;
  cost_center?: string | ReeveNamedCode;
}

export interface ReeveTransaction {
  id?: string;
  number?: string;
  batch_id?: string;
  type?: string;
  date?: string;
  accounting_period?: string;
  items?: ReeveTransactionItem[];
}

/** Arbitrary, possibly-nested report payload. Leaves may be `{ v, _o }` wrappers,
 *  bare primitives, or further nested objects. */
export type ReeveReportData = Record<string, unknown>;

export interface ReeveRoot {
  org?: ReeveOrg;
  metadata?: ReeveMetadata;
  type?: string;
  data?: ReeveTransaction[] | ReeveReportData | string;
  // REPORT-only top-level fields
  interval?: string;
  year?: number | string;
  period?: number | string;
  subtype?: string;
  ver?: number | string;
}
