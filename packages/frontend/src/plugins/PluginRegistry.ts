import { PhoenixPlugin, PluginSlotName } from "./types";

const STORAGE_KEY = "phoenix_plugin_enabled_state";

class PluginRegistry {
  private plugins: Map<string, PhoenixPlugin> = new Map();
  private enabledState: Map<string, boolean> = new Map();

  constructor() {
    this.loadEnabledState();
  }

  private loadEnabledState(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Record<string, boolean> = JSON.parse(stored);
        Object.entries(parsed).forEach(([id, enabled]) => {
          this.enabledState.set(id, enabled);
        });
      }
    } catch {
      // ignore parse errors
    }
  }

  private persistEnabledState(): void {
    const obj: Record<string, boolean> = {};
    this.enabledState.forEach((enabled, id) => {
      obj[id] = enabled;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  register(plugin: PhoenixPlugin): void {
    this.plugins.set(plugin.manifest.id, plugin);
    // Default to enabled if no stored preference
    if (!this.enabledState.has(plugin.manifest.id)) {
      this.enabledState.set(plugin.manifest.id, true);
    }
    plugin.onLoad?.();
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    plugin?.onUnload?.();
    this.plugins.delete(pluginId);
  }

  getPluginsForSlot(slot: PluginSlotName, excludeMetadataPlugins = false): PhoenixPlugin[] {
    return Array.from(this.plugins.values()).filter(
      (p) =>
        this.isEnabled(p.manifest.id) &&
        p.manifest.slots.some((s) => s.slot === slot) &&
        (!excludeMetadataPlugins || !p.manifest.metadataLabels?.length)
    );
  }

  getPluginsForMetadataLabel(label: number): PhoenixPlugin[] {
    return Array.from(this.plugins.values()).filter(
      (p) => this.isEnabled(p.manifest.id) && p.manifest.metadataLabels?.includes(label)
    );
  }

  getAllPlugins(): PhoenixPlugin[] {
    return Array.from(this.plugins.values());
  }

  isEnabled(pluginId: string): boolean {
    return this.enabledState.get(pluginId) ?? true;
  }

  setEnabled(pluginId: string, enabled: boolean): void {
    this.enabledState.set(pluginId, enabled);
    this.persistEnabledState();
  }
}

export const pluginRegistry = new PluginRegistry();
