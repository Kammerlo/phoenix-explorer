// packages/frontend/src/commons/connector/capabilities/filterMenus.test.ts
import { filterMenusByCapabilities, MenuItem } from "./filterMenus";

describe("filterMenusByCapabilities", () => {
  const isSupported = (cap: string) => ["getBlocksPage", "getTxDetail"].includes(cap);

  it("keeps items without a capability requirement", () => {
    const menus: MenuItem[] = [{ title: "Home", hidden: false }];
    expect(filterMenusByCapabilities(menus, isSupported as any)).toEqual(menus);
  });

  it("drops items whose capability is missing", () => {
    const menus: MenuItem[] = [
      { title: "Blocks", hidden: false, capability: "getBlocksPage" },
      { title: "Pools",  hidden: false, capability: "getPoolList" }
    ];
    const filtered = filterMenusByCapabilities(menus, isSupported as any);
    expect(filtered.map((m) => m.title)).toEqual(["Blocks"]);
  });

  it("drops items whose capability array is missing any required capability", () => {
    const menus: MenuItem[] = [
      { title: "Tokens", hidden: false, capability: ["getTokenDetail", "getTokensPage"] }
    ];
    const filtered = filterMenusByCapabilities(menus, isSupported as any);
    expect(filtered).toEqual([]);
  });

  it("recursively filters children and drops the parent if all children are dropped", () => {
    const menus: MenuItem[] = [
      {
        title: "Blockchain", hidden: false, children: [
          { title: "Pools", hidden: false, capability: "getPoolList" },
          { title: "DReps", hidden: false, capability: "getDreps" }
        ]
      }
    ];
    expect(filterMenusByCapabilities(menus, isSupported as any)).toEqual([]);
  });

  it("keeps a parent whose at least one child survives", () => {
    const menus: MenuItem[] = [
      {
        title: "Blockchain", hidden: false, children: [
          { title: "Blocks", hidden: false, capability: "getBlocksPage" },
          { title: "Pools",  hidden: false, capability: "getPoolList" }
        ]
      }
    ];
    const filtered = filterMenusByCapabilities(menus, isSupported as any);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].children).toHaveLength(1);
    expect(filtered[0].children![0].title).toBe("Blocks");
  });

  it("respects pre-existing hidden=true", () => {
    const menus: MenuItem[] = [{ title: "Hidden", hidden: true }];
    expect(filterMenusByCapabilities(menus, isSupported as any)).toEqual([]);
  });
});
