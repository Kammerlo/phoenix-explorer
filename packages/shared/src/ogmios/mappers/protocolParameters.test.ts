import { mapProtocolParameters } from "./protocolParameters";
import { OgmiosProtocolParameters } from "../types";
import raw from "../__fixtures__/protocolParameters.json";

describe("mapProtocolParameters", () => {
  const p = mapProtocolParameters(raw as unknown as OgmiosProtocolParameters);

  it("maps nested lovelace + byte fields", () => {
    expect(p.minFeeA).toBe((raw as any).minFeeCoefficient);
    expect(p.minFeeB).toBe((raw as any).minFeeConstant.ada.lovelace);
    expect(p.maxBlockSize).toBe((raw as any).maxBlockBodySize.bytes);
    expect(p.keyDeposit).toBe((raw as any).stakeCredentialDeposit.ada.lovelace);
    expect(p.poolDeposit).toBe((raw as any).stakePoolDeposit.ada.lovelace);
    expect(p.coinsPerUTxOByte).toBe((raw as any).minUtxoDepositCoefficient);
  });

  it("parses ratio strings to decimals", () => {
    expect(p.a0).toBeCloseTo(parseFloatRatio((raw as any).stakePoolPledgeInfluence));
    expect(p.rho).toBeCloseTo(parseFloatRatio((raw as any).monetaryExpansion));
    expect(p.tau).toBeCloseTo(parseFloatRatio((raw as any).treasuryExpansion));
  });

  it("maps governance + version fields", () => {
    expect(p.protocolMajor).toBe((raw as any).version.major);
    expect(p.nOpt).toBe((raw as any).desiredNumberOfStakePools);
    expect(p.govActionDeposit).toBe((raw as any).governanceActionDeposit.ada.lovelace);
    expect(p.drepDeposit).toBe((raw as any).delegateRepresentativeDeposit.ada.lovelace);
    expect(p.ccMinSize).toBe((raw as any).constitutionalCommitteeMinSize);
  });

  it("serialises cost models to a JSON string", () => {
    expect(typeof p.costModels).toBe("string");
    expect(JSON.parse(p.costModels)).toEqual((raw as any).plutusCostModels ?? {});
  });
});

function parseFloatRatio(s: string): number {
  const [a, b] = s.split("/").map(Number);
  return b ? a / b : a;
}
