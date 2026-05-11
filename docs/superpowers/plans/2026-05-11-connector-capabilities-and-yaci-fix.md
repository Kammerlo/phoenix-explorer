# Connector Capabilities + Yaci-Store Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace coarse `FunctionEnum` capability gating with a typed per-method `Capability` model; gate sidebar, routes, in-page elements, and search; correct yaci-store direct connector against its live swagger.

**Architecture:** A typed string-literal union (`Capability`) maps 1:1 to `ApiConnector` method names. Connectors declare their supported subset via `getCapabilities(): ReadonlySet<Capability>`. Four gating surfaces consume that set: `requireCapability` (routes), `buildMenus` / `filterMenus` (sidebar), `useCapability` (in-page elements), `filterSearchResults` (search). The yaci connector is rewritten against the live swagger: endpoints with real equivalents get path/schema corrections; endpoints yaci-store doesn't expose are dropped from `getCapabilities()` so the matching UI disappears automatically.

**Tech Stack:** React 18 + TypeScript, Redux Toolkit, MUI v7, Jest, axios + axios-case-converter, yaci-store REST API.

**Spec:** [`docs/superpowers/specs/2026-05-11-connector-capabilities-and-yaci-fix-design.md`](../specs/2026-05-11-connector-capabilities-and-yaci-fix-design.md)

**Working branch:** `fix/yaci-store-direct` (already checked out)

**Test runner:** Frontend uses Jest with babel. Run tests with `cd packages/frontend && npx jest <file>`.

**File-touching contract:**
- Every code step shows the full code block being created or edited.
- Every commit step lists the exact `git add` files.
- Frontend files live under `packages/frontend/src/`; shared DTOs under `packages/shared/src/`.

---

## Task 1: Add `Capability` type

**Files:**
- Create: `packages/frontend/src/commons/connector/types/Capability.ts`

- [ ] **Step 1: Write the file**

```ts
// packages/frontend/src/commons/connector/types/Capability.ts

/**
 * Capabilities are the set of `ApiConnector` methods a connector implements.
 * Each capability string is exactly the name of a method on `ApiConnector`.
 *
 * Adding a new method to `ApiConnector`?
 *   1. Add the method name to `ALL_CAPABILITIES` below.
 *   2. The `_CapabilitiesAreMethodNames` type-test will fail to compile if
 *      the capability string isn't a real method name — fix the typo.
 *   3. Update each connector's `getCapabilities()` to advertise it (or not).
 */
export const ALL_CAPABILITIES = [
  "getEpochs",
  "getEpoch",
  "getBlocksPage",
  "getBlocksByEpoch",
  "getBlockDetail",
  "getPoolBlocks",
  "getTxDetail",
  "getTransactions",
  "getWalletAddressFromAddress",
  "getAddressTxsFromAddress",
  "getWalletStakeFromAddress",
  "getStakeAddressRegistrations",
  "getStakeDelegations",
  "getPoolRegistrations",
  "getPoolList",
  "getPoolDetail",
  "getCurrentProtocolParameters",
  "getTokensPage",
  "getTokenDetail",
  "getTokenTransactions",
  "getTokenHolders",
  "getTokensByPolicy",
  "getGovernanceOverviewList",
  "getGovernanceDetail",
  "getGovernanceActionVotes",
  "getDreps",
  "getDrep",
  "getDrepVotes",
  "getDrepDelegates",
  "search",
  "getDashboardStats"
] as const;

export type Capability = (typeof ALL_CAPABILITIES)[number];
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/commons/connector/types/Capability.ts
git commit -m "feat(connector): add Capability type and ALL_CAPABILITIES list"
```

---

## Task 2: Add `getCapabilities()` + `has()` / `hasAll()` to `ApiConnector`

**Files:**
- Modify: `packages/frontend/src/commons/connector/ApiConnector.ts`
- Modify: `packages/frontend/src/commons/connector/types/Capability.ts` (add type-test)

- [ ] **Step 1: Add abstract method + helpers to `ApiConnector`**

Edit `packages/frontend/src/commons/connector/ApiConnector.ts`. Add this import near the existing imports at top:

```ts
import { Capability } from "./types/Capability";
```

Then inside the abstract class body, immediately after the existing `abstract getSupportedFunctions(): FunctionEnum[];` declaration, add:

```ts
  /** Returns the set of `ApiConnector` methods this connector implements. */
  abstract getCapabilities(): ReadonlySet<Capability>;

  /** Synchronous capability check. */
  has(c: Capability): boolean {
    return this.getCapabilities().has(c);
  }

  /** True iff every capability in `cs` is supported. */
  hasAll(cs: readonly Capability[]): boolean {
    return cs.every((c) => this.has(c));
  }
```

- [ ] **Step 2: Add compile-time guard to `Capability.ts`**

Append to `packages/frontend/src/commons/connector/types/Capability.ts`:

```ts
// ─── Compile-time guard ──────────────────────────────────────────────────────
//
// Forces every Capability string to be the name of a real method on
// ApiConnector. If you add to ALL_CAPABILITIES and the string is misspelled
// or the method doesn't exist, `_CapabilitiesAreMethodNames` fails to compile.

import type { ApiConnector } from "../ApiConnector";

type _MethodOf<T, K extends keyof T> = T[K] extends (...args: never[]) => unknown ? K : never;
type _MethodNames<T> = { [K in keyof T]: _MethodOf<T, K> }[keyof T];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _CapabilitiesAreMethodNames = Capability extends _MethodNames<ApiConnector> ? true : never;
```

- [ ] **Step 3: Run type-check to confirm compile**

```bash
cd packages/frontend && npx tsc --noEmit -p .
```

Expected: any pre-existing errors only — no new errors from `Capability.ts` or `ApiConnector.ts`.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/commons/connector/ApiConnector.ts packages/frontend/src/commons/connector/types/Capability.ts
git commit -m "feat(connector): require getCapabilities() on ApiConnector + compile-time guard"
```

---

## Task 3: Stub `getCapabilities()` on `ConnectorBase`

`ConnectorBase` must satisfy the new abstract method. The default returns the empty set; concrete connectors override.

**Files:**
- Modify: `packages/frontend/src/commons/connector/ConnectorBase.ts`

- [ ] **Step 1: Add the import + method**

Add at the top of `ConnectorBase.ts`:

```ts
import { Capability } from "./types/Capability";
```

Then inside the class, immediately after the existing `getSupportedFunctions()` impl, add:

```ts
  getCapabilities(): ReadonlySet<Capability> {
    return new Set();
  }
```

- [ ] **Step 2: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p .
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/commons/connector/ConnectorBase.ts
git commit -m "feat(connector): ConnectorBase default getCapabilities() returns empty set"
```

---

## Task 4: GatewayConnector — declare capabilities (1:1 mapping)

**Files:**
- Modify: `packages/frontend/src/commons/connector/gateway/gatewayConnector.ts`

- [ ] **Step 1: Add the import**

In `gatewayConnector.ts`, add to the imports block:

```ts
import { Capability } from "../types/Capability";
```

- [ ] **Step 2: Add `getCapabilities()` next to the existing `getSupportedFunctions()`**

Locate the existing `getSupportedFunctions()` method in `gatewayConnector.ts` (around line 76). Immediately after its closing brace, insert:

```ts
  getCapabilities(): ReadonlySet<Capability> {
    return new Set<Capability>([
      "getEpochs",
      "getEpoch",
      "getBlocksPage",
      "getBlocksByEpoch",
      "getBlockDetail",
      "getPoolBlocks",
      "getTxDetail",
      "getTransactions",
      "getWalletAddressFromAddress",
      "getAddressTxsFromAddress",
      "getWalletStakeFromAddress",
      "getStakeAddressRegistrations",
      "getStakeDelegations",
      "getPoolRegistrations",
      "getPoolList",
      "getPoolDetail",
      "getCurrentProtocolParameters",
      "getTokensPage",
      "getTokenDetail",
      "getTokenTransactions",
      "getTokenHolders",
      "getTokensByPolicy",
      "getGovernanceOverviewList",
      "getGovernanceDetail",
      "getGovernanceActionVotes",
      "getDreps",
      "getDrep",
      "getDrepVotes",
      "getDrepDelegates",
      "search",
      "getDashboardStats"
    ]);
  }
```

This mirrors the existing `FunctionEnum` set plus all detail methods the gateway implements.

- [ ] **Step 3: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p .
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/commons/connector/gateway/gatewayConnector.ts
git commit -m "feat(gateway-connector): declare per-method capabilities"
```

---

## Task 5: BlockfrostConnector — declare capabilities (1:1 mapping)

**Files:**
- Modify: `packages/frontend/src/commons/connector/blockfrost/blockfrostConnector.ts`

- [ ] **Step 1: Add the import**

```ts
import { Capability } from "../types/Capability";
```

- [ ] **Step 2: Add `getCapabilities()` after the existing `getSupportedFunctions()`**

Locate `getSupportedFunctions()` (around line 45). Immediately after its closing brace, insert:

```ts
  getCapabilities(): ReadonlySet<Capability> {
    return new Set<Capability>([
      "getEpochs",
      "getEpoch",
      "getBlocksPage",
      "getBlocksByEpoch",
      "getBlockDetail",
      "getPoolBlocks",
      "getTxDetail",
      "getTransactions",
      "getWalletAddressFromAddress",
      "getAddressTxsFromAddress",
      "getWalletStakeFromAddress",
      "getStakeAddressRegistrations",
      "getStakeDelegations",
      "getPoolRegistrations",
      "getPoolList",
      "getPoolDetail",
      "getCurrentProtocolParameters",
      "getTokensPage",
      "getTokenDetail",
      "getTokenTransactions",
      "getTokenHolders",
      "getTokensByPolicy",
      "getGovernanceOverviewList",
      "getGovernanceDetail",
      "getGovernanceActionVotes",
      "getDreps",
      "getDrep",
      "getDrepVotes",
      "getDrepDelegates",
      "search",
      "getDashboardStats"
    ]);
  }
```

- [ ] **Step 3: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p .
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/commons/connector/blockfrost/blockfrostConnector.ts
git commit -m "feat(blockfrost-connector): declare per-method capabilities"
```

