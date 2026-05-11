// packages/frontend/src/commons/connector/capabilities/useCapability.test.tsx
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore, createSlice } from "@reduxjs/toolkit";

import { useCapability } from "./useCapability";
import { ApiConnector, _setConnectorFactory } from "../ApiConnector";

const makeConnector = (caps: string[]) => {
  class C extends (ApiConnector as any) {
    constructor() { super(""); }
    getCapabilities() { return new Set(caps); }
  }
  // fill in dummy abstract methods via a Proxy
  return new Proxy(new C(), {
    get(target, prop) {
      if (prop in target) return (target as any)[prop];
      return () => Promise.resolve({});
    }
  }) as ApiConnector;
};

const providerSlice = createSlice({
  name: "provider",
  initialState: { config: { type: "GATEWAY", baseUrl: "", network: "mainnet" } },
  reducers: {
    set: (s, a: { payload: any }) => ({ config: a.payload })
  }
});

function makeStore() {
  return configureStore({ reducer: { provider: providerSlice.reducer } });
}

function Probe({ cap }: { cap: any }) {
  const ok = useCapability(cap);
  return <div>{ok ? "YES" : "NO"}</div>;
}

describe("useCapability", () => {
  it("returns true when the active connector supports the capability", () => {
    _setConnectorFactory(() => makeConnector(["getBlocksPage"]));
    const store = makeStore();
    render(<Provider store={store}><Probe cap="getBlocksPage" /></Provider>);
    expect(screen.getByText("YES")).toBeInTheDocument();
  });

  it("returns false when the capability is missing", () => {
    _setConnectorFactory(() => makeConnector([]));
    const store = makeStore();
    render(<Provider store={store}><Probe cap="getBlocksPage" /></Provider>);
    expect(screen.getByText("NO")).toBeInTheDocument();
  });

  it("re-evaluates when the provider slice changes", () => {
    let caps: string[] = [];
    _setConnectorFactory(() => makeConnector(caps));
    const store = makeStore();
    render(<Provider store={store}><Probe cap="getBlocksPage" /></Provider>);
    expect(screen.getByText("NO")).toBeInTheDocument();

    act(() => {
      caps = ["getBlocksPage"];
      store.dispatch(providerSlice.actions.set({ type: "YACI", baseUrl: "", network: "mainnet" }));
    });
    expect(screen.getByText("YES")).toBeInTheDocument();
  });
});
