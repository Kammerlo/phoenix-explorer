import { OgmiosValue } from "../types";

export function flattenValue(value: OgmiosValue): {
  lovelace: number;
  assets: Array<{ unit: string; policyId: string; assetName: string; quantity: number }>;
} {
  const lovelace = value.ada?.lovelace ?? 0;
  const assets: Array<{ unit: string; policyId: string; assetName: string; quantity: number }> = [];
  for (const [policyId, inner] of Object.entries(value)) {
    if (policyId === "ada") continue;
    for (const [assetName, quantity] of Object.entries(inner as Record<string, number>)) {
      assets.push({ unit: `${policyId}${assetName}`, policyId, assetName, quantity: Number(quantity) });
    }
  }
  return { lovelace, assets };
}
