import { OgmiosClient, KupoClient } from "@shared/ogmios/client";
import { OgmiosBackends } from "@shared/ogmios/services";
import { ENV } from "./env";

const fetchImpl = (globalThis as unknown as { fetch: never }).fetch;

export const IS_OGMIOS_ACTIVE = !!ENV.OGMIOS_URL;

export const OGMIOS: OgmiosClient | null = ENV.OGMIOS_URL
  ? new OgmiosClient(ENV.OGMIOS_URL, { fetchImpl })
  : null;

export const KUPO: KupoClient | null = ENV.KUPO_URL
  ? new KupoClient(ENV.KUPO_URL, { fetchImpl })
  : null;

export function ogmiosBackends(): OgmiosBackends {
  if (!OGMIOS) throw new Error("Ogmios not configured");
  return { ogmios: OGMIOS, kupo: KUPO ?? undefined };
}

if (IS_OGMIOS_ACTIVE) {
  console.log(`[gateway] Ogmios mode ACTIVE — Ogmios=${ENV.OGMIOS_URL} Kupo=${ENV.KUPO_URL ?? "(unset)"}`);
}
