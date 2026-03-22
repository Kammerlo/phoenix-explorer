import { createSlice, PayloadAction, Store } from "@reduxjs/toolkit";

export type ProviderType = "GATEWAY" | "YACI" | "BLOCKFROST";

export interface ProviderConfig {
  type: ProviderType;
  baseUrl: string;
  apiKey?: string;
  network: string;
}

export interface ProviderState {
  config: ProviderConfig;
}

const STORAGE_KEY = "phoenix_provider_config";

function getDefaultConfig(): ProviderConfig {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* ignore */ }
  }
  return {
    type: (process.env.REACT_APP_API_TYPE as ProviderType) || "GATEWAY",
    baseUrl: process.env.REACT_APP_API_URL || "",
    apiKey: process.env.REACT_APP_BLOCKFROST_API_KEY,
    network: process.env.REACT_APP_NETWORK || "mainnet"
  };
}

export function saveProviderConfig(config: ProviderConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function loadProviderConfig(): ProviderConfig {
  return getDefaultConfig();
}

let providerStore: Store | undefined;

export const setStoreProvider = (store: Store) => {
  providerStore = store;
};

const slice = createSlice({
  name: "provider",
  initialState: { config: getDefaultConfig() } as ProviderState,
  reducers: {
    setProviderConfig: (state, action: PayloadAction<ProviderConfig>) => ({
      config: action.payload
    })
  }
});

export const setProviderConfig = (config: ProviderConfig) => {
  saveProviderConfig(config);
  providerStore?.dispatch(slice.actions.setProviderConfig(config));
};

export default slice.reducer;