---

## Task 6: YaciConnector — declare capabilities (initial wide set; narrowed in Task 22)

This is the initial declaration matching the *current* `FunctionEnum` mapping. We'll narrow it in Task 22 after the endpoints are fixed, so we never have a window where the connector declares a capability whose endpoint is broken.

**Files:**
- Modify: `packages/frontend/src/commons/connector/yaci/yaciConnector.ts`

- [ ] **Step 1: Add the import**

```ts
import { Capability } from "../types/Capability";
```

- [ ] **Step 2: Add `getCapabilities()` after the existing `getSupportedFunctions()`**

Locate `getSupportedFunctions()` (around line 65). Immediately after its closing brace, insert:

```ts
  getCapabilities(): ReadonlySet<Capability> {
    // Initial wide set — narrowed in Task 22 after endpoint rewrites.
    return new Set<Capability>([
      "getEpochs",
      "getEpoch",
      "getBlocksPage",
      "getBlocksByEpoch",
      "getBlockDetail",
      "getTxDetail",
      "getTransactions",
      "getWalletAddressFromAddress",
      "getAddressTxsFromAddress",
      "getWalletStakeFromAddress",
      "getStakeAddressRegistrations",
      "getStakeDelegations",
      "getPoolRegistrations",
      "getCurrentProtocolParameters",
      "getTokensPage",
      "getTokenDetail",
      "getTokenTransactions",
      "getTokenHolders",
      "getTokensByPolicy",
      "getGovernanceOverviewList",
      "getGovernanceDetail",
      "getGovernanceActionVotes",
      "getPoolList",
      "getPoolDetail",
      "getDreps",
      "getDrep",
      "getDrepVotes",
      "getDrepDelegates",
      "search",
      "getDashboardStats"
    ]);
  }
```

- [ ] **Step 3: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p .
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/commons/connector/yaci/yaciConnector.ts
git commit -m "feat(yaci-connector): declare initial wide capability set (to be narrowed)"
```

---

## Task 7: `requireCapability` route helper

**Files:**
- Create: `packages/frontend/src/commons/connector/capabilities/requireCapability.tsx`
- Create: `packages/frontend/src/commons/connector/capabilities/requireCapability.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/frontend/src/commons/connector/capabilities/requireCapability.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { requireCapability } from "./requireCapability";
import { ApiConnector, _setConnectorFactory } from "../ApiConnector";

