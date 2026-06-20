import BigNumber from "bignumber.js";

const DASH = "—";

// Matches a standards prefix segment such as "ISO_4217" or "ISO_24165".
const ISO_PREFIX = /^ISO[_-]?\d+$/i;

/**
 * Reduce a currency / token identifier to its symbolic display code.
 *
 *   "ISO_4217:CHF"             -> "CHF"
 *   "ISO_24165:ADA:HWGL1C2CK"  -> "ADA"   (prefix, code, on-chain id)
 *   "CHF"                       -> "CHF"
 */
export function cleanCurrencyCode(raw?: string | null): string {
  if (!raw) return "";
  const segments = String(raw).trim().split(":");
  if (segments.length > 1 && ISO_PREFIX.test(segments[0])) {
    return segments[1];
  }
  return segments[0];
}

/**
 * Format a monetary amount in the report's functional currency (NOT ADA/lovelace)
 * with thousands separators and a fixed number of decimals. BigNumber keeps large
 * values precise. Non-numeric input renders as a dash.
 */
export function formatReportAmount(value: number | string, decimals = 2): string {
  if (value === "" || value === null || value === undefined) return DASH;
  const bn = new BigNumber(value);
  if (!bn.isFinite()) return DASH;
  return bn.toFormat(decimals);
}

/**
 * Render an FX rate for display. Accepts both a plain rate ("0.10388169") and the
 * spec's "<from>:<to>=<rate>" form ("ISO_4217:EUR:ISO_4217:CHF=0.9345"), which is
 * turned into "EUR → CHF · 0.9345". Bare codes ("EUR:CHF=0.9345") work too.
 */
export function formatFxRate(raw?: string | number | null): string {
  if (raw === "" || raw === null || raw === undefined) return DASH;
  const s = String(raw).trim();
  if (!s) return DASH;
  if (!s.includes("=")) return s;

  const [left, rate] = s.split("=");
  const segments = left.split(":");
  const currencies: string[] = [];
  for (let i = 0; i < segments.length; ) {
    if (ISO_PREFIX.test(segments[i]) && i + 1 < segments.length) {
      currencies.push(segments[i + 1]);
      i += 2;
    } else {
      currencies.push(segments[i]);
      i += 1;
    }
  }
  if (currencies.length >= 2) {
    return `${currencies[0]} → ${currencies[1]} · ${rate}`;
  }
  return s;
}
