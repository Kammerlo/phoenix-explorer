import { useState, useCallback } from "react";
import { pluginRegistry } from "./PluginRegistry";
import { PhoenixPlugin, PluginSlotName } from "./types";

export function usePlugins(slot: PluginSlotName, excludeMetadataPlugins = false): PhoenixPlugin[] {
  return pluginRegistry.getPluginsForSlot(slot, excludeMetadataPlugins);
}

export function usePluginManager() {
  const [, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const toggle = useCallback(
    (pluginId: string, enabled: boolean) => {
      pluginRegistry.setEnabled(pluginId, enabled);
      refresh();
    },
    [refresh]
  );

  return {
    plugins: pluginRegistry.getAllPlugins(),
    isEnabled: (pluginId: string) => pluginRegistry.isEnabled(pluginId),
    toggle
  };
}
