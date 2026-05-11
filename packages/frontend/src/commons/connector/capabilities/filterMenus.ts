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
