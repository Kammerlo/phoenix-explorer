# Plugin Contribution Guide

Phoenix Explorer has a build-time plugin system that lets you inject custom React components into named slots on any explorer page. Plugins are written in TypeScript, bundled with the rest of the frontend, and registered at startup — there is no dynamic loading or separate build step.

---

## Architecture Overview

- **Build-time bundled.** Plugins live inside the frontend package and are compiled with Vite alongside the rest of the application. There is no plugin marketplace or runtime plugin loader.
- **TypeScript + React.** Every plugin exposes a typed manifest and a React component. The component receives a `PluginContext` prop that carries the page data, the current network, and an `ApiConnector` instance for additional API calls.
- **Slot-based rendering.** The explorer renders each registered plugin whose declared slot matches the current page. Multiple plugins may occupy the same slot; they are rendered in registration order.

---

## The `PhoenixPlugin` Interface

All types are defined in `packages/frontend/src/plugins/types.ts`.

```ts
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

export interface PluginManifest {
  id: string;           // Unique kebab-case identifier, e.g. "my-custom-plugin"
  name: string;         // Human-readable display name
  version: string;      // Semver string, e.g. "1.0.0"
  description: string;
  author: string;
  slots: PluginSlot[];  // One entry per slot the plugin renders into
  /** Optional: metadata labels this plugin can decode (e.g. 721 = CIP-25, 20 = CIP-20) */
  metadataLabels?: number[];
}

export interface PluginContext {
  /** The entity data for the current page (transaction, address, etc.) */
  data: unknown;
  /** The current network ("mainnet", "preprod", "preview") */
  network: string;
  /** API connector for fetching additional data */
  apiConnector: ApiConnector;
}

export interface PhoenixPlugin {
  manifest: PluginManifest;
  Component: React.ComponentType<{ context: PluginContext }>;
  /** Optional: called once when the plugin is loaded */
  onLoad?: () => Promise<void>;
  /** Optional: called when the plugin is unloaded */
  onUnload?: () => void;
}
```

---

## Available Slots and `context.data` Shapes

| Slot name | Page | `context.data` type |
|---|---|---|
| `transaction-detail` | Transaction detail page | `TransactionDetail` (see `@shared/dtos/transaction.dto`) — includes `metadata`, `inputs`, `outputs`, `certificates`, etc. |
| `address-detail` | Address detail page | `AddressDetail` (see `@shared/dtos/address.dto`) — includes `address`, `balance`, `transactions`, stake info, etc. |
| `token-detail` | Token / asset detail page | `ITokenOverview` (see `@shared/dtos/token.dto`) — includes `name`, `policy`, `supply`, `metadata`, etc. |
| `block-detail` | Block detail page | `Block` (see `@shared/dtos/block.dto`) — includes `hash`, `slot`, `epoch`, `txCount`, etc. |
| `governance-detail` | Governance action detail page | `GovernanceActionDetail` (see `@shared/dtos/GovernanceOverview`) |
| `drep-detail` | DRep detail page | `Drep` (see `@shared/dtos/drep.dto`) |
| `pool-detail` | Stake pool detail page | `PoolDetail` (see `@shared/dtos/pool.dto`) |
| `home-dashboard` | Home / overview page | `null` — no entity data; use `apiConnector` for any data you need |
| `global-sidebar` | Persistent sidebar (all pages) | `null` — rendered regardless of current page |

> Always guard against `null` and `undefined`. The explorer may pass `null` while data is still loading, or for pages where no entity has been resolved yet.

---

## Step-by-Step: Creating a New Plugin

### 1. Create the plugin directory

Create a new directory under the samples folder (or directly in the plugins folder for production plugins):

```
packages/frontend/src/plugins/samples/my-plugin/
```

### 2. Write the React component

Create `MyPlugin.tsx` in that directory:

```tsx
import React from "react";
import { Box, Typography } from "@mui/material";
import { PluginContext } from "../../types";

const MyPlugin: React.FC<{ context: PluginContext }> = ({ context }) => {
  const data = context.data as Record<string, unknown> | null;

  // Always handle loading / null state gracefully
  if (!data) return null;

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" mb={1}>
        My Plugin
      </Typography>
      <Typography variant="body2">
        Network: {context.network}
      </Typography>
    </Box>
  );
};

export default MyPlugin;
```

### 3. Create the manifest and export

Create `index.ts` in the same directory:

```ts
import { PhoenixPlugin } from "../../types";
import MyPlugin from "./MyPlugin";

export const myPlugin: PhoenixPlugin = {
  manifest: {
    id: "my-plugin",
    name: "My Plugin",
    version: "1.0.0",
    description: "A short description of what this plugin does.",
    author: "Your Name",
    slots: [{ slot: "transaction-detail" }],
  },
  Component: MyPlugin,
};
```

