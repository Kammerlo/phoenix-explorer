import { registerReeveType, getReeveRenderer, getRegisteredReeveTypes } from "./registry";

const Dummy = () => null;

describe("reeve type registry", () => {
  it("registers and resolves a renderer by exact type", () => {
    registerReeveType({ type: "FOO_TYPE", label: "Foo", Component: Dummy });
    expect(getReeveRenderer("FOO_TYPE")?.label).toBe("Foo");
  });

  it("resolves case-insensitively", () => {
    registerReeveType({ type: "BAR_TYPE", Component: Dummy });
    expect(getReeveRenderer("bar_type")).toBeDefined();
  });

  it("returns undefined for an unknown type", () => {
    expect(getReeveRenderer("NOPE")).toBeUndefined();
    expect(getReeveRenderer(undefined)).toBeUndefined();
    expect(getReeveRenderer(null)).toBeUndefined();
  });

  it("lists the registered types by their canonical name", () => {
    registerReeveType({ type: "BAZ_TYPE", Component: Dummy });
    expect(getRegisteredReeveTypes()).toContain("BAZ_TYPE");
  });

  it("overwrites a renderer when the same type registers again", () => {
    registerReeveType({ type: "DUP", label: "v1", Component: Dummy });
    registerReeveType({ type: "DUP", label: "v2", Component: Dummy });
    expect(getReeveRenderer("DUP")?.label).toBe("v2");
  });
});
