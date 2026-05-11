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