class TestConnector extends ApiConnector {
  constructor(private readonly caps: string[]) { super(""); }
  getSupportedFunctions() { return []; }
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd packages/frontend && npx jest src/commons/connector/capabilities/requireCapability.test.tsx
```

Expected: FAIL with module-not-found for `./requireCapability`.

- [ ] **Step 3: Implement `requireCapability`**

```tsx
// packages/frontend/src/commons/connector/capabilities/requireCapability.tsx
import React from "react";

import { ApiConnector } from "../ApiConnector";
import { Capability } from "../types/Capability";

type ComponentLike = React.ComponentType<unknown> | React.LazyExoticComponent<React.FC>;

/**
 * Returns `<Component />` if the active connector supports the given
 * capability (or all of them when an array is passed); otherwise returns
 * `<Fallback />`. Used in `Routers.tsx` to gate routes.
 */
export function requireCapability(
  Component: ComponentLike,
  capability: Capability | readonly Capability[],
  Fallback: ComponentLike
): React.ReactElement {
  const caps = Array.isArray(capability) ? capability : [capability];
  const supported = ApiConnector.getApiConnector().hasAll(caps);
  const Render = supported ? Component : Fallback;
  return <Render />;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd packages/frontend && npx jest src/commons/connector/capabilities/requireCapability.test.tsx
```

Expected: all three tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/commons/connector/capabilities/requireCapability.tsx packages/frontend/src/commons/connector/capabilities/requireCapability.test.tsx
git commit -m "feat(capabilities): add requireCapability route helper"
```

---

## Task 8: `filterMenus` helper

**Files:**
- Create: `packages/frontend/src/commons/connector/capabilities/filterMenus.ts`
- Create: `packages/frontend/src/commons/connector/capabilities/filterMenus.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd packages/frontend && npx jest src/commons/connector/capabilities/filterMenus.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `filterMenusByCapabilities`**

```ts
// packages/frontend/src/commons/connector/capabilities/filterMenus.ts
import { Capability } from "../types/Capability";

export interface MenuItem {
  title: string;
  key?: string;
  href?: string;
  children?: MenuItem[];
  icon?: unknown;
  tooltip?: string;
  isSpecialPath?: boolean;
  hidden: boolean;
  collapsable?: boolean;
  /** When set, the item is filtered out unless every listed capability is supported. */
  capability?: Capability | readonly Capability[];
}

export type CapabilityPredicate = (cap: Capability) => boolean;

function isSupported(item: MenuItem, hasCap: CapabilityPredicate): boolean {
  if (item.capability == null) return true;
  const caps = Array.isArray(item.capability) ? item.capability : [item.capability];
  return caps.every(hasCap);
}

export function filterMenusByCapabilities(
  menus: readonly MenuItem[],
  hasCap: CapabilityPredicate
): MenuItem[] {
  const out: MenuItem[] = [];
  for (const m of menus) {
    if (m.hidden) continue;
    if (!isSupported(m, hasCap)) continue;

    if (m.children && m.children.length > 0) {
      const children = filterMenusByCapabilities(m.children, hasCap);
      if (children.length === 0) continue; // parent collapses
      out.push({ ...m, children });
    } else {
      out.push(m);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run the tests**

```bash
cd packages/frontend && npx jest src/commons/connector/capabilities/filterMenus.test.ts
```

Expected: all six tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/commons/connector/capabilities/filterMenus.ts packages/frontend/src/commons/connector/capabilities/filterMenus.test.ts
git commit -m "feat(capabilities): add filterMenusByCapabilities helper"
```

---

## Task 9: `useCapability` React hook

**Files:**
- Create: `packages/frontend/src/commons/connector/capabilities/useCapability.ts`
- Create: `packages/frontend/src/commons/connector/capabilities/useCapability.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
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
    getSupportedFunctions() { return []; }
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd packages/frontend && npx jest src/commons/connector/capabilities/useCapability.test.tsx
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement the hook**

```ts
// packages/frontend/src/commons/connector/capabilities/useCapability.ts
import { useSelector } from "react-redux";

import { ApiConnector } from "../ApiConnector";
import { Capability } from "../types/Capability";
import { RootState } from "src/stores/types";

/**
 * Returns true if the active connector supports `cap`. Subscribes to the
 * Redux `provider` slice so consumers re-render when the provider changes.
 */
export function useCapability(cap: Capability | readonly Capability[]): boolean {
  // Reading the provider slice forces a re-render on provider switch.
  // The value itself is unused; `ApiConnector.getApiConnector()` picks up
  // the latest config because ConnectorFactory rebuilds on each call.
  useSelector((s: RootState) => s.provider.config);
  const caps = Array.isArray(cap) ? cap : [cap];
  return ApiConnector.getApiConnector().hasAll(caps);
}
```

- [ ] **Step 4: Run the test**

```bash
cd packages/frontend && npx jest src/commons/connector/capabilities/useCapability.test.tsx
```

Expected: all three tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/commons/connector/capabilities/useCapability.ts packages/frontend/src/commons/connector/capabilities/useCapability.test.tsx
git commit -m "feat(capabilities): add useCapability hook"
```

---

## Task 10: `filterSearchResults` helper

**Files:**
- Create: `packages/frontend/src/commons/connector/capabilities/filterSearchResults.ts`
- Create: `packages/frontend/src/commons/connector/capabilities/filterSearchResults.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/frontend/src/commons/connector/capabilities/filterSearchResults.test.ts
import { filterSearchResultsByCapabilities } from "./filterSearchResults";
import { SearchResult } from "@shared/dtos/seach.dto";

const results: SearchResult[] = [
  { type: "block", id: "1" },
  { type: "transaction", id: "abc" },
  { type: "token", id: "asset1xyz" },
  { type: "pool", id: "pool1abc" },
  { type: "gov_action", id: "tx1", extraId: "0" },
  { type: "drep", id: "drep1xyz" },
  { type: "epoch", id: "100" },
  { type: "address", id: "addr1xyz" },
  { type: "stake", id: "stake1xyz" },
  { type: "policy", id: "pol1xyz" }
];

describe("filterSearchResultsByCapabilities", () => {
  it("drops results whose detail capability is missing", () => {
    const hasCap = (c: any) => ["getBlockDetail", "getTxDetail"].includes(c);
    const filtered = filterSearchResultsByCapabilities(results, hasCap as any);
    expect(filtered.map((r) => r.type)).toEqual(["block", "transaction"]);
  });

  it("keeps results when their detail capability is supported", () => {
    const hasCap = (c: any) => true;
    expect(filterSearchResultsByCapabilities(results, hasCap as any)).toHaveLength(results.length);
  });

  it("returns an empty array when none are supported", () => {
    const hasCap = (_c: any) => false;
    expect(filterSearchResultsByCapabilities(results, hasCap as any)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd packages/frontend && npx jest src/commons/connector/capabilities/filterSearchResults.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement**

```ts
// packages/frontend/src/commons/connector/capabilities/filterSearchResults.ts
import { SearchResult, SearchResultType } from "@shared/dtos/seach.dto";
import { Capability } from "../types/Capability";
import { CapabilityPredicate } from "./filterMenus";

/** Maps each search result type to the connector capability needed to view its detail page. */
const RESULT_TYPE_CAPABILITY: Record<SearchResultType, Capability> = {
  transaction: "getTxDetail",
  block: "getBlockDetail",
  epoch: "getEpoch",
  address: "getWalletAddressFromAddress",
  stake: "getWalletStakeFromAddress",
  pool: "getPoolDetail",
  token: "getTokenDetail",
  policy: "getTokensByPolicy",
  drep: "getDrep",
  gov_action: "getGovernanceDetail"
};

export function filterSearchResultsByCapabilities(
  results: readonly SearchResult[],
  hasCap: CapabilityPredicate
): SearchResult[] {
  return results.filter((r) => hasCap(RESULT_TYPE_CAPABILITY[r.type]));
}
```

- [ ] **Step 4: Run the test**

```bash
cd packages/frontend && npx jest src/commons/connector/capabilities/filterSearchResults.test.ts
```

Expected: all three tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/commons/connector/capabilities/filterSearchResults.ts packages/frontend/src/commons/connector/capabilities/filterSearchResults.test.ts
git commit -m "feat(capabilities): add filterSearchResultsByCapabilities helper"
```

---

## Task 11: `verifyCapabilityImplementations` dev-mode drift check

**Files:**
- Create: `packages/frontend/src/commons/connector/capabilities/verifyCapabilityImplementations.ts`
- Create: `packages/frontend/src/commons/connector/capabilities/verifyCapabilityImplementations.test.ts`
- Modify: `packages/frontend/src/commons/connector/ConnectorFactory.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run to verify failure**

```bash
cd packages/frontend && npx jest src/commons/connector/capabilities/verifyCapabilityImplementations.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement**

```ts
// packages/frontend/src/commons/connector/capabilities/verifyCapabilityImplementations.ts
import { ALL_CAPABILITIES, Capability } from "../types/Capability";
import { ConnectorBase } from "../ConnectorBase";
import { ApiConnector } from "../ApiConnector";

/**
 * Dev-mode sanity check: warns when a connector's declared capabilities
 * drift from its actual overrides. Never throws. Run once per
 * `ConnectorFactory.create()` call when `import.meta.env.DEV` is true.
 */
export function verifyCapabilityImplementations(connector: ApiConnector): void {
  const declared = connector.getCapabilities();
  const basePrototype = ConnectorBase.prototype as Record<string, unknown>;
  const ownPrototype = Object.getPrototypeOf(connector) as Record<string, unknown>;

  for (const cap of ALL_CAPABILITIES) {
    const overridesBase = ownPrototype[cap as string] !== basePrototype[cap as string];
    const isDeclared = declared.has(cap as Capability);

    if (isDeclared && !overridesBase) {
      // eslint-disable-next-line no-console
      console.warn(
        `[capabilities] ${connector.constructor.name}: '${cap}' declared but not overridden — calls will hit ConnectorBase.unsupported.`
      );
    }
    if (!isDeclared && overridesBase) {
      // eslint-disable-next-line no-console
      console.warn(
        `[capabilities] ${connector.constructor.name}: '${cap}' overridden but not declared — UI will treat as unsupported.`
      );
    }
  }
}
```

- [ ] **Step 4: Run the test**

```bash
cd packages/frontend && npx jest src/commons/connector/capabilities/verifyCapabilityImplementations.test.ts
```

Expected: all three tests PASS.

- [ ] **Step 5: Wire into `ConnectorFactory.ts`**

Edit `packages/frontend/src/commons/connector/ConnectorFactory.ts`. Add the import:

```ts
import { verifyCapabilityImplementations } from "./capabilities/verifyCapabilityImplementations";
```

Wrap the existing factory body so each construction is verified in dev:

Replace the existing `_setConnectorFactory(() => { ... });` block with:

```ts
_setConnectorFactory(() => {
  const config = loadProviderConfig();
  let connector;
  if (config.type === "YACI") {
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
```

- [ ] **Step 6: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p .
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add packages/frontend/src/commons/connector/capabilities/verifyCapabilityImplementations.ts packages/frontend/src/commons/connector/capabilities/verifyCapabilityImplementations.test.ts packages/frontend/src/commons/connector/ConnectorFactory.ts
git commit -m "feat(capabilities): add verifyCapabilityImplementations dev drift check"
```

---

## Task 12: Migrate `Routers.tsx` from `isSupportedElement` to `requireCapability`

**Files:**
- Modify: `packages/frontend/src/Routers.tsx`

- [ ] **Step 1: Replace imports and the helper**

Open `packages/frontend/src/Routers.tsx`.

Replace the imports:

```ts
import { ApiConnector } from "./commons/connector/ApiConnector";
import { FunctionEnum } from "./commons/connector/types/FunctionEnum";
```

with:

```ts
import { requireCapability } from "./commons/connector/capabilities/requireCapability";
```

Delete the body of `AppRoutes` between the `useEffect` (line 53) and the `return` — specifically:

```ts
  const supportedFunctions = ApiConnector.getApiConnector().getSupportedFunctions();
  // ... and ...
  function isSupportedElement(Component: React.LazyExoticComponent<React.FC>, type: FunctionEnum) {
    if (supportedFunctions.includes(type)) {
      return <Component />;
    } else {
      return <NotFound />;
    }
  }
```

(Both the `supportedFunctions` constant and the `isSupportedElement` function are removed.)

- [ ] **Step 2: Rewrite the `<Route>` elements**

Replace the existing `<Routes>` block (lines ~66-91) with:

```tsx
      <Routes>
        <Route path={routers.HOME} element={<Home />} />

        <Route path={routers.GOVERNANCE_ACTION_LIST}
          element={requireCapability(GovernanceOverview, "getGovernanceOverviewList", NotFound)} />

        <Route path={routers.BLOCK_LIST}        element={requireCapability(BlockList, "getBlocksPage", NotFound)} />
        <Route path={routers.BLOCK_DETAIL}      element={requireCapability(BlockDetail, "getBlockDetail", NotFound)} />
        <Route path={routers.EPOCH_LIST}        element={requireCapability(Epoch, "getEpochs", NotFound)} />
        <Route path={routers.EPOCH_DETAIL}      element={requireCapability(EpochDetail, "getEpoch", NotFound)} />
        <Route path={routers.TRANSACTION_LIST}  element={requireCapability(TransactionList, "getTransactions", NotFound)} />
        <Route path={routers.TRANSACTION_DETAIL} element={requireCapability(TransactionDetailView, "getTxDetail", NotFound)} />
        <Route path={routers.ADDRESS_DETAIL}    element={requireCapability(AddressDetail, "getWalletAddressFromAddress", NotFound)} />
        <Route path={routers.STAKE_DETAIL}      element={requireCapability(AddressDetail, "getWalletStakeFromAddress", NotFound)} />
        <Route path={routers.STAKE_DETAIL_ALIAS} element={requireCapability(AddressDetail, "getWalletStakeFromAddress", NotFound)} />
        <Route path={routers.POOLS}             element={requireCapability(DelegationPools, "getPoolList", NotFound)} />
        <Route path={routers.POOL_DETAIL}       element={requireCapability(PoolDetailView, "getPoolDetail", NotFound)} />
        <Route path={routers.TOKEN_LIST}        element={requireCapability(Tokens, "getTokensPage", NotFound)} />
        <Route path={routers.TOKEN_DETAIL}      element={requireCapability(TokenDetail, "getTokenDetail", NotFound)} />
        <Route path={routers.DREPS}             element={requireCapability(Dreps, "getDreps", NotFound)} />
        <Route path={routers.GOVERNANCE_ACTION} element={requireCapability(GovernanceActionDetails, "getGovernanceDetail", NotFound)} />
        <Route path={routers.DREP_DETAILS}      element={requireCapability(DrepDetail, "getDrep", NotFound)} />
        <Route path={routers.PLUGINS}           element={<PluginManager />} />
        <Route path={routers.PROTOCOL_PARAMETERS} element={requireCapability(ProtocolParameters, "getCurrentProtocolParameters", NotFound)} />
        <Route path={routers.POLICY_DETAIL}     element={requireCapability(PolicyDetail, "getTokensByPolicy", NotFound)} />
        <Route path="*" element={<NotFound />} />
      </Routes>
```

- [ ] **Step 3: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p .
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/Routers.tsx
git commit -m "refactor(routes): migrate to requireCapability per-method gating"
```

---

## Task 13: Convert `menus.ts` to `buildMenus(connector)`

`menus.ts` currently calls `ApiConnector.getApiConnector()` at module load time. That snapshots the connector and prevents provider switches from refreshing the sidebar. Convert it to a function so each render evaluates the current connector.

**Files:**
- Modify: `packages/frontend/src/commons/menus.ts`

- [ ] **Step 1: Rewrite the file**

Replace the entire content of `packages/frontend/src/commons/menus.ts` with:

```ts
import { FaGithub } from "react-icons/fa";
import { IconType } from "react-icons/lib";

import {
  BlockChainMenuIcon,
  BrowseIcon,
  DashboardIcon,
  ProtocolIcon,
  Catalyst
} from "./resources";
import { details, routers } from "./routers";
import { ApiConnector } from "./connector/ApiConnector";
import { Capability } from "./connector/types/Capability";
import { MenuItem, filterMenusByCapabilities } from "./connector/capabilities/filterMenus";

export type Menu = MenuItem;

interface Social {
  title: string;
  href: string;
  icon: IconType | string | React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
}

/** Sidebar menus, gated by the connector's declared capabilities. */
export function buildMenus(connector: ApiConnector): Menu[] {
  const raw: Menu[] = [
    {
      title: "Dashboard",
      key: "page.dashboard",
      icon: DashboardIcon,
      href: routers.HOME,
      hidden: false
    },
    {
      title: "Blockchain",
      key: "glossary.blockchain",
      icon: BlockChainMenuIcon,
      hidden: false,
      collapsable: false,
      children: [
        { title: "Epochs",       key: "glossary.epochs",       href: routers.EPOCH_LIST,           hidden: false, capability: "getEpochs" satisfies Capability },
        { title: "Blocks",       key: "glossary.blocks",       href: routers.BLOCK_LIST,           hidden: false, capability: "getBlocksPage" satisfies Capability },
        { title: "Transactions", key: "glossary.transactions", href: routers.TRANSACTION_LIST,     hidden: false, capability: "getTransactions" satisfies Capability },
        { title: "Native Tokens", key: "glossary.nativeTokens", href: routers.TOKEN_LIST,          hidden: false, capability: "getTokensPage" satisfies Capability },
        { title: "Pools",        key: "head.page.pool",        href: routers.POOLS, isSpecialPath: true, hidden: false, capability: "getPoolList" satisfies Capability },
        { title: "Delegated Representatives", key: "head.page.drep", href: routers.DREPS, isSpecialPath: true, hidden: false, capability: "getDreps" satisfies Capability },
        { title: "Governance Actions", key: "glossary.governanceActions", href: details.governanceActionList(), hidden: false, capability: "getGovernanceOverviewList" satisfies Capability }
      ]
    }
  ];
  return filterMenusByCapabilities(raw, (c) => connector.has(c));
}

export function buildFooterMenus(connector: ApiConnector): Menu[] {
  const raw: Menu[] = [
    { title: "Plugins",  key: "glossary.plugins",  icon: ProtocolIcon, href: routers.PLUGINS, hidden: false },
    { title: "Protocol Parameters", key: "glossary.protocolParameters", icon: ProtocolIcon, href: routers.PROTOCOL_PARAMETERS, hidden: false, capability: "getCurrentProtocolParameters" satisfies Capability },
    {
      title: "Discover Cardano", key: "glossary.discoverCardano", icon: BrowseIcon, hidden: false,
      children: [
        { href: "https://cardanofoundation.org/en/about-us/", title: "Cardano Foundation", key: "site.CF", hidden: false },
        { href: "https://docs.cardano.org/", title: "Cardano Docs", key: "site.cardanoDocs", hidden: false },
        { href: "https://cardanofoundation.org/academy/", title: "Cardano Academy", key: "site.cardanoAcademy", hidden: false },
        { href: "https://developers.cardano.org/", title: "Developer Portal", key: "site.developerPortal", hidden: false },
        { href: "https://cardanofoundation.org/en/news", title: "News and Blog", key: "site.newsAndBlog", hidden: false }
      ]
    }
  ];
  return filterMenusByCapabilities(raw, (c) => connector.has(c));
}

export const socials: Social[] = [
  { href: "https://github.com/Kammerlo/cardano-explorer", title: "GitHub", icon: FaGithub },
  { href: "https://projectcatalyst.io/funds/14/cardano-open-developers/phoenix-explorer-reviving-an-open-source-explorer", title: "Project Catalyst", icon: Catalyst }
];
```

- [ ] **Step 2: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p .
```

Expected: errors in files that still `import { menus, footerMenus }`. Note them for Task 14.

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/commons/menus.ts
git commit -m "refactor(menus): convert to buildMenus(connector) + buildFooterMenus(connector)"
```

---

## Task 14: Adapt Sidebar components to `useMenus()` / `useFooterMenus()`

**Files:**
- Create: `packages/frontend/src/commons/connector/capabilities/useMenus.ts`
- Modify: `packages/frontend/src/components/commons/Layout/Sidebar/SidebarMenu/index.tsx`
- Modify: `packages/frontend/src/components/commons/Layout/Sidebar/FooterMenu/index.tsx`

- [ ] **Step 1: Create the hooks**

```ts
// packages/frontend/src/commons/connector/capabilities/useMenus.ts
import { useMemo } from "react";
import { useSelector } from "react-redux";

import { ApiConnector } from "../ApiConnector";
import { buildMenus, buildFooterMenus, Menu } from "src/commons/menus";
import { RootState } from "src/stores/types";

export function useMenus(): Menu[] {
  // Subscribe to provider config so the menu list rebuilds on provider switch.
  const cfg = useSelector((s: RootState) => s.provider.config);
  return useMemo(() => buildMenus(ApiConnector.getApiConnector()), [cfg]);
}

export function useFooterMenus(): Menu[] {
  const cfg = useSelector((s: RootState) => s.provider.config);
  return useMemo(() => buildFooterMenus(ApiConnector.getApiConnector()), [cfg]);
}
```

- [ ] **Step 2: Update `SidebarMenu/index.tsx`**

Find the line in `packages/frontend/src/components/commons/Layout/Sidebar/SidebarMenu/index.tsx`:

```ts
import { footerMenus, menus } from "src/commons/menus";
```

Replace it with:

```ts
import { useMenus, useFooterMenus } from "src/commons/connector/capabilities/useMenus";
```

Inside the `SidebarMenu: React.FC` component body, immediately after the existing destructuring of redux state, add:

```ts
  const menus = useMenus();
  const footerMenus = useFooterMenus();
```

- [ ] **Step 3: Update `FooterMenu/index.tsx`**

Open `packages/frontend/src/components/commons/Layout/Sidebar/FooterMenu/index.tsx`. Find any import of `footerMenus` from `src/commons/menus`:

```ts
import { footerMenus } from "src/commons/menus";
```

Replace with:

```ts
import { useFooterMenus } from "src/commons/connector/capabilities/useMenus";
```

Inside the component body, add:

```ts
  const footerMenus = useFooterMenus();
```

- [ ] **Step 4: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p .
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/commons/connector/capabilities/useMenus.ts packages/frontend/src/components/commons/Layout/Sidebar/SidebarMenu/index.tsx packages/frontend/src/components/commons/Layout/Sidebar/FooterMenu/index.tsx
git commit -m "refactor(sidebar): use useMenus/useFooterMenus hooks for live capability gating"
```

---

## Task 15: Apply capability filtering to search call sites

Search is used in the global header. Locate its consumers and filter results before rendering.

**Files:**
- Modify: the file that renders `SearchResult` lists (find via `git grep`)

- [ ] **Step 1: Locate the search consumer**

```bash
grep -rln "SearchResult\b" packages/frontend/src --include="*.tsx" --include="*.ts"
```

Expected: a handful of files. The primary consumer is the header search box; tests below assume `packages/frontend/src/components/commons/Header*` or a `SearchBar` component (depending on layout).

- [ ] **Step 2: Wrap the search results**

In the file that calls `apiConnector.search(query)` and renders the result list, change the response handling to:

```ts
import { filterSearchResultsByCapabilities } from "src/commons/connector/capabilities/filterSearchResults";

// ...inside the component:
apiConnector.search(q).then((res) => {
  const filtered = filterSearchResultsByCapabilities(res.data ?? [], (c) => apiConnector.has(c));
  setResults(filtered);
});
```

The exact location varies by codebase layout; the diff should consist of:
1. Adding the import.
2. Inserting one `filterSearchResultsByCapabilities` call between the `await search(...)` and the `setState` call.

- [ ] **Step 3: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p .
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add <the file you modified>
git commit -m "feat(search): filter results by active connector capabilities"
```

---

## Task 16: In-page gating — Home dashboard cards

Concrete adoption of the capability hook: hide Top Pools card when `getPoolList` is missing.

**Files:**
- Modify: `packages/frontend/src/pages/Home/index.tsx`

- [ ] **Step 1: Add the hook and gate the fetch + render**

Open `packages/frontend/src/pages/Home/index.tsx`. Replace the existing import block top (line 1-16) with:

```tsx
import { useEffect, useState } from "react";
import { Container, Grid, styled } from "@mui/material";
import { useTranslation } from "react-i18next";

import { ApiConnector } from "src/commons/connector/ApiConnector";
import { useCapability } from "src/commons/connector/capabilities/useCapability";
import { Block } from "@shared/dtos/block.dto";
import { Transaction } from "@shared/dtos/transaction.dto";
import { PoolOverview } from "@shared/dtos/pool.dto";

import BlockChainVisualizer from "src/components/Home/BlockChainVisualizer";
import ActivityChart from "src/components/Home/ActivityChart";
import DashboardStatsGrid, { DashboardStats } from "src/components/Home/DashboardStats";
import LatestBlocks from "src/components/Home/LatestBlocks";
import LatestTransactions from "src/components/Home/LatestTransactions";
import TopDelegationPools from "src/components/Home/TopDelegationPools";
import { Fade } from "src/commons/animation";
```

- [ ] **Step 2: Gate the pools fetch + section**

Inside the component, declare the capability flag near the existing state hooks:

```tsx
  const canShowPools = useCapability("getPoolList");
  const canShowBlocks = useCapability("getBlocksPage");
  const canShowTxs = useCapability("getTransactions");
  const canShowDashboardStats = useCapability("getDashboardStats");
```

In the existing `useEffect` (lines ~41-71), wrap each fetch in its capability flag:

```tsx
  useEffect(() => {
    const api = ApiConnector.getApiConnector();

    if (canShowDashboardStats) {
      api.getDashboardStats()
        .then((result) => setStatsData(result.data))
        .catch(() => {})
        .finally(() => setStatsLoading(false));
    } else {
      setStatsLoading(false);
    }

    if (canShowBlocks) {
      api.getBlocksPage({ page: "1", size: String(TABLE_ROWS) })
        .then((r) => setBlocks((r.data ?? []).slice(0, TABLE_ROWS)))
        .catch(() => {})
        .finally(() => setBlocksLoading(false));
    } else {
      setBlocksLoading(false);
    }

    if (canShowTxs) {
      api.getTransactions(undefined, { page: "1", size: String(TABLE_ROWS) })
        .then((r) => setTxs((r.data ?? []).slice(0, TABLE_ROWS)))
        .catch(() => {})
        .finally(() => setTxsLoading(false));
    } else {
      setTxsLoading(false);
    }

    if (canShowPools) {
      api.getPoolList({ page: "1", size: "5" })
        .then((r) => setPools(r.data ?? []))
        .catch(() => {})
        .finally(() => setPoolsLoading(false));
    } else {
      setPoolsLoading(false);
    }
  }, [canShowDashboardStats, canShowBlocks, canShowTxs, canShowPools]);
```

In the `return`, wrap each section in its flag. Replace the existing JSX inside `<HomeContainer>` with:

```tsx
    <HomeContainer data-testid="home-container">
      {canShowDashboardStats && (
        <Fade duration={0.32}>
          <DashboardStatsGrid statsData={statsData} loading={statsLoading} />
        </Fade>
      )}

      {canShowBlocks && (
        <Fade duration={0.32} delay={0.08}>
          <BlockChainVisualizer />
        </Fade>
      )}

      {(canShowBlocks || canShowTxs) && (
        <Fade duration={0.32} delay={0.14} whileInView>
          <ActivityChart />
        </Fade>
      )}

      {(canShowBlocks || canShowTxs) && (
        <Fade duration={0.32} whileInView>
          <Grid container spacing={2} mb={3}>
            {canShowBlocks && (
              <Grid size={{ xs: 12, md: canShowTxs ? 6 : 12 }}>
                <LatestBlocks blocks={blocks} loading={blocksLoading} rows={TABLE_ROWS} />
              </Grid>
            )}
            {canShowTxs && (
              <Grid size={{ xs: 12, md: canShowBlocks ? 6 : 12 }}>
                <LatestTransactions txs={txs} loading={txsLoading} rows={TABLE_ROWS} />
              </Grid>
            )}
          </Grid>
        </Fade>
      )}

      {canShowPools && (
        <Fade duration={0.32} whileInView>
          <TopDelegationPools pools={pools} loading={poolsLoading} />
        </Fade>
      )}
    </HomeContainer>
```

- [ ] **Step 3: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p .
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/pages/Home/index.tsx
git commit -m "feat(home): gate dashboard sections by connector capabilities"
```

---

## Task 17: Regenerate `yaci/types.ts` from swagger

The current types file invents shapes (`YaciAsset`, `YaciPool`, `YaciDrep`) that don't match yaci-store's schema. Replace it with types derived from the swagger.

**Files:**
- Modify: `packages/frontend/src/commons/connector/yaci/types.ts`

- [ ] **Step 1: Fetch swagger schemas locally for reference**

```bash
curl -sf http://192.168.1.4:8080/v3/api-docs > /tmp/yaci-swagger.json
jq '.components.schemas' /tmp/yaci-swagger.json > /tmp/yaci-schemas.json
```

(Inspect `/tmp/yaci-schemas.json` while editing — keep field names and types accurate.)

- [ ] **Step 2: Rewrite the types file**

Replace the entire content of `packages/frontend/src/commons/connector/yaci/types.ts` with hand-typed equivalents of the swagger component schemas the connector actually uses. The target shapes (matching swagger as of 2026-05-11):

```ts
// packages/frontend/src/commons/connector/yaci/types.ts

// ── Blocks ───────────────────────────────────────────────────────────────────
export interface BlockDto {
  hash?: string;
  number?: number;
  slot?: number;
  epoch?: number;
  epochSlot?: number;
  time?: number;            // epoch seconds
  txCount?: number;
  size?: number;
  slotLeader?: string;
  previousBlock?: string;
  nextBlock?: string;
}

export interface BlocksPage {
  blocks?: BlockDto[];
  total?: number;
  totalPages?: number;
}

// ── Transactions ─────────────────────────────────────────────────────────────
export interface TransactionSummary {
  txHash?: string;
  blockNumber?: number;
  blockTime?: number;       // epoch seconds
  fee?: string;
  totalOutput?: string;
}

export interface TransactionPage {
  transactionSummaries?: TransactionSummary[];
  total?: number;
  totalPages?: number;
}

export interface TransactionDetails {
  hash?: string;
  blockHash?: string;
  blockHeight?: number;
  slot?: number;
  index?: number;
  outputAmount?: { unit: string; quantity: string }[];
  fees?: string;
  deposit?: string;
  size?: number;
  invalidBefore?: string;
  invalidHereafter?: string;
  utxoCount?: number;
  withdrawalCount?: number;
  mirCertCount?: number;
  delegationCount?: number;
  stakeCertCount?: number;
  poolUpdateCount?: number;
  poolRetireCount?: number;
  assetMintOrBurnCount?: number;
  redeemerCount?: number;
  validContract?: boolean;
}

export interface TxUtxo {
  address?: string;
  amounts?: Amt[];
  txHash?: string;
  outputIndex?: number;
}

export interface Amt {
  unit?: string;
  policyId?: string;
  assetName?: string;
  fingerprint?: string;
  quantity?: string | number;
}

export interface TxInputsOutputs {
  inputs?: TxUtxo[];
  outputs?: TxUtxo[];
}

export interface TxMetadataLabelDto {
  label?: number | string;
  jsonMetadata?: unknown;
  cborMetadata?: string;
}

export interface AddressUtxo {
  txHash?: string;
  outputIndex?: number;
  address?: string;
  amount?: Amt[];
}

export interface AddressTransaction {
  txHash?: string;
  blockNumber?: number;
  blockTime?: number;
}

// ── Epochs / protocol params ─────────────────────────────────────────────────
export interface Epoch {
  number?: number;
  startTime?: string;
  endTime?: string;
  blockCount?: number;
  txCount?: number;
  outputSum?: string;
  fees?: string;
  activeStake?: string;
}

export interface ProtocolParamsDto {
  epoch?: number;
  minFeeA?: number;
  minFeeB?: number;
  maxBlockSize?: number;
  maxTxSize?: number;
  maxBlockHeaderSize?: number;
  keyDeposit?: number;
  poolDeposit?: number;
  protocolMajor?: number;
  protocolMinor?: number;
  minPoolCost?: number;
  ada_per_utxo_byte?: number;
  rho?: number;             // monetary expansion
  tau?: number;             // treasury cut
  decentralisation?: number;
  // … additional fields from ProtocolParams schema as present
}

// ── Stake ─────────────────────────────────────────────────────────────────────
export interface StakeAccountInfo {
  stakeAddress?: string;
  controlledAmount?: number;
  withdrawableAmount?: number;
  poolId?: string;
}

export interface StakeRegistrationDetail {
  txHash?: string;
  certIndex?: number;
  address?: string;
  blockNumber?: number;
  blockTime?: number;
  slot?: number;
  epoch?: number;
}

export interface Delegation {
  txHash?: string;
  certIndex?: number;
  address?: string;
  poolId?: string;
  blockNumber?: number;
  blockTime?: number;
  slot?: number;
  epoch?: number;
  active?: boolean;
}

// ── Pools ────────────────────────────────────────────────────────────────────
export interface PoolRegistration {
  txHash?: string;
  certIndex?: number;
  poolId?: string;
  vrfKeyHash?: string;
  pledge?: number;
  cost?: number;
  margin?: number;
  rewardAccount?: string;
  poolOwners?: string[];
  blockNumber?: number;
  blockTime?: number;
  slot?: number;
  epoch?: number;
}

export interface PoolRetirement {
  txHash?: string;
  certIndex?: number;
  poolId?: string;
  epoch?: number;
  blockNumber?: number;
  blockTime?: number;
}

export interface PoolBlock {
  poolId?: string;
  blockHash?: string;
  blockNumber?: number;
  epochNumber?: number;
}

// ── Assets ───────────────────────────────────────────────────────────────────
export interface AssetTransaction {
  txHash?: string;
  blockNumber?: number;
  blockTime?: number;
  action?: "minted" | "burned";
  amount?: string;
}

export interface FingerprintSupply {
  fingerprint?: string;
  unit?: string;
  totalSupply?: string;
}

// ── Governance ───────────────────────────────────────────────────────────────
export interface GovActionProposal {
  txHash?: string;
  index?: number;
  type?: string;
  blockTime?: number;
  blockNumber?: number;
  returnAddress?: string;
  deposit?: number;
  anchorUrl?: string;
  anchorHash?: string;
}

export interface VotingProcedureDto {
  txHash?: string;
  index?: number;
  voterHash?: string;
  voterType?: string;       // e.g. "DREP", "CONSTITUTIONAL_COMMITTEE", "STAKING_POOL_KEY_HASH"
  govActionTxHash?: string;
  govActionIndex?: number;
  vote?: string;            // "YES" | "NO" | "ABSTAIN"
  blockTime?: number;
}

export interface DRepRegistration {
  txHash?: string;
  certIndex?: number;
  drepHash?: string;
  drepId?: string;
  anchorUrl?: string;
  anchorHash?: string;
  deposit?: number;
  blockNumber?: number;
  blockTime?: number;
}

export interface DelegationVote {
  txHash?: string;
  certIndex?: number;
  address?: string;          // stake address of delegator
  drepHash?: string;
  drepId?: string;
  amount?: number;
  blockNumber?: number;
  blockTime?: number;
}

// ── AddressBalance helper used by the address mapper ─────────────────────────
export interface AddressBalanceDto {
  address?: string;
  amount?: Amt[];
  tx_count?: number;
}
```

Note: the legacy `EpochsPage` type, `YaciAsset`, `YaciPool`, `YaciDrep` interfaces are intentionally not re-exported — yaci-store does not have list endpoints for epochs / assets / pools / DReps. Any connector method that referenced them will be removed or rewritten in Tasks 18–22.

- [ ] **Step 3: Type-check (expect compilation errors in `yaciConnector.ts` — that's deliberate, fixed in the next tasks)**

```bash
cd packages/frontend && npx tsc --noEmit -p . 2>&1 | head -60
```

Expected: failures in `yaciConnector.ts` and `yaci/mapper/*.ts` referencing removed types.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/commons/connector/yaci/types.ts
git commit -m "refactor(yaci): regenerate types.ts against live swagger schema"
```

---

## Task 18: Yaci — fix block-related methods + drop epoch list/detail

**Files:**
- Modify: `packages/frontend/src/commons/connector/yaci/yaciConnector.ts`

- [ ] **Step 1: Remove `getEpochs` and `getEpoch` (no endpoint exists)**

Delete the `getEpochs(...)` method (lines ~209-218) and `getEpoch(...)` method (lines ~220-225) from `yaciConnector.ts`. `ConnectorBase` provides the default-unsupported fallback. Also remove the now-unused `Epoch` and `EpochsPage` imports from the file's top.

Remove these unused mapper imports too:

```ts
import { epochToIEpochData } from "./mapper/EpochToIEpochData";
```

(The file `EpochToIEpochData.ts` itself stays for now — gateway/blockfrost may still use it; check imports across the tree before deleting.)

- [ ] **Step 2: Verify `getBlocksPage`, `getBlocksByEpoch`, `getBlockDetail` paths**

These already call the correct yaci paths (`/blocks`, `/blocks/epoch/{e}`, `/blocks/{numberOrHash}`). No path changes needed. Confirm the `BlocksPage` and `BlockDto` field names in the new `types.ts` match what `blockDTOToBlock` expects — inspect `mapper/BlockDTOToBlock.ts`. If it reads `b.blockNo` or `b.epochNo` but the swagger says `b.number` / `b.epoch`, update the mapper to read the swagger names (case converter changes underscore_case → camelCase but does not invent fields).

Open `packages/frontend/src/commons/connector/yaci/mapper/BlockDTOToBlock.ts` and verify it maps:
- `b.number` → `Block.blockNo`
- `b.epoch` → `Block.epochNo`
- `b.epochSlot` → `Block.epochSlotNo`
- `b.slot` → `Block.slotNo`
- `b.hash` → `Block.hash`
- `b.time` → `Block.time` (string-cast)
- `b.txCount` → `Block.txCount`
- `b.size` → `Block.size`
- `b.slotLeader` → `Block.slotLeader`
- `b.previousBlock` → `Block.previousBlock`
- `b.nextBlock` → `Block.nextBlock`

If the mapper uses other source names, edit it so input field names match the new `BlockDto`.

- [ ] **Step 3: Add `getPoolBlocks`**

Inside `YaciConnector`, after `getBlockDetail`, add:

```ts
  async getPoolBlocks(poolId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Block[]>> {
    return this.requestList<Block>(async () => {
      const r = await this.client.get<{ poolBlocks?: PoolBlock[]; total?: number; totalPages?: number }>(
        `${this.baseUrl}/blocks/pool/${poolId}`, { params: pageInfo }
      );
      const blocks: Block[] = (r.data.poolBlocks ?? []).map((b) => ({
        blockNo: b.blockNumber ?? 0,
        epochNo: b.epochNumber ?? 0,
        hash: b.blockHash ?? "",
        time: "",
        txCount: 0,
        slotLeader: poolId
      } as Block));
      return { data: blocks, extras: { total: r.data.total, totalPage: r.data.totalPages } };
    });
  }
```

Add the `PoolBlock` import near the existing yaci type imports:

```ts
import { /* …, */ PoolBlock } from "./types";
```

- [ ] **Step 4: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p . 2>&1 | head -40
```

Expected: remaining errors in token / address / governance / drep methods (fixed in next tasks). Block-related errors should be gone.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/commons/connector/yaci/yaciConnector.ts packages/frontend/src/commons/connector/yaci/mapper/BlockDTOToBlock.ts
git commit -m "fix(yaci): align block methods with live swagger; drop epoch list/detail; add getPoolBlocks"
```

---

## Task 19: Yaci — fix transaction methods

**Files:**
- Modify: `packages/frontend/src/commons/connector/yaci/yaciConnector.ts`
- Modify (verify only): `packages/frontend/src/commons/connector/yaci/mapper/ToTransactionDetails.ts`

- [ ] **Step 1: Update `getTxDetail` to compose from sub-endpoints**

Yaci-store does not include UTXOs in the main `/txs/{txHash}` response — it has separate `/utxos`, `/withdrawals`, `/witnesses` endpoints.

Replace the existing `getTxDetail` (around line 143) with:

```ts
  async getTxDetail(txHash: string): Promise<ApiReturnType<TransactionDetail>> {
    return this.request<TransactionDetail>(async () => {
      const [txDetails, utxos, metadata, withdrawals] = await Promise.all([
        this.client.get<TransactionDetails>(`${this.baseUrl}/txs/${txHash}`).then((r) => r.data),
        this.client.get<TxInputsOutputs>(`${this.baseUrl}/txs/${txHash}/utxos`).then((r) => r.data).catch(() => ({} as TxInputsOutputs)),
        this.client.get<TxMetadataLabelDto[]>(`${this.baseUrl}/txs/${txHash}/metadata`).then((r) => r.data).catch(() => [] as TxMetadataLabelDto[]),
        this.client.get<Withdrawal[]>(`${this.baseUrl}/txs/${txHash}/withdrawals`).then((r) => r.data).catch(() => [] as Withdrawal[])
      ]);

      const blockResult = await this.getBlockDetail(String(txDetails.blockHeight ?? ""));
      return toTransactionDetail(txDetails, blockResult.data, metadata, utxos, withdrawals);
    });
  }
```

Add the missing type imports:

```ts
import {
  /* …, */
  TxInputsOutputs,
  Withdrawal
} from "./types";
```

If `Withdrawal` is not yet in `types.ts`, append it:

```ts
export interface Withdrawal {
  txHash?: string;
  address?: string;
  amount?: string;
}
```

Then update `mapper/ToTransactionDetails.ts` signature to accept the additional inputs. Open the file and change the function signature from whatever it currently takes (likely `(txDetails, block, metadata)`) to:

```ts
export function toTransactionDetail(
  txDetails: TransactionDetails,
  block: Block | null,
  metadata: TxMetadataLabelDto[],
  utxos: TxInputsOutputs,
  withdrawals: Withdrawal[]
): TransactionDetail {
  // Existing body — adapt to consume utxos.inputs / utxos.outputs / withdrawals.
}
```

Inside the body, replace any reference to `txDetails.inputs` / `txDetails.outputs` (which don't exist on the new schema) with `utxos.inputs` / `utxos.outputs`. Replace any reference to `txDetails.withdrawals` with the `withdrawals` parameter.

- [ ] **Step 2: Update `getTransactions` (no schema/path change, just remove `Epoch` import dependency if present)**

The existing implementation already uses correct yaci paths. No code change needed here unless the type-check from Task 17 surfaces an unresolved type — in that case import the missing type from the updated `types.ts`.

- [ ] **Step 3: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p . 2>&1 | head -40
```

Expected: transaction-related errors resolved.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/commons/connector/yaci/yaciConnector.ts packages/frontend/src/commons/connector/yaci/mapper/ToTransactionDetails.ts packages/frontend/src/commons/connector/yaci/types.ts
git commit -m "fix(yaci): compose tx detail from /utxos /metadata /withdrawals sub-endpoints"
```

---

## Task 20: Yaci — fix address + stake methods (drop unsupported, fix path)

**Files:**
- Modify: `packages/frontend/src/commons/connector/yaci/yaciConnector.ts`

- [ ] **Step 1: Drop unsupported methods**

Delete `getWalletAddressFromAddress` (lines ~262-306) and `getWalletStakeFromAddress` (lines ~184-207) from `yaciConnector.ts`. Yaci-store has no `/addresses/{addr}` or `/accounts/{stake}` general endpoints. `ConnectorBase` will return `unsupportedEnvelope` for any call.

- [ ] **Step 2: Fix `getAddressTxsFromAddress` path**

Replace the existing method (lines ~308-328) with:

```ts
  async getAddressTxsFromAddress(address: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    return this.requestList<Transaction>(async () => {
      // Yaci-store: /addresses/{address}/transactions (not /txs).
      // Yaci has no equivalent endpoint for stake addresses — return empty.
      if (address.startsWith("stake1")) return { data: [] };
      const r = await this.client.get<AddressTransaction[]>(
        `${this.baseUrl}/addresses/${address}/transactions`, { params: pageInfo }
      );
      const rows = r.data ?? [];
      const blockNumbers = [...new Set(rows.map((a) => a.blockNumber!).filter(Boolean))];
      const blockMap = new Map<number, Awaited<ReturnType<typeof this.getBlockDetail>>>();
      await Promise.all(blockNumbers.map(async (n) => blockMap.set(n, await this.getBlockDetail(String(n)))));
      const transactions = rows
        .filter((a) => a.txHash)
        .map((a) => transactionSummaryAndBlockToTransaction(
          { txHash: a.txHash, blockNumber: a.blockNumber, blockTime: a.blockTime } as TransactionSummary,
          blockMap.get(a.blockNumber!) ?? { data: null, lastUpdated: Date.now() }
        ));
      return { data: transactions };
    });
  }
```

Remove the imports no longer needed (`AddressBalanceDto`, `StakeAccountInfo` if only used by the deleted methods, and `addressBalanceDtoToWalletAddress`).

- [ ] **Step 3: Verify stake registrations / delegations**

`getStakeAddressRegistrations` and `getStakeDelegations` use `/stake/registrations`, `/stake/deregistrations`, `/stake/delegations` — all real swagger paths. Just confirm the field names in the new `StakeRegistrationDetail` and `Delegation` types match what the mappers (`stakeRegistrationDetailToIStakeKey`, `delegationToIStakeKey`) expect. If they expect fields like `stakeAddress` but the swagger uses `address`, edit the mappers to use `address`.

- [ ] **Step 4: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p . 2>&1 | head -40
```

Expected: address/stake errors resolved.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/commons/connector/yaci/yaciConnector.ts packages/frontend/src/commons/connector/yaci/mapper/StakeRegistrationDetailToIStakeKey.ts packages/frontend/src/commons/connector/yaci/mapper/DelegationToIStakeKey.ts packages/frontend/src/commons/connector/yaci/mapper/AddressBalanceDtoToWalletAddress.ts
git commit -m "fix(yaci): drop unsupported address/stake general endpoints; correct /addresses/{addr}/transactions path"
```

---

## Task 21: Yaci — drop unsupported token list / holders / by-policy; fix detail + transactions

**Files:**
- Modify: `packages/frontend/src/commons/connector/yaci/yaciConnector.ts`

- [ ] **Step 1: Drop unsupported token methods**

Delete from `yaciConnector.ts`:
- `getTokensPage` (lines ~330-340)
- `getTokenHolders` (lines ~368-381)
- `getTokensByPolicy` (lines ~383-391)

These have no yaci-store equivalents and inherit the `ConnectorBase` unsupported default.

- [ ] **Step 2: Fix `getTokenDetail` to use correct paths**

Replace the existing `getTokenDetail` with:

```ts
  async getTokenDetail(tokenId: string): Promise<ApiReturnType<ITokenOverview>> {
    return this.request<ITokenOverview>(async () => {
      const isFingerprint = tokenId.startsWith("asset1");
      const path = isFingerprint
        ? `${this.baseUrl}/assets/fingerprint/${tokenId}`
        : `${this.baseUrl}/assets/unit/${tokenId}`;
      const r = await this.client.get<YaciAssetDto>(path);
      return yaciAssetToTokenOverview(r.data);
    });
  }
```

Then replace the inline `YaciAsset` interface (lines ~663-672) and the bottom `yaciAssetToTokenOverview` helper. Add to the top of the file (or just above the class):

```ts
interface YaciAssetDto {
  unit?: string;
  policyId?: string;
  assetName?: string;
  fingerprint?: string;
  totalSupply?: string;
  initialMintTxHash?: string;
  mintOrBurnCount?: number;
  onchainMetadata?: Record<string, unknown>;
  metadata?: {
    ticker?: string;
    description?: string;
    url?: string;
    logo?: string;
    decimals?: number;
  };
}

function yaciAssetToTokenOverview(a: YaciAssetDto): ITokenOverview {
  return {
    name: a.assetName ?? a.unit ?? "",
    displayName: (a.onchainMetadata?.name as string) ?? a.assetName ?? a.unit ?? "",
    policy: a.policyId ?? (a.unit ? a.unit.slice(0, 56) : ""),
    fingerprint: a.fingerprint ?? "",
    txCount: a.mintOrBurnCount ?? 0,
    supply: a.totalSupply ? Number(a.totalSupply) : 0,
    metadata: a.metadata ? {
      ticker: a.metadata.ticker,
      description: a.metadata.description,
      url: a.metadata.url,
      logo: a.metadata.logo,
      decimals: a.metadata.decimals
    } : undefined
  };
}
```

Delete the old `YaciAsset` interface and `yaciAssetToTokenOverview` from the bottom of the file.

- [ ] **Step 3: Fix `getTokenTransactions`**

```ts
  async getTokenTransactions(tokenId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<Transaction[]>> {
    return this.requestList<Transaction>(async () => {
      // Yaci-store: /assets/{unit}/transactions. Endpoint requires unit (policy+name hex), not fingerprint.
      // If the caller passes a fingerprint (asset1…), resolve it to the unit first via /assets/fingerprint/{fp}.
      let unit = tokenId;
      if (tokenId.startsWith("asset1")) {
        const r = await this.client.get<YaciAssetDto>(`${this.baseUrl}/assets/fingerprint/${tokenId}`);
        unit = r.data.unit ?? tokenId;
      }
      const r = await this.client.get<AssetTransaction[]>(
        `${this.baseUrl}/assets/${unit}/transactions`, { params: pageInfo }
      );
      const rows = r.data ?? [];
      const blockNumbers = [...new Set(rows.map((t) => t.blockNumber!).filter(Boolean))];
      const blockMap = new Map<number, Awaited<ReturnType<typeof this.getBlockDetail>>>();
      await Promise.all(blockNumbers.map(async (n) => blockMap.set(n, await this.getBlockDetail(String(n)))));
      const txs = rows
        .filter((t) => t.txHash)
        .map((t) => transactionSummaryAndBlockToTransaction(
          { txHash: t.txHash, blockNumber: t.blockNumber, blockTime: t.blockTime } as TransactionSummary,
          blockMap.get(t.blockNumber!) ?? { data: null, lastUpdated: Date.now() }
        ));
      return { data: txs };
    });
  }
```

Add `AssetTransaction` to the imports:

```ts
import { /* …, */ AssetTransaction } from "./types";
```

- [ ] **Step 4: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p . 2>&1 | head -40
```

Expected: token errors resolved.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/commons/connector/yaci/yaciConnector.ts
git commit -m "fix(yaci): drop unsupported token list/holders/by-policy; correct detail and tx paths"
```

---

## Task 22: Yaci — drop unsupported pools list/detail; fix governance + dreps; narrow capabilities

**Files:**
- Modify: `packages/frontend/src/commons/connector/yaci/yaciConnector.ts`

- [ ] **Step 1: Drop pool list + pool detail**

Yaci-store has no `/pools` listing endpoint and no `/pools/{poolId}` detail. Delete `getPoolList` (lines ~450-467) and `getPoolDetail` (lines ~469-496) from `yaciConnector.ts`. Also remove the inline `YaciPool` interface and any references to `_enrichBlocksWithPoolNames` calls that go through `/pools/{leader}` (the method itself can stay but it will become a no-op since `/pools/{leader}` doesn't exist; mark it accordingly):

```ts
  private async _enrichBlocksWithPoolNames(blocks: Block[]): Promise<void> {
    // Yaci-store has no /pools/{poolId} endpoint — leave pool names unresolved.
    void blocks;
  }
```

- [ ] **Step 2: Fix `getGovernanceDetail`**

Replace existing method with:

```ts
  async getGovernanceDetail(txHash: string, index: string): Promise<ApiReturnType<GovernanceActionDetail>> {
    return this.request<GovernanceActionDetail>(async () => {
      // Yaci-store: /governance/proposals/{txHash}. The index parameter is unused here.
      void index;
      const p = (await this.client.get<GovActionProposal>(
        `${this.baseUrl}/governance/proposals/${txHash}`
      )).data;
      return {
        txHash: p.txHash ?? txHash,
        index: String(p.index ?? index),
        dateCreated: p.blockTime ? new Date(p.blockTime * 1000).toISOString() : "",
        actionType: p.type ?? "",
        status: "ACTIVE",
        expiredEpoch: null,
        enactedEpoch: null,
        motivation: null,
        rationale: null,
        title: null,
        authors: null,
        abstract: null,
        votesStats: { drep: { yes: 0, no: 0, abstain: 0 }, spo: { yes: 0, no: 0, abstain: 0 }, committee: { yes: 0, no: 0, abstain: 0 } }
      };
    });
  }
```

- [ ] **Step 3: Fix `getGovernanceActionVotes`**

Replace:

```ts
  async getGovernanceActionVotes(txHash: string, index: string): Promise<ApiReturnType<GovActionVote[]>> {
    return this.requestList<GovActionVote>(async () => {
      const r = await this.client.get<VotingProcedureDto[]>(
        `${this.baseUrl}/governance/proposals/${txHash}/${index}/votes`
      );
      const votes: GovActionVote[] = (r.data ?? []).map((v) => ({
        voter: v.voterHash ?? "",
        voterType: mapVoterType(v.voterType),
        vote: (v.vote?.toLowerCase() ?? "abstain") as "yes" | "no" | "abstain",
        txHash: v.txHash ?? "",
        certIndex: v.index ?? 0,
        voteTime: v.blockTime ? new Date(v.blockTime * 1000).toISOString() : ""
      }));
      return { data: votes };
    });
  }
```

- [ ] **Step 4: Drop unsupported DRep list/detail; fix delegate + votes paths**

Delete `getDreps` (lines ~498-508) and `getDrep` (lines ~510-515). Also delete the `YaciDrep` interface (around line 685) and `yaciDrepToDrep` helper at the bottom — neither has a yaci equivalent.

Replace `getDrepVotes`:

```ts
  async getDrepVotes(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<GovernanceActionListItem[]>> {
    return this.requestList<GovernanceActionListItem>(async () => {
      const r = await this.client.get<VotingProcedureDto[]>(
        `${this.baseUrl}/governance/votes`, { params: { ...pageInfo, dRepId: drepId } }
      );
      const items: GovernanceActionListItem[] = (r.data ?? []).map((v) => ({
        txHash: v.govActionTxHash ?? "",
        index: v.govActionIndex ?? 0,
        vote: (v.vote?.toLowerCase() ?? "abstain") as "yes" | "no" | "abstain"
      }));
      return { data: items };
    });
  }
```

Replace `getDrepDelegates`:

```ts
  async getDrepDelegates(drepId: string, pageInfo: ParsedUrlQuery): Promise<ApiReturnType<DrepDelegates[]>> {
    return this.requestList<DrepDelegates>(async () => {
      const r = await this.client.get<DelegationVote[]>(
        `${this.baseUrl}/governance/delegation-votes/drep/${drepId}`, { params: pageInfo }
      );
      const delegates: DrepDelegates[] = (r.data ?? []).map((d) => ({
        address: d.address ?? "",
        amount: d.amount ?? 0,
        stakeKeyHash: undefined
      }));
      return { data: delegates };
    });
  }
```

Add the missing imports:

```ts
import { /* …, */ DelegationVote } from "./types";
```

- [ ] **Step 5: Narrow `getCapabilities()`**

Replace the initial wide set (from Task 6) with the actual supported subset:

```ts
  getCapabilities(): ReadonlySet<Capability> {
    return new Set<Capability>([
      "getBlocksPage",
      "getBlocksByEpoch",
      "getBlockDetail",
      "getPoolBlocks",
      "getTxDetail",
      "getTransactions",
      "getAddressTxsFromAddress",
      "getStakeAddressRegistrations",
      "getStakeDelegations",
      "getPoolRegistrations",
      "getCurrentProtocolParameters",
      "getTokenDetail",
      "getTokenTransactions",
      "getGovernanceOverviewList",
      "getGovernanceDetail",
      "getGovernanceActionVotes",
      "getDrepVotes",
      "getDrepDelegates",
      "search",
      "getDashboardStats"
    ]);
  }
```

- [ ] **Step 6: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p . 2>&1 | head -40
```

Expected: clean (no errors).

- [ ] **Step 7: Commit**

```bash
git add packages/frontend/src/commons/connector/yaci/yaciConnector.ts
git commit -m "fix(yaci): drop unsupported pool/drep list endpoints; fix governance paths; narrow capabilities"
```

---

## Task 23: Yaci — reduce `getDashboardStats` and `search` to supported subset

**Files:**
- Modify: `packages/frontend/src/commons/connector/yaci/yaciConnector.ts`

- [ ] **Step 1: Implement `getDashboardStats` from real endpoints**

Yaci-store has `/blocks/latest`, `/epochs/latest`, `/epochs/latest/parameters`. Compose dashboard stats from these. Add (or replace if a stub exists) the method:

```ts
  async getDashboardStats(): Promise<ApiReturnType<DashboardStats>> {
    return this.request<DashboardStats>(async () => {
      const [latestBlock, latestEpoch] = await Promise.all([
        this.client.get<BlockDto>(`${this.baseUrl}/blocks/latest`).then((r) => r.data).catch(() => null),
        this.client.get<Epoch>(`${this.baseUrl}/epochs/latest`).then((r) => r.data).catch(() => null)
      ]);
      return {
        currentEpoch: latestEpoch?.number ?? null,
        latestBlockNo: latestBlock?.number ?? null,
        latestBlockHash: latestBlock?.hash ?? null,
        latestBlockTime: latestBlock?.time ? String(latestBlock.time) : null,
        totalSupply: null,            // yaci does not expose
        circulatingSupply: null,      // yaci does not expose
        activeStake: latestEpoch?.activeStake ? Number(latestEpoch.activeStake) : null,
        totalStakePools: null         // yaci has no /pools listing
      };
    });
  }
```

If the existing `DashboardStats` shape (from `@shared/dtos/dashboard.dto`) does not have nullable fields, leave them as `0` or empty strings instead. Run `npx tsc --noEmit` to confirm the shape compiles.

- [ ] **Step 2: Reduce `search` to supported categories**

Edit the existing `search(...)` method to drop probes whose detail endpoints don't exist (epoch lookup, pool lookup, drep lookup, generic token-name search). Specifically:

In the `^\d+$` (pure number) branch, change `Promise.all` to just probe blocks:

```ts
    if (/^\d+$/.test(q)) {
      const n = Number(q);
      const blockResult = await probe(() => this.client.get<BlockDto>(`${this.baseUrl}/blocks/${n}`));
      if (blockResult) results.push({ type: "block", id: q, label: String(n) });
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }
```

In the `^pool1` branch, remove the probe and the result (yaci has no `/pools/{poolId}`):

```ts
    if (/^pool1[a-z0-9]{50,}$/i.test(q)) {
      // Pool detail is not supported by yaci-store; do not return a result.
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }
```

In the `^drep1` branch, remove the probe (no `/governance/dreps/{id}`):

```ts
    if (/^drep1[a-z0-9]+$/i.test(q)) {
      return { data: results, lastUpdated: Date.now(), total: results.length };
    }
```

In the `^[a-zA-Z0-9$.\-_ ]+$` free-text branch, remove the `/assets` listing probe (no such endpoint):

```ts
    return { data: results, lastUpdated: Date.now(), total: results.length };
```

- [ ] **Step 3: Type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p . 2>&1 | head -40
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/commons/connector/yaci/yaciConnector.ts
git commit -m "fix(yaci): reduce search and dashboard stats to yaci-supported endpoints"
```

---

## Task 24: Remove `FunctionEnum`, `getSupportedFunctions()`, related imports

Now that capabilities are wired everywhere, drop the legacy enum.

**Files:**
- Modify: `packages/frontend/src/commons/connector/types/FunctionEnum.ts` (keep `POOL_TYPE`, remove `FunctionEnum`)
- Modify: `packages/frontend/src/commons/connector/ApiConnector.ts`
- Modify: `packages/frontend/src/commons/connector/ConnectorBase.ts`
- Modify: `packages/frontend/src/commons/connector/yaci/yaciConnector.ts`
- Modify: `packages/frontend/src/commons/connector/blockfrost/blockfrostConnector.ts`
- Modify: `packages/frontend/src/commons/connector/gateway/gatewayConnector.ts`

- [ ] **Step 1: Remove `FunctionEnum` from the enum file**

Open `packages/frontend/src/commons/connector/types/FunctionEnum.ts`. Replace its content with:

```ts
export enum POOL_TYPE {
  REGISTRATION = "registration",
  DEREGISTRATION = "deregistration"
}
```

- [ ] **Step 2: Remove `getSupportedFunctions()` from `ApiConnector`**

Delete the line:

```ts
abstract getSupportedFunctions(): FunctionEnum[];
```

and the now-unused import `FunctionEnum`.

- [ ] **Step 3: Remove `getSupportedFunctions()` from `ConnectorBase`**

Delete the override:

```ts
getSupportedFunctions(): FunctionEnum[] {
  return [];
}
```

and the now-unused `FunctionEnum` import.

- [ ] **Step 4: Remove `getSupportedFunctions()` from each concrete connector**

In each of `yaciConnector.ts`, `blockfrostConnector.ts`, `gatewayConnector.ts`:
- Delete the `getSupportedFunctions()` method.
- Delete the `FunctionEnum` import.
- Keep `POOL_TYPE` if it's still imported (used by pool registration logic).

- [ ] **Step 5: Type-check + run all capability tests**

```bash
cd packages/frontend && npx tsc --noEmit -p . && npx jest src/commons/connector/capabilities/
```

Expected: clean compile + all capability tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/commons/connector/types/FunctionEnum.ts packages/frontend/src/commons/connector/ApiConnector.ts packages/frontend/src/commons/connector/ConnectorBase.ts packages/frontend/src/commons/connector/yaci/yaciConnector.ts packages/frontend/src/commons/connector/blockfrost/blockfrostConnector.ts packages/frontend/src/commons/connector/gateway/gatewayConnector.ts
git commit -m "refactor(connector): remove FunctionEnum and getSupportedFunctions() in favor of capabilities"
```

---

## Task 25: Manual verification against a running yaci-store

The earlier tasks verify shapes against the swagger but not against the live API. Do a full end-to-end pass.

- [ ] **Step 1: Set the provider to YACI**

In `.env` at the repo root, ensure:

```
REACT_APP_API_TYPE=YACI
REACT_APP_API_URL=http://192.168.1.4:8080/api/v1
REACT_APP_NETWORK=mainnet
```

If the existing config in the cookie overrides this, clear `phoenix_provider` cookie in the browser or switch via the in-app `ProviderSwitcher`.

- [ ] **Step 2: Start the dev server**

```bash
npm run dev
```

In a browser at http://localhost:5173 (or whatever Vite reports):

- [ ] **Step 3: Verify the sidebar shows the right items**

Expected visible sidebar entries (yaci-store):
- Dashboard
- Blockchain → Blocks, Transactions, Governance Actions
- Protocol Parameters (footer)

Expected hidden entries (gated out):
- Epochs, Native Tokens, Pools, Delegated Representatives

- [ ] **Step 4: Verify gated routes 404**

In the browser address bar, visit each gated route directly and confirm the NotFound page appears:
- `/tokens`, `/pools`, `/dreps`, `/epoch`

Expected: NotFound for all four.

- [ ] **Step 5: Verify supported routes load real data**

Click through:
- Dashboard — DashboardStats card visible (with partial data), Block Chain Visualizer shows blocks
- Blocks list — paginates correctly
- Block detail (click a block) — fields populated
- Transactions list — paginates
- Transaction detail (click a tx) — UTXOs, metadata, withdrawals visible
- Governance Actions list — at least loads (may be empty on a fresh devnet)

Expected: no console errors, no empty fields where data should exist.

- [ ] **Step 6: Verify provider switch refreshes the sidebar**

Open `ProviderSwitcher` (in the header), change to `GATEWAY`. The sidebar should immediately re-render to include Epochs, Tokens, Pools, DReps. Switch back to YACI; entries disappear again.

- [ ] **Step 7: Sanity-check the dev-mode warning**

Open the browser devtools console. Expect zero `[capabilities]` warnings during normal page navigation. If you see one (e.g. "declared but not overridden"), fix the declared/overridden mismatch in the relevant connector and re-test.

- [ ] **Step 8: No commit step (manual verification only)**

If you found issues, fix them in a small follow-up commit before proceeding.

---

## Task 26: Final type-check + test pass + PR-ready commit hygiene

- [ ] **Step 1: Run full type-check**

```bash
cd packages/frontend && npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 2: Run all capability + connector tests**

```bash
cd packages/frontend && npx jest src/commons/connector/
```

Expected: all pass.

- [ ] **Step 3: Run the entire frontend test suite**

```bash
cd packages/frontend && npx jest
```

Expected: all pass (or, no new failures vs. main).

- [ ] **Step 4: Verify the diff is clean**

```bash
git status -s
git log --oneline main..HEAD
```

Expected: no stray uncommitted files; commit history is well-scoped per task.

- [ ] **Step 5: Push (only if user approves)**

Confirm with the user before pushing. The branch is `fix/yaci-store-direct`.

---

## Self-Review

Spec coverage check:

| Spec section | Plan task(s) |
|---|---|
| Capability type + compile-time guard | Tasks 1, 2 |
| `ApiConnector.getCapabilities()` + helpers | Tasks 2, 3 |
| Per-connector capability declarations | Tasks 4, 5, 6, 22 (narrow) |
| `requireCapability` route gating | Tasks 7, 12 |
| Sidebar gating with `buildMenus` + `useMenus` | Tasks 8, 13, 14 |
| In-page gating via `useCapability` | Tasks 9, 16 |
| Search filtering | Tasks 10, 15 |
| Dev-mode drift check | Task 11 |
| Yaci endpoints fixed per swagger | Tasks 17, 18, 19, 20, 21, 22, 23 |
| Yaci unsupported methods dropped | Tasks 18, 20, 21, 22 |
| Yaci types regenerated from swagger | Task 17 |
| `FunctionEnum` removed | Task 24 |
| Manual end-to-end verification | Task 25 |
| Final type + test sweep | Task 26 |

Type-name consistency check: `Capability`, `CapabilityPredicate`, `MenuItem`, `requireCapability`, `useCapability`, `buildMenus`, `buildFooterMenus`, `useMenus`, `useFooterMenus`, `filterMenusByCapabilities`, `filterSearchResultsByCapabilities`, `verifyCapabilityImplementations` — all used consistently across tasks.

Placeholder scan: no `TBD`/`TODO`/`implement later`. Where Task 15 has flexibility ("locate the search consumer"), the step is "do the grep, apply this two-line pattern" — fully specified, no guesswork.

Out-of-scope confirmations:
- Plugin capability gating (`PhoenixPlugin.manifest.requiresCapabilities`) — intentionally deferred per spec.
- No revisit of Gateway/Blockfrost connector method-by-method capabilities — 1:1 conversion from `FunctionEnum` is the explicit scope.
