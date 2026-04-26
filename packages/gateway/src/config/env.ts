import dotenv from "dotenv";
import path from "path";
import {CardanoNetwork} from "@blockfrost/blockfrost-js/lib/types";
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

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
