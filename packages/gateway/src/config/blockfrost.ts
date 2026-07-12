import {BlockFrostAPI} from "@blockfrost/blockfrost-js";
import http from "node:http";
import https from "node:https";
import {ENV} from "./env";

const isBlockfrostConfigured = !!ENV.API_KEY;
const isDemeterConfigured = !!(ENV.DEMETER_URL && ENV.DEMETER_API_KEY);

if (!isBlockfrostConfigured && !isDemeterConfigured) {
  throw new Error(
    "No Blockfrost provider configured. Set API_KEY (blockfrost.io) and/or " +
    "DEMETER_URL + DEMETER_API_KEY (demeter.run)."
  );
}

function formatArgs(args: readonly unknown[]): string {
  if (!args.length) return "";
  return " " + args.map(a => {
    if (typeof a === "string") return JSON.stringify(a);
    if (a && typeof a === "object") {
      try { return JSON.stringify(a); } catch { return "[object]"; }
    }
    return String(a);
  }).join(", ");
}

function logCall(label: string, fullName: string, args: readonly unknown[]) {
  console.log(`[${new Date().toISOString()}] [${label}] ${fullName}${formatArgs(args)}`);
}

function describeError(err: unknown): string {
  // The SDK's `ErrorType` has two shapes — one with `status_code` + `message`,
  // one with just `code` + `message`. Try every field so the fallback log line
  // is still informative regardless of which variant was thrown.
  const e = err as {
    status_code?: number;
    statusCode?: number;
    response?: { statusCode?: number };
    code?: string;
    message?: string;
  } | null | undefined;
  if (!e) return "unknown error";
  const status = e.status_code ?? e.statusCode ?? e.response?.statusCode;
  if (status) return String(status);
  if (e.code) return e.code;
  if (e.message) return e.message.split("\n")[0].slice(0, 80);
  return "unknown error";
}

function navigate(root: object | null, path: readonly string[]): object | null {
  let cur: any = root;
  for (const key of path) {
    if (cur == null) return null;
    cur = cur[key];
  }
  return cur ?? null;
}

// Per-method circuit breaker for the primary (demeter) client. Once a method
// fails BREAKER_THRESHOLD times in a row, calls to it go straight to the
// fallback for BREAKER_OPEN_MS instead of paying the primary's timeout again
// on every request. Half-opens automatically (the next call after the window
// tries the primary once). Purely a latency device — the data always comes
// from one of the two identical providers.
const BREAKER_THRESHOLD = 2;
const BREAKER_OPEN_MS = 5 * 60 * 1000;
const breaker = new Map<string, { fails: number; openUntil: number }>();

function breakerIsOpen(method: string): boolean {
  const state = breaker.get(method);
  return !!state && state.fails >= BREAKER_THRESHOLD && Date.now() < state.openUntil;
}

function breakerRecord(method: string, ok: boolean) {
  if (ok) {
    breaker.delete(method);
    return;
  }
  const state = breaker.get(method) ?? { fails: 0, openUntil: 0 };
  state.fails += 1;
  if (state.fails >= BREAKER_THRESHOLD) state.openUntil = Date.now() + BREAKER_OPEN_MS;
  breaker.set(method, state);
}

// Wrap a BlockFrostAPI client with a Proxy that:
//   - Logs every method invocation, including nested namespaces
//     (e.g. `api.governance.drepsById(...)`).
//   - Optionally falls back to a second client on any error. When demeter rate
//     limits or times out, we re-dispatch the identical call against
//     blockfrost.io — and open the per-method breaker so repeat offenders skip
//     the doomed primary attempt entirely.
// Internal SDK calls made via `this.xxx()` aren't double-logged because we
// invoke the original method with `this === target`, not the proxy.
function wrapClient<T extends object>(
  target: T,
  label: string,
  fallback: object | null,
  fallbackLabel: string,
  path: readonly string[] = []
): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (typeof prop === "symbol") return value;
      if (typeof value === "function") {
        const propName = String(prop);
        return async (...args: unknown[]) => {
          const fullName = [...path, propName].join(".");
          const fallbackFn = (): ((...a: unknown[]) => unknown) | null => {
            if (!fallback) return null;
            const fbParent = navigate(fallback, path);
            const fbFn = fbParent ? (fbParent as Record<string, unknown>)[propName] : undefined;
            return typeof fbFn === "function"
              ? (...a: unknown[]) => (fbFn as (...x: unknown[]) => unknown).apply(fbParent, a)
              : null;
          };

          // Breaker open → skip the doomed primary attempt entirely.
          if (fallback && breakerIsOpen(fullName)) {
            const fb = fallbackFn();
            if (fb) {
              console.log(`[${new Date().toISOString()}] [breaker] ${label} open for ${fullName} → ${fallbackLabel}`);
              return await fb(...args);
            }
          }

          logCall(label, fullName, args);
          try {
            const result = await (value as (...a: unknown[]) => unknown).apply(obj, args);
            if (fallback) breakerRecord(fullName, true);
            return result;
          } catch (err) {
            if (fallback) breakerRecord(fullName, false);
            const fb = fallbackFn();
            if (fb) {
              console.log(`[${new Date().toISOString()}] [fallback] ${label} → ${fallbackLabel} on ${describeError(err)}: ${fullName}`);
              // The fallback target is itself a logged Proxy, so the
              // `[blockfrost] ${fullName}` line is emitted by its own wrapper.
              return await fb(...args);
            }
            throw err;
          }
        };
      }
      if (value && typeof value === "object") {
        return wrapClient(value, label, fallback, fallbackLabel, [...path, String(prop)]);
      }
      return value;
    }
  });
}

