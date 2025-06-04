"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API = void 0;
const blockfrost_js_1 = require("@blockfrost/blockfrost-js");
const env_1 = require("./env");
exports.API = new blockfrost_js_1.BlockFrostAPI({
    projectId: env_1.ENV.API_KEY,
    network: env_1.ENV.NETWORK
});
