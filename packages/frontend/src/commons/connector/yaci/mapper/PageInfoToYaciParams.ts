import { ParsedUrlQuery } from "querystring";

/** Take the first scalar out of a ParsedUrlQuery value (string | string[] | number | undefined). */
function firstScalar(v: unknown): string | undefined {
  const raw = Array.isArray(v) ? v[0] : v;
  if (raw === undefined || raw === null || raw === "") return undefined;
  return String(raw);
}

/**
 * Translate the frontend's pageInfo keys to yaci-store query params:
 *
 *   page → page   (passed through — /blocks, /txs, /addresses/…/transactions are
 *                  1-based and clamp page 0 server-side; verified live on 0.10.6)
 *   size → count  (yaci-store ignores `size` and silently falls back to 10)
 *   sort → order  (yaci-store expects a bare direction "asc" | "desc"; the
 *                  frontend emits "field,DIRECTION" — only the direction survives)
 *
 * Any other keys pass through untouched. Note: /assets/{unit}/addresses is
 * 0-based (unlike the endpoints above) — callers of that endpoint must convert
 * the page index themselves instead of using this helper's `page` passthrough.
 */
export function toYaciPageParams(pageInfo: ParsedUrlQuery = {}): Record<string, string | number> {
  const { page, size, sort, ...rest } = (pageInfo ?? {}) as Record<string, unknown>;
  const params: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(rest)) {
    const scalar = firstScalar(value);
    if (scalar !== undefined) params[key] = scalar;
  }

  const pageScalar = firstScalar(page);
  if (pageScalar !== undefined && !Number.isNaN(Number(pageScalar))) params.page = Number(pageScalar);

  const sizeScalar = firstScalar(size);
  if (sizeScalar !== undefined && Number(sizeScalar) > 0) params.count = Number(sizeScalar);

  const direction = (firstScalar(sort) ?? "").split(",").pop()?.trim().toLowerCase();
  if (direction === "asc" || direction === "desc") params.order = direction;

  return params;
}
