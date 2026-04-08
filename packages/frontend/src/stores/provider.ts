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

const COOKIE_NAME = "phoenix_provider";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

function getDefaultConfig(): ProviderConfig {
  const envDefaults: ProviderConfig = {
    type: (process.env.REACT_APP_API_TYPE as ProviderType) || "GATEWAY",
    baseUrl: process.env.REACT_APP_API_URL || "",
    apiKey: process.env.REACT_APP_BLOCKFROST_API_KEY,
    network: process.env.REACT_APP_NETWORK || "mainnet"
  };

  // Read from cookie first
  const cookieValue = getCookie(COOKIE_NAME);
  if (cookieValue) {
    try { return JSON.parse(cookieValue); } catch { /* ignore malformed cookie */ }
  }

  // Migrate from old localStorage keys (one-time)
  const oldKey = localStorage.getItem("phoenix_provider_config");
  if (oldKey) {
    try {
      const parsed = JSON.parse(oldKey);
      setCookie(COOKIE_NAME, oldKey);
      localStorage.removeItem("phoenix_provider_config");
      return parsed;
    } catch { /* ignore */ }
  }

  return envDefaults;
}

export function saveProviderConfig(config: ProviderConfig): void {
  setCookie(COOKIE_NAME, JSON.stringify(config));
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
