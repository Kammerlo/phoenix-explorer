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

// Wrap a BlockFrostAPI client with a Proxy that logs every method invocation,
// including nested namespaces like `api.governance.drepsById(...)`. The wrapper
// invokes the underlying method with `this === target`, so internal calls the
// SDK makes via `this.xxx()` are not double-logged.
function withApiLogger<T extends object>(target: T, label: string, path: readonly string[] = []): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (typeof prop === "symbol") return value;
      if (typeof value === "function") {
        return (...args: unknown[]) => {
          const fullName = [...path, String(prop)].join(".");
          const argSummary = args.length
            ? " " + args.map(a => {
                if (typeof a === "string") return JSON.stringify(a);
                if (a && typeof a === "object") {
                  try { return JSON.stringify(a); } catch { return "[object]"; }
                }
                return String(a);
              }).join(", ")
            : "";
          console.log(`[${new Date().toISOString()}] [${label}] ${fullName}${argSummary}`);
          return (value as (...a: unknown[]) => unknown).apply(obj, args);
        };
      }
      if (value && typeof value === "object") {
        return withApiLogger(value, label, [...path, String(prop)]);
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

const blockfrostAPI: BlockFrostAPI | null = blockfrostRaw
  ? withApiLogger(blockfrostRaw, "blockfrost")
  : null;

const demeterAPI: BlockFrostAPI | null = demeterRaw
  ? withApiLogger(demeterRaw, "demeter")
  : null;

// Primary client used by every controller except the pool routes. Demeter is
// preferred when configured because it tends to have higher rate limits.
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
console.log(`[gateway] Blockfrost provider: ${isBlockfrostConfigured ? `configured (network=${ENV.NETWORK})` : "not configured"}`);
console.log(`[gateway] Demeter provider:    ${isDemeterConfigured ? `configured (URL=${ENV.DEMETER_URL})` : "not configured"}`);
console.log(`[gateway] Primary client (all endpoints except /api/pools/*): ${primaryLabel}`);
console.log(`[gateway] Pool endpoints (/api/pools/*): ${isBlockfrostConfigured ? "blockfrost" : "unsupported (returns HTTP 501)"}`);
