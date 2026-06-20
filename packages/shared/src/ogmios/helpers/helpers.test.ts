import { parseRatio } from "./parseRatio";
import { slotToUnixTime, epochBounds, epochProgressPercent } from "./era";
import { flattenValue } from "./value";
import { OgmiosEraSummary, OgmiosValue } from "../types";

// Real mainnet eraSummaries prefix (Byron 20s/epoch=21600, then Shelley+ 1s/epoch=432000).
const ERAS: OgmiosEraSummary[] = [
  { start: { time: { seconds: 0 }, slot: 0, epoch: 0 }, end: { time: { seconds: 89856000 }, slot: 4492800, epoch: 208 }, parameters: { epochLength: 21600, slotLength: { milliseconds: 20000 } } },
  { start: { time: { seconds: 89856000 }, slot: 4492800, epoch: 208 }, end: null, parameters: { epochLength: 432000, slotLength: { milliseconds: 1000 } } }
];

describe("parseRatio", () => {
  it("parses n/m strings to decimals", () => {
    expect(parseRatio("3/10")).toBeCloseTo(0.3);
    expect(parseRatio("1/5")).toBeCloseTo(0.2);
    expect(parseRatio("3/1000")).toBeCloseTo(0.003);
    expect(parseRatio("1/100")).toBeCloseTo(0.01);
  });
  it("passes through plain numbers and falls back on garbage", () => {
    expect(parseRatio(0.25)).toBe(0.25);
    expect(parseRatio("0.5")).toBeCloseTo(0.5);
    expect(parseRatio("oops", 7)).toBe(7);
  });
});

describe("era/time math", () => {
  it("converts a Shelley-era slot to unix time", () => {
    // Shelley start: slot 4492800 at t=89856000. One slot = 1s.
    expect(slotToUnixTime(4492800, ERAS)).toBe(89856000);
    expect(slotToUnixTime(4492800 + 100, ERAS)).toBe(89856000 + 100);
  });
  it("computes epoch bounds in the Shelley+ era", () => {
    // epoch 208 is the first Shelley epoch: firstSlot=4492800, length 432000, start t=89856000.
    const b = epochBounds(208, ERAS);
    expect(b.firstSlot).toBe(4492800);
    expect(b.startTime).toBe(89856000);
    expect(b.endTime).toBe(89856000 + 432000);
    expect(b.epochLength).toBe(432000);
  });
  it("computes progress percent within an epoch", () => {
    expect(epochProgressPercent(4492800 + 216000, { firstSlot: 4492800, epochLength: 432000 })).toBe(50);
    expect(epochProgressPercent(4492800, { firstSlot: 4492800, epochLength: 432000 })).toBe(0);
    expect(epochProgressPercent(99999999, { firstSlot: 4492800, epochLength: 432000 })).toBe(100);
  });
  it("converts a Byron-era slot to unix time", () => {
    // Byron: slot 0 at t=0, 20s slots. Slot 21600 -> 21600 * 20 = 432000s.
    expect(slotToUnixTime(21600, ERAS)).toBe(432000);
  });
  it("throws on empty eraSummaries", () => {
    expect(() => slotToUnixTime(0, [])).toThrow(/empty/);
  });
  it("returns 0 progress when epochLength is 0", () => {
    expect(epochProgressPercent(100, { firstSlot: 0, epochLength: 0 })).toBe(0);
  });
});

describe("flattenValue", () => {
  it("splits lovelace from multi-asset entries", () => {
    const v: OgmiosValue = {
      ada: { lovelace: 1051640 },
      "1897c6078c5e8cf339e0c3a54cdbc6e3e0000000000000000000000": { "534e454b": 42 }
    } as OgmiosValue;
    const out = flattenValue(v);
    expect(out.lovelace).toBe(1051640);
    expect(out.assets).toEqual([
      { unit: "1897c6078c5e8cf339e0c3a54cdbc6e3e0000000000000000000000534e454b", policyId: "1897c6078c5e8cf339e0c3a54cdbc6e3e0000000000000000000000", assetName: "534e454b", quantity: 42 }
    ]);
  });
});
