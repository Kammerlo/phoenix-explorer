import { mapDashboardStats, MAX_LOVELACE_SUPPLY } from "./dashboard";
import { OgmiosEraSummary } from "../types";

const ERAS: OgmiosEraSummary[] = [
  { start: { time: { seconds: 0 }, slot: 0, epoch: 0 }, end: { time: { seconds: 89856000 }, slot: 4492800, epoch: 208 }, parameters: { epochLength: 21600, slotLength: { milliseconds: 20000 } } },
  { start: { time: { seconds: 89856000 }, slot: 4492800, epoch: 208 }, end: null, parameters: { epochLength: 432000, slotLength: { milliseconds: 1000 } } }
];

describe("mapDashboardStats", () => {
  const stats = mapDashboardStats({
    blockHeight: 13573662,
    tip: { slot: 4492800 + 216000, id: "aa8cd0" },
    epoch: 208,
    eras: ERAS,
    treasuryAndReserves: { treasury: { ada: { lovelace: 1490365078517845 } }, reserves: { ada: { lovelace: 6297113692543296 } } },
    liveStake: 21800000000000000
  });

  it("uses block height and tip for the latest block", () => {
    expect(stats.latestBlock.height).toBe(13573662);
    expect(stats.latestBlock.hash).toBe("aa8cd0");
    expect(stats.latestBlock.slot).toBe(4492800 + 216000);
    expect(stats.latestBlock.txCount).toBe(0); // not observable
  });

  it("derives supply from treasury + reserves", () => {
    expect(stats.supply.max).toBe(String(MAX_LOVELACE_SUPPLY));
    expect(stats.supply.total).toBe(String(MAX_LOVELACE_SUPPLY - 6297113692543296));
    expect(stats.supply.circulating).toBe(String(MAX_LOVELACE_SUPPLY - 6297113692543296 - 1490365078517845));
  });

  it("reports current epoch + progress", () => {
    expect(stats.currentEpoch.no).toBe(208);
    expect(stats.currentEpoch.progressPercent).toBe(50);
  });
});