If your plugin handles specific metadata labels, declare them so the explorer can surface that information:

```ts
metadataLabels: [721, 20],
```

### 4. Register the plugin

Open `packages/frontend/src/plugins/registerPlugins.ts` and add your plugin:

```ts
import { pluginRegistry } from "./PluginRegistry";
import { cip25NftViewerPlugin } from "./samples/cip25-nft-viewer";
import { myPlugin } from "./samples/my-plugin";  // add this

export function registerAllPlugins(): void {
  pluginRegistry.register(cip25NftViewerPlugin);
  pluginRegistry.register(myPlugin);  // add this
}
```

That is all that is required. The next `npm run dev` or `npm run build` will include your plugin.

---

## File Structure Convention

```
packages/frontend/src/plugins/
  types.ts                          # PhoenixPlugin, PluginContext, PluginManifest interfaces
  PluginRegistry.ts                 # Registry that stores and looks up plugins
  registerPlugins.ts                # Entry point — register all plugins here
  samples/
    cip25-nft-viewer/
      index.ts                      # Manifest + export
      CIP25Viewer.tsx               # React component
    my-plugin/
      index.ts
      MyPlugin.tsx
      helpers.ts                    # Optional: utility functions specific to this plugin
```

Naming rules:
- Directory name: kebab-case, matches the `manifest.id` field.
- Component file: PascalCase `.tsx`.
- Manifest / export file: `index.ts`.
- Exported plugin constant: camelCase with `Plugin` suffix (e.g. `myPlugin`, `cip25NftViewerPlugin`).

---

## Testing Locally

1. Start the full dev server from the monorepo root:

   ```bash
   npm run dev
   ```

   This runs the backend (port 3000 by default) and the frontend (port configurable in `.env`) concurrently.

2. Navigate to the page that corresponds to the slot your plugin targets — for example, open any transaction detail page to test a `transaction-detail` plugin.

3. Your plugin renders below the standard page content. If `context.data` is `null` and you return `null`, nothing will appear — check the browser console for errors.

4. Use React DevTools to inspect the `context` prop being passed to your component.

---

## Tips

### Use MUI components to match the explorer theme

The frontend uses MUI v6. Import from `@mui/material` to inherit the explorer's colour palette, typography, and spacing automatically:

```tsx
import { Box, Card, Chip, Divider, Grid, Typography } from "@mui/material";
```

Useful patterns observed in existing plugins:

- Wrap content in `<Box>` and open with a `<Typography variant="h6" fontWeight="bold" mb={1}>` heading.
- Use `<Divider sx={{ mb: 2 }} />` below the heading to match the visual style of other sections.
- Use `<Card variant="outlined" sx={{ borderRadius: 2, p: 1.5 }}>` for individual item cards.
- Use `<Chip size="small" variant="outlined">` for attribute tags.

### Handle null / undefined data gracefully

The `context.data` field is typed as `unknown`. Always cast it defensively and check for null before rendering:

```tsx
const data = context.data as Record<string, unknown> | null;
if (!data) return null;
```

Return `null` (render nothing) when there is nothing useful to show — for example, when a transaction contains no metadata your plugin cares about. This avoids empty card headers appearing on every page.

### Accessing additional data via `apiConnector`

`context.apiConnector` is a fully initialised `ApiConnector` instance. You can call any of its abstract methods (e.g. `getTxDetail`, `getTokenDetail`) inside a `useEffect` or `useMemo` hook to fetch supplementary data. The connector automatically targets the currently configured provider (GATEWAY, YACI, or BLOCKFROST).

### Declare `metadataLabels` for metadata-aware plugins

If your plugin decodes on-chain metadata (e.g. CIP-25 at label 721, CIP-20 at label 20), populate the `metadataLabels` array in your manifest. This is informational today but will be used by future tooling to filter transactions and surface relevant plugins proactively.

---

## Reference Implementation

The CIP-25 NFT Viewer is the canonical sample plugin. Study these files:

- `packages/frontend/src/plugins/samples/cip25-nft-viewer/index.ts` — manifest definition
- `packages/frontend/src/plugins/samples/cip25-nft-viewer/CIP25Viewer.tsx` — component implementation

Key patterns it demonstrates:
- Casting and safely navigating `context.data` to extract `metadata`/`txMetadata`
- Using `useMemo` to keep parsing logic out of the render path
- Returning `null` early when no relevant data is present
- Resolving `ipfs://` URIs to HTTP gateway URLs
- Using MUI `Grid`, `Card`, `CardMedia`, `Chip`, and `Typography` for a themed layout
