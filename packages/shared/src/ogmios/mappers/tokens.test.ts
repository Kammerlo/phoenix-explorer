import { mapKupoMatchesToHolders } from "./tokens";
import { KupoMatch } from "../types";

const UNIT = "a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59";
const M = (address: string, qty: number): KupoMatch => ({
  transaction_index: 0, transaction_id: "t", output_index: 0, address,
  value: { coins: 1000000, assets: { [UNIT]: qty } },
  created_at: { slot_no: 1, header_hash: "h" }, spent_at: null
});

describe("mapKupoMatchesToHolders", () => {
  const holders = mapKupoMatchesToHolders([M("addrA", 100), M("addrB", 300), M("addrA", 50)], UNIT);
  it("aggregates quantity per address", () => {
    expect(holders.find((h) => h.address === "addrA")?.amount).toBe(150);
    expect(holders.find((h) => h.address === "addrB")?.amount).toBe(300);
  });
  it("computes ratio against total", () => {
    const a = holders.find((h) => h.address === "addrA")!;
    expect(a.ratio).toBeCloseTo(150 / 450);
  });
  it("sorts holders by amount desc", () => {
    expect(holders[0].address).toBe("addrB");
  });
});
