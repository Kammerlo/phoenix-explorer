import React from "react";
import { ReeveRoot } from "./types";

/**
 * A renderer for one Reeve `type`. New Reeve types are supported by writing a
 * component and calling `registerReeveType` — no changes to the orchestrator.
 */
export interface ReeveTypeRenderer {
  /** The on-chain `type` value, e.g. "REPORT" or "INDIVIDUAL_TRANSACTIONS". */
  type: string;
  /** Human-friendly label shown in the type chip; defaults to a humanized `type`. */
  label?: string;
  Component: React.ComponentType<{ root: ReeveRoot }>;
}

const renderers = new Map<string, ReeveTypeRenderer>();

const key = (type: string) => type.trim().toUpperCase();

export function registerReeveType(renderer: ReeveTypeRenderer): void {
  renderers.set(key(renderer.type), renderer);
}

export function getReeveRenderer(type?: string | null): ReeveTypeRenderer | undefined {
  if (!type) return undefined;
  return renderers.get(key(type));
}

/** Canonical (upper-cased) keys of all registered types. */
export function getRegisteredReeveTypes(): string[] {
  return Array.from(renderers.keys());
}
