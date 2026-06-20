/**
 * ConnectorFactory — registers the connector factory with ApiConnector.
 * This file MUST be imported (as a side-effect) before any code calls
 * ApiConnector.getApiConnector(). The recommended place is index.tsx.
 */
import { _setConnectorFactory } from "./ApiConnector";
import { GatewayConnector } from "./gateway/gatewayConnector";
import { YaciConnector } from "./yaci/yaciConnector";
import { BlockfrostConnector } from "./blockfrost/blockfrostConnector";
import { OgmiosConnector } from "./ogmios/ogmiosConnector";
import { loadProviderConfig } from "src/stores/provider";
import { verifyCapabilityImplementations } from "./capabilities/verifyCapabilityImplementations";

const API_URL: string = process.env.REACT_APP_API_URL || "";
const API_CONNECTOR_TYPE: string = process.env.REACT_APP_API_TYPE || "";

_setConnectorFactory(() => {
  const config = loadProviderConfig();
  let connector;
  if (config.type === "OGMIOS") {
    connector = new OgmiosConnector(config.baseUrl, config.kupoUrl);
  } else if (config.type === "YACI") {
    connector = new YaciConnector(config.baseUrl);
  } else if (config.type === "BLOCKFROST") {
    connector = new BlockfrostConnector(config.baseUrl, config.apiKey ?? "");
  } else if (config.baseUrl) {
    connector = new GatewayConnector(config.baseUrl);
  } else if (API_CONNECTOR_TYPE === "GATEWAY" || !API_CONNECTOR_TYPE) {
    connector = new GatewayConnector(API_URL);
  } else {
    throw new Error("Invalid provider configuration");
  }
  // Dev-mode drift check: warns if declared capabilities and overrides disagree.
  if (import.meta.env.DEV) verifyCapabilityImplementations(connector);
  return connector;
});
