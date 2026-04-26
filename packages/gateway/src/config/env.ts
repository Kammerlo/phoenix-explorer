import dotenv from "dotenv";
import path from "path";
import {CardanoNetwork} from "@blockfrost/blockfrost-js/lib/types";

// Load .env from the monorepo root. In Docker the file usually doesn't exist
// (env is supplied via the compose `environment:` block), so a missing file is
// not fatal — we still log what happened so misconfiguration is obvious.
const envPath = path.resolve(__dirname, "../../../../.env");
const dotenvResult = dotenv.config({ path: envPath });
if (dotenvResult.error) {
  console.log(`[gateway] dotenv: no .env at ${envPath} (${(dotenvResult.error as NodeJS.ErrnoException).code ?? "error"}) — relying on process env`);
} else {
  const keys = Object.keys(dotenvResult.parsed ?? {});
  console.log(`[gateway] dotenv: loaded ${envPath} (${keys.length} keys: ${keys.join(", ")})`);
}

export const ENV = {
  // Classic Blockfrost project key (https://blockfrost.io). Optional when DEMETER_*
  // is configured, but required for `/api/pools/*` (demeter does not implement
  // the pool endpoints).
  API_KEY: process.env.API_KEY,
  // demeter.run hosted Blockfrost extension. Both must be set together.
  // Example URL: https://cardano-mainnet.blockfrost.m1.demeter.run/api/v0
  DEMETER_URL: process.env.DEMETER_URL,
  DEMETER_API_KEY: process.env.DEMETER_API_KEY,
  PORT: parseInt(process.env.PORT ?? "3000", 10),
  HOST: process.env.HOST ?? "0.0.0.0",
  NETWORK: (process.env.NETWORK ?? "mainnet") as CardanoNetwork,
};

// One-line dump of how each provider env var resolved, with secrets masked, so
// the operator can immediately see whether the keys made it into the process.
const mask = (v: string | undefined) =>
  !v ? "(unset)" : v.length <= 6 ? "***" : `${v.slice(0, 4)}…${v.slice(-2)} (len ${v.length})`;
console.log(
  `[gateway] env resolved: API_KEY=${mask(ENV.API_KEY)} ` +
  `DEMETER_URL=${ENV.DEMETER_URL || "(unset)"} ` +
  `DEMETER_API_KEY=${mask(ENV.DEMETER_API_KEY)} ` +
  `NETWORK=${ENV.NETWORK}`
);
