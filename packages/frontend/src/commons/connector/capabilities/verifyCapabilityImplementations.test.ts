// packages/frontend/src/commons/connector/capabilities/verifyCapabilityImplementations.test.ts
import { verifyCapabilityImplementations } from "./verifyCapabilityImplementations";
import { ConnectorBase } from "../ConnectorBase";

class Overrides extends ConnectorBase {
  constructor() { super(""); }
  getCapabilities() { return new Set<any>(["getEpochs"]); }
  // overrides
  async getEpochs() { return { data: [], lastUpdated: Date.now() } as any; }
}

class Mismatched extends ConnectorBase {
  constructor() { super(""); }
  // Declares getEpochs but does NOT override it.
  getCapabilities() { return new Set<any>(["getEpochs"]); }
}

class Undeclared extends ConnectorBase {
  constructor() { super(""); }
  getCapabilities() { return new Set<any>([]); }
  // Overrides getEpochs but doesn't declare the capability.
  async getEpochs() { return { data: [], lastUpdated: Date.now() } as any; }
}

describe("verifyCapabilityImplementations", () => {
  let warnSpy: jest.SpyInstance;
  beforeEach(() => { warnSpy = jest.spyOn(console, "warn").mockImplementation(); });
  afterEach(() => { warnSpy.mockRestore(); });

  it("does not warn when declarations match overrides", () => {
    verifyCapabilityImplementations(new Overrides());
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("warns when capability is declared but method is inherited from ConnectorBase", () => {
    verifyCapabilityImplementations(new Mismatched());
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("declared but not overridden"));
  });

  it("warns when method is overridden but capability is not declared", () => {
    verifyCapabilityImplementations(new Undeclared());
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("overridden but not declared"));
  });
});