// Keep-alive agents shared by both clients: without them every upstream call
// pays a fresh TCP+TLS handshake, which dominates latency on endpoints that
// fan out into dozens of calls.
const keepAliveHttp = new http.Agent({ keepAlive: true, maxSockets: 64 });
const keepAliveHttps = new https.Agent({ keepAlive: true, maxSockets: 64 });
const keepAliveAgents = { http: keepAliveHttp, https: keepAliveHttps };

const blockfrostRaw: BlockFrostAPI | null = isBlockfrostConfigured
  ? new BlockFrostAPI({
      projectId: ENV.API_KEY!,
      network: ENV.NETWORK,
      gotOptions: {
        agent: keepAliveAgents,
      },
    })
  : null;

// demeter.run exposes a Blockfrost-compatible endpoint but authenticates with a
// `dmtr-api-key` header instead of `project_id`. The SDK lets us override the
// outgoing headers via `gotOptions` (which spreads after the SDK's defaults).
//
// Fast-fail settings: demeter has a healthy blockfrost.io fallback standing by,
// so there is no reason to retry it or to wait the SDK's default 20s timeout —
// measured, a degraded demeter endpoint cost 60–85s per call (20s timeout × got
// retries + backoff) before the fallback answered in milliseconds. 4s with no
// retries caps the worst case per call at 4s, and the circuit breaker removes
// even that for repeat offenders.
const demeterRaw: BlockFrostAPI | null = isDemeterConfigured
  ? new BlockFrostAPI({
      customBackend: ENV.DEMETER_URL!,
      network: ENV.NETWORK,
      requestTimeout: 4000,
      gotOptions: {
        retry: 0,
        agent: keepAliveAgents,
        headers: {
          "dmtr-api-key": ENV.DEMETER_API_KEY!,
          "User-Agent": "phoenix-explorer-gateway",
        },
      },
    })
  : null;

// Blockfrost is wrapped first (logging only — no fallback target) so it can be
// passed in as demeter's fallback. The shared logging Proxy means a fallback
// call still emits the `[blockfrost] …` log line, no manual plumbing required.
const blockfrostAPI: BlockFrostAPI | null = blockfrostRaw
  ? wrapClient(blockfrostRaw, "blockfrost", null, "")
  : null;

const demeterAPI: BlockFrostAPI | null = demeterRaw
  ? wrapClient(demeterRaw, "demeter", blockfrostAPI, "blockfrost")
  : null;

// Primary client used by every controller except the pool routes. Demeter is
// preferred when configured because it tends to have higher rate limits; on
// 429 from demeter we transparently retry the same call against blockfrost.
export const API: BlockFrostAPI = (demeterAPI ?? blockfrostAPI)!;

// Demeter does not implement `/pools/*`, so pool routes go straight to
// blockfrost.io. `null` when only demeter is configured — the pool router
// detects that and serves an unsupported response.
export const POOL_API: BlockFrostAPI | null = blockfrostAPI;

export const IS_BLOCKFROST_AVAILABLE = isBlockfrostConfigured;
export const IS_DEMETER_ACTIVE = isDemeterConfigured;

// One-shot startup banner so the operator can see which providers are loaded
// and how routing is wired without having to wait for a request.
const primaryLabel = isDemeterConfigured ? "demeter" : "blockfrost";
const fallbackNote = isDemeterConfigured && isBlockfrostConfigured ? " (any error → blockfrost)" : "";
console.log(`[gateway] Blockfrost provider: ${isBlockfrostConfigured ? `configured (network=${ENV.NETWORK})` : "not configured"}`);
console.log(`[gateway] Demeter provider:    ${isDemeterConfigured ? `configured (URL=${ENV.DEMETER_URL})` : "not configured"}`);
console.log(`[gateway] Primary client (all endpoints except /api/pools/*): ${primaryLabel}${fallbackNote}`);
console.log(`[gateway] Pool endpoints (/api/pools/*): ${isBlockfrostConfigured ? "blockfrost" : "unsupported (returns HTTP 501)"}`);
