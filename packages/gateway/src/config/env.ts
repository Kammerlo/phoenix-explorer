import dotenv from "dotenv";
import path from "path";
import {CardanoNetwork} from "@blockfrost/blockfrost-js/lib/types";
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

export const ENV = {
  API_KEY: process.env.API_KEY!,
  PORT: parseInt(process.env.PORT ?? "3000", 10),
  HOST: process.env.HOST ?? "0.0.0.0",
  NETWORK: (process.env.NETWORK ?? "mainnet") as CardanoNetwork,
};
