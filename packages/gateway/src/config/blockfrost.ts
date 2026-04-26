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

const blockfrostAPI: BlockFrostAPI | null = isBlockfrostConfigured
  ? new BlockFrostAPI({
      projectId: ENV.API_KEY!,
      network: ENV.NETWORK,
    })
  : null;

// demeter.run exposes a Blockfrost-compatible endpoint but authenticates with a
// `dmtr-api-key` header instead of `project_id`. The SDK lets us override the
// outgoing headers via `gotOptions` (which spreads after the SDK's defaults).
const demeterAPI: BlockFrostAPI | null = isDemeterConfigured
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

// Primary client used by every controller except the pool routes. Demeter is
// preferred when configured because it tends to have higher rate limits.
export const API: BlockFrostAPI = (demeterAPI ?? blockfrostAPI)!;

// Demeter does not implement `/pools/*`, so pool routes go straight to
// blockfrost.io. `null` when only demeter is configured — the pool router
// detects that and serves an unsupported response.
export const POOL_API: BlockFrostAPI | null = blockfrostAPI;

export const IS_BLOCKFROST_AVAILABLE = isBlockfrostConfigured;
export const IS_DEMETER_ACTIVE = isDemeterConfigured;
