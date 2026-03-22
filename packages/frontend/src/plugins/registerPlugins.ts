import { pluginRegistry } from "./PluginRegistry";
import { cip25NftViewerPlugin } from "./samples/cip25-nft-viewer";
import { cfReeveViewerPlugin } from "./samples/cf-reeve-viewer";

export function registerAllPlugins(): void {
  pluginRegistry.register(cip25NftViewerPlugin);
  pluginRegistry.register(cfReeveViewerPlugin);
  // Add new plugins here
}
