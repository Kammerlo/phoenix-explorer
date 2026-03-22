import React from "react";
import { ApiConnector } from "src/commons/connector/ApiConnector";

export type PluginSlotName =
  | "transaction-detail"
  | "address-detail"
  | "token-detail"
  | "block-detail"
  | "governance-detail"
  | "drep-detail"
  | "pool-detail"
  | "home-dashboard"
  | "global-sidebar";

export interface PluginSlot {
  slot: PluginSlotName;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  slots: PluginSlot[];
  /** Optional: metadata labels this plugin can decode (e.g., 721 = CIP-25, 20 = CIP-20) */
  metadataLabels?: number[];
}

export interface PluginContext {
  /** The entity data for the current page (transaction, address, etc.) */
  data: unknown;
  /** The current network (mainnet, preprod, preview) */
  network: string;
  /** API connector for fetching additional data */
  apiConnector: ApiConnector;
}

export interface PhoenixPlugin {
  manifest: PluginManifest;
  /** React component to render */
  Component: React.ComponentType<{ context: PluginContext }>;
  /** Optional: called once when plugin is loaded */
  onLoad?: () => Promise<void>;
  /** Optional: called when plugin is unloaded */
  onUnload?: () => void;
}
