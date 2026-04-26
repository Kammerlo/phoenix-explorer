import {BlockFrostAPI} from "@blockfrost/blockfrost-js";
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

function isRateLimitError(err: unknown): boolean {
  // Blockfrost SDK errors carry `status_code`; underlying got errors expose
  // `response.statusCode` / `statusCode`. Any of them == 429 means rate-limited.
  const e = err as { status_code?: number; statusCode?: number; response?: { statusCode?: number } } | null | undefined;
  if (!e) return false;
  return e.status_code === 429 || e.statusCode === 429 || e.response?.statusCode === 429;
}

function navigate(root: object | null, path: readonly string[]): object | null {
  let cur: any = root;
  for (const key of path) {
    if (cur == null) return null;
    cur = cur[key];
  }
  return cur ?? null;
}

// Wrap a BlockFrostAPI client with a Proxy that:
//   - Logs every method invocation, including nested namespaces
//     (e.g. `api.governance.drepsById(...)`).
//   - Optionally falls back to a second client on HTTP 429. When demeter rate
//     limits us, we re-dispatch the identical call against blockfrost.io.
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
          logCall(label, fullName, args);
          try {
            return await (value as (...a: unknown[]) => unknown).apply(obj, args);
          } catch (err) {
            if (fallback && isRateLimitError(err)) {
              const fbParent = navigate(fallback, path);
              const fbFn = fbParent ? (fbParent as Record<string, unknown>)[propName] : undefined;
              if (typeof fbFn === "function") {
                console.log(`[${new Date().toISOString()}] [fallback] ${label} → ${fallbackLabel} on 429: ${fullName}`);
                // The fallback target is itself a logged Proxy, so the
                // `[blockfrost] ${fullName}` line is emitted by its own wrapper.
                return await (fbFn as (...a: unknown[]) => unknown).apply(fbParent, args);
              }
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

const blockfrostRaw: BlockFrostAPI | null = isBlockfrostConfigured
  ? new BlockFrostAPI({
      projectId: ENV.API_KEY!,
      network: ENV.NETWORK,
    })
  : null;

// demeter.run exposes a Blockfrost-compatible endpoint but authenticates with a
// `dmtr-api-key` header instead of `project_id`. The SDK lets us override the
// outgoing headers via `gotOptions` (which spreads after the SDK's defaults).
const demeterRaw: BlockFrostAPI | null = isDemeterConfigured
  ? new BlockFrostAPI({
      customBackend: ENV.DEMETER_URL!,
      network: ENV.NETWORK,
      gotOptions: {
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
const fallbackNote = isDemeterConfigured && isBlockfrostConfigured ? " (429 → blockfrost)" : "";
console.log(`[gateway] Blockfrost provider: ${isBlockfrostConfigured ? `configured (network=${ENV.NETWORK})` : "not configured"}`);
console.log(`[gateway] Demeter provider:    ${isDemeterConfigured ? `configured (URL=${ENV.DEMETER_URL})` : "not configured"}`);
console.log(`[gateway] Primary client (all endpoints except /api/pools/*): ${primaryLabel}${fallbackNote}`);
console.log(`[gateway] Pool endpoints (/api/pools/*): ${isBlockfrostConfigured ? "blockfrost" : "unsupported (returns HTTP 501)"}`);
