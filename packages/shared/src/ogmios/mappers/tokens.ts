import { KupoMatch } from "../types";
import { TokenHolder } from "../../dtos/token.dto";

export function mapKupoMatchesToHolders(matches: KupoMatch[], unit: string): TokenHolder[] {
  const byAddr = new Map<string, number>();
  let total = 0;
  for (const m of matches) {
    const qty = m.value.assets?.[unit] ?? 0;
    if (qty <= 0) continue;
    byAddr.set(m.address, (byAddr.get(m.address) ?? 0) + qty);
    total += qty;
  }
  return [...byAddr.entries()]
    .map(([address, amount]) => ({ address, amount, ratio: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}
