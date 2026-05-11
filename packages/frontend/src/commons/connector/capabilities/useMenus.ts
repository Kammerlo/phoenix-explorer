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
