import {BlockFrostAPI} from "@blockfrost/blockfrost-js";
import {ENV} from "./env";

export const API = new BlockFrostAPI({
  projectId: ENV.API_KEY,
  network: ENV.NETWORK
})
