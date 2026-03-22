# Phoenix Explorer — Plugin Development Guide

Plugins let you add custom visualizations and tools to Phoenix Explorer without modifying the core codebase. They are React components that receive blockchain data from the current page and render into predefined **slots**.

---

## Architecture Overview

```
App.tsx
  └── registerAllPlugins()          ← calls pluginRegistry.register() for every bundled plugin
        └── PluginRegistry           ← singleton, tracks enabled/disabled state in localStorage
              └── PluginSlotRenderer  ← placed in detail pages; renders all enabled plugins for a slot
```

Plugins are **statically bundled** — they are imported and registered at build time. This keeps things type-safe and simple. Runtime dynamic loading is not supported.

---

## PhoenixPlugin Interface

```typescript
interface PhoenixPlugin {
  manifest: PluginManifest;
  Component: React.ComponentType<{ context: PluginContext }>;
  onLoad?: () => Promise<void>;    // called once at startup
  onUnload?: () => void;           // called when plugin is unregistered
}

interface PluginManifest {
  id: string;          // unique identifier, e.g. "my-plugin"
  name: string;        // display name shown in Plugin Manager
  version: string;     // semver, e.g. "1.0.0"
  description: string;
  author: string;
  slots: PluginSlot[]; // which UI slots to render in
  metadataLabels?: number[];  // CIP metadata labels handled (e.g. 721 for CIP-25)
}

interface PluginContext {
  data: unknown;           // entity data for the current page
  network: string;         // "mainnet" | "preprod" | "preview"
  apiConnector: ApiConnector; // for additional data fetching
}
```

---

## Available Slots

| Slot name | Page | `context.data` type |
|---|---|---|
| `transaction-detail` | `/transaction/:hash` | `TransactionDetail \| null` |
| `block-detail` | `/block/:blockId` | `Block \| null` |
| `address-detail` | `/address/:address` | `AddressDetail \| null` |
| `token-detail` | `/token/:tokenId` | `ITokenOverview \| null` |
| `governance-detail` | `/governance-action/:hash/:index` | `null` (use `apiConnector`) |
| `drep-detail` | `/drep/:drepId` | `Drep \| null` |
| `pool-detail` | `/pool/:poolId` | `PoolDetail \| null` |
| `home-dashboard` | `/` | `null` |
| `global-sidebar` | All pages (reserved) | `null` |

Type imports: `packages/shared/src/dtos/`

---

## Step-by-Step: Creating a Plugin

### 1. Create the plugin directory

```
packages/frontend/src/plugins/samples/my-plugin/
  index.ts          ← PhoenixPlugin export
  MyComponent.tsx   ← React component
```

### 2. Write the component

```tsx
// MyComponent.tsx
import React from "react";
import { Box, Typography } from "@mui/material";
import { PluginContext } from "../../types";
import { TransactionDetail } from "@shared/dtos/transaction.dto";

const MyComponent: React.FC<{ context: PluginContext }> = ({ context }) => {
  const tx = context.data as TransactionDetail | null;
  if (!tx) return null;

  return (
    <Box>
      <Typography variant="h6">My Plugin</Typography>
      <Typography>Fee: {tx.fee}</Typography>
    </Box>
  );
};

export default MyComponent;
```

### 3. Write the plugin manifest

```typescript
// index.ts
import { PhoenixPlugin } from "../../types";
import MyComponent from "./MyComponent";

export const myPlugin: PhoenixPlugin = {
  manifest: {
    id: "my-plugin",
    name: "My Plugin",
    version: "1.0.0",
    description: "Shows extra transaction info.",
    author: "Your Name",
    slots: [{ slot: "transaction-detail" }]
  },
  Component: MyComponent
};
```

### 4. Register the plugin

Open `packages/frontend/src/plugins/registerPlugins.ts` and add:

```typescript
import { myPlugin } from "./samples/my-plugin";

export function registerAllPlugins(): void {
  pluginRegistry.register(cip25NftViewerPlugin);
  pluginRegistry.register(myPlugin);   // ← add this line
}
```

### 5. Rebuild

```bash
npm run build --workspace frontend
```

Your plugin now appears in the Plugin Manager at `/plugins` and renders in the slot you specified.

---

## Sample Plugin: CIP-25 NFT Viewer

Located at `packages/frontend/src/plugins/samples/cip25-nft-viewer/`.

**What it does:** When viewing a transaction that contains CIP-25 metadata (label 721), it renders NFT images (IPFS), names, descriptions, and attributes in a card grid.

**How it detects CIP-25:** Checks `context.data.metadata["721"]` or `context.data.metadata[721]` for the nested policy → asset → properties structure defined by CIP-25.

**Key patterns used:**
- Cast `context.data` to `TransactionDetail` (from `@shared/dtos/transaction.dto`)
- Resolve `ipfs://` URIs via `https://ipfs.io/ipfs/` gateway
- Use MUI `Card`, `CardMedia`, `Chip` to match explorer theme

---

## Testing Plugins Locally

1. Start the dev server: `npm run dev --workspace frontend`
2. Navigate to a transaction with CIP-25 metadata to see the NFT viewer plugin
3. Navigate to `/plugins` to enable/disable plugins
4. Plugin enabled/disabled state persists in `localStorage` under key `phoenix_plugin_enabled_state`

---

## Tips

- **Return `null` early** if the context data doesn't apply to your plugin (e.g. no matching metadata)
- **Use MUI components** (`Box`, `Typography`, `Card`, etc.) to match the explorer's theme and dark mode
- **Access `context.apiConnector`** for additional API calls (e.g. fetch extra token data from within a transaction plugin)
- **Keep plugins focused** — one plugin, one purpose
