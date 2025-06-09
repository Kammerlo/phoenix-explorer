import dotenv from "dotenv";
import {CardanoNetwork} from "@blockfrost/blockfrost-js/lib/types";
dotenv.config();

export const ENV = {
  API_KEY: process.env.API_KEY!,
  PORT: parseInt(process.env.PORT ?? "3000", 10),
  HOST: process.env.HOST ?? "0.0.0.0",
  NETWORK: (process.env.NETWORK ?? "mainnet") as CardanoNetwork,
};
