import { mapStakePoolsToOverviews, mapStakePoolToDetail, poolSaturation } from "./pools";
import { OgmiosStakePools } from "../types";
import pools from "../__fixtures__/stakePools.sample.json";

const CTX = { totalActiveStake: 21_800_000_000_000_000, nOpt: 500 };

describe("pool mappers", () => {
  const list = mapStakePoolsToOverviews(pools as unknown as OgmiosStakePools, CTX);
  const [id, raw] = Object.entries(pools as Record<string, any>)[0];

  it("produces one overview per pool with stake + pledge", () => {
    expect(list).toHaveLength(Object.keys(pools).length);
    const o = list.find((p) => p.poolId === id)!;
    expect(o.poolSize).toBe(raw.stake.ada.lovelace);
    expect(o.declaredPledge).toBe(raw.pledge.ada.lovelace);
    expect(o.saturation).toBeCloseTo(poolSaturation(raw.stake.ada.lovelace, CTX.totalActiveStake, CTX.nOpt));
  });

  it("maps detail with parsed margin + owners/relays", () => {
    const d = mapStakePoolToDetail(raw, CTX);
    expect(d.poolView).toBe(id);
    expect(d.pledge).toBe(raw.pledge.ada.lovelace);
    expect(d.cost).toBe(raw.cost.ada.lovelace);
    expect(d.margin).toBeCloseTo(Number(raw.margin.split("/")[0]) / Number(raw.margin.split("/")[1]));
    expect(d.ownerAccounts).toEqual(raw.owners ?? []);
  });
});
