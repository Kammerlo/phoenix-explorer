// packages/frontend/src/commons/connector/capabilities/requireCapability.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { requireCapability } from "./requireCapability";
import { ApiConnector, _setConnectorFactory } from "../ApiConnector";

class TestConnector extends ApiConnector {
  constructor(private readonly caps: string[]) { super(""); }
  getCapabilities() { return new Set(this.caps as any); }
  // dummy abstract impls
  getEpochs() { return Promise.resolve({} as any); }
  getEpoch() { return Promise.resolve({} as any); }
  getBlocksPage() { return Promise.resolve({} as any); }
  getBlocksByEpoch() { return Promise.resolve({} as any); }
  getBlockDetail() { return Promise.resolve({} as any); }
  getTxDetail() { return Promise.resolve({} as any); }
  getTransactions() { return Promise.resolve({} as any); }
  getWalletAddressFromAddress() { return Promise.resolve({} as any); }
  getAddressTxsFromAddress() { return Promise.resolve({} as any); }
  getWalletStakeFromAddress() { return Promise.resolve({} as any); }
  getStakeAddressRegistrations() { return Promise.resolve({} as any); }
  getStakeDelegations() { return Promise.resolve({} as any); }
  getPoolRegistrations() { return Promise.resolve({} as any); }
  getCurrentProtocolParameters() { return Promise.resolve({} as any); }
  getTokensPage() { return Promise.resolve({} as any); }
  getTokenDetail() { return Promise.resolve({} as any); }
  getTokenTransactions() { return Promise.resolve({} as any); }
  getTokenHolders() { return Promise.resolve({} as any); }
  getTokensByPolicy() { return Promise.resolve({} as any); }
  getGovernanceOverviewList() { return Promise.resolve({} as any); }
  getGovernanceDetail() { return Promise.resolve({} as any); }
  getGovernanceActionVotes() { return Promise.resolve({} as any); }
  getPoolList() { return Promise.resolve({} as any); }
  getPoolDetail() { return Promise.resolve({} as any); }
  getPoolBlocks() { return Promise.resolve({} as any); }
  getDreps() { return Promise.resolve({} as any); }
  getDrep() { return Promise.resolve({} as any); }
  getDrepVotes() { return Promise.resolve({} as any); }
  getDrepDelegates() { return Promise.resolve({} as any); }
  search() { return Promise.resolve({} as any); }
  getDashboardStats() { return Promise.resolve({} as any); }
}

const Supported = () => <div>SUPPORTED</div>;
const Fallback = () => <div>FALLBACK</div>;

describe("requireCapability", () => {
  it("renders Component when capability is supported", () => {
    _setConnectorFactory(() => new TestConnector(["getEpochs"]) as any);
    render(<MemoryRouter>{requireCapability(Supported, "getEpochs", Fallback)}</MemoryRouter>);
    expect(screen.getByText("SUPPORTED")).toBeInTheDocument();
  });

  it("renders Fallback when capability is missing", () => {
    _setConnectorFactory(() => new TestConnector([]) as any);
    render(<MemoryRouter>{requireCapability(Supported, "getEpochs", Fallback)}</MemoryRouter>);
    expect(screen.getByText("FALLBACK")).toBeInTheDocument();
  });

  it("accepts an array of capabilities; renders Fallback unless ALL are supported", () => {
    _setConnectorFactory(() => new TestConnector(["getEpochs"]) as any);
    render(
      <MemoryRouter>
        {requireCapability(Supported, ["getEpochs", "getPoolList"], Fallback)}
      </MemoryRouter>
    );
    expect(screen.getByText("FALLBACK")).toBeInTheDocument();
  });
});
