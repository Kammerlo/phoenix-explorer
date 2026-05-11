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
