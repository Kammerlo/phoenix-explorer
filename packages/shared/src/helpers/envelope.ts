import { ApiReturnType } from "../APIReturnType";

export type EnvelopeExtras = Pick<
  ApiReturnType<unknown>,
  "total" | "totalPage" | "currentPage" | "pageSize"
>;

export function envelope<T>(data: T, extras: EnvelopeExtras = {}): ApiReturnType<T> {
  return { data, lastUpdated: Date.now(), ...extras };
}

export function errorEnvelope<T>(
  err: unknown,
  fallback: T | null = null,
  extras: EnvelopeExtras = {}
): ApiReturnType<T> {
  const error = err instanceof Error ? err.message : String(err ?? "unknown error");
  return { data: fallback, error, lastUpdated: Date.now(), ...extras };
}

export function unsupportedEnvelope<T>(
  method: string,
  fallback: T | null = null
): ApiReturnType<T> {
  return {
    data: fallback,
    error: `Not supported by current provider: ${method}`,
    lastUpdated: Date.now()
  };
}
