/**
 * ConnectorFactory — registers the connector factory with ApiConnector.
 * This file MUST be imported (as a side-effect) before any code calls
 * ApiConnector.getApiConnector(). The recommended place is index.tsx.
 */
import { _setConnectorFactory } from "./ApiConnector";
import { GatewayConnector } from "./gateway/gatewayConnector";
import { YaciConnector } from "./yaci/yaciConnector";
import { BlockfrostConnector } from "./blockfrost/blockfrostConnector";
import { loadProviderConfig } from "src/stores/provider";

const API_URL: string = process.env.REACT_APP_API_URL || "";
const API_CONNECTOR_TYPE: string = process.env.REACT_APP_API_TYPE || "";

_setConnectorFactory(() => {
  const config = loadProviderConfig();
  if (config.type === "YACI") {
    return new YaciConnector(config.baseUrl);
  }
  if (config.type === "BLOCKFROST") {
    return new BlockfrostConnector(config.baseUrl, config.apiKey ?? "");
  }
  // Default: GATEWAY
  if (config.baseUrl) {
    return new GatewayConnector(config.baseUrl);
  }
  if (API_CONNECTOR_TYPE === "GATEWAY" || !API_CONNECTOR_TYPE) {
    return new GatewayConnector(API_URL);
  }
  throw new Error("Invalid provider configuration");
});
