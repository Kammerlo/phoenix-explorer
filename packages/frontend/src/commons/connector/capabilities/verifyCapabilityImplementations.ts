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
  const basePrototype = ConnectorBase.prototype as unknown as Record<string, unknown>;
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
