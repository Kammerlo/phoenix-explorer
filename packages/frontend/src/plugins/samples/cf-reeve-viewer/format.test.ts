import { cleanCurrencyCode, formatReportAmount, formatFxRate } from "./format";

describe("cleanCurrencyCode", () => {
  it("strips the ISO_4217 prefix", () => {
    expect(cleanCurrencyCode("ISO_4217:CHF")).toBe("CHF");
    expect(cleanCurrencyCode("ISO_4217:USD")).toBe("USD");
  });

  it("takes the symbolic code from a multi-segment token identifier", () => {
    expect(cleanCurrencyCode("ISO_24165:ADA:HWGL1C2CK")).toBe("ADA");
  });

  it("returns a bare code unchanged", () => {
    expect(cleanCurrencyCode("CHF")).toBe("CHF");
  });

  it("handles empty / nullish input", () => {
    expect(cleanCurrencyCode("")).toBe("");
    expect(cleanCurrencyCode(undefined)).toBe("");
    expect(cleanCurrencyCode(null)).toBe("");
  });
});

describe("formatReportAmount", () => {
  it("formats with thousands separators and 2 decimals", () => {
    expect(formatReportAmount(27614789.72)).toBe("27,614,789.72");
    expect(formatReportAmount(1127.52)).toBe("1,127.52");
    expect(formatReportAmount(50000)).toBe("50,000.00");
  });

  it("accepts numeric strings", () => {
    expect(formatReportAmount("30760.41")).toBe("30,760.41");
  });

  it("formats negatives", () => {
    expect(formatReportAmount(-269500.6)).toBe("-269,500.60");
  });

  it("preserves precision for large values without float error", () => {
    expect(formatReportAmount(118520053.95)).toBe("118,520,053.95");
  });

  it("renders a dash for non-numeric input", () => {
    expect(formatReportAmount("n/a")).toBe("—");
    expect(formatReportAmount(NaN)).toBe("—");
  });
});

describe("formatFxRate", () => {
  it("returns a plain rate unchanged", () => {
    expect(formatFxRate("0.10388169")).toBe("0.10388169");
  });

  it("parses the <from>:<to>=<rate> format into a readable string", () => {
    expect(formatFxRate("ISO_4217:EUR:ISO_4217:CHF=0.9345")).toBe("EUR → CHF · 0.9345");
  });

  it("parses bare currency codes in the rate format", () => {
    expect(formatFxRate("EUR:CHF=0.9345")).toBe("EUR → CHF · 0.9345");
  });

  it("handles numeric input", () => {
    expect(formatFxRate(1)).toBe("1");
  });

  it("renders a dash for empty input", () => {
    expect(formatFxRate("")).toBe("—");
    expect(formatFxRate(undefined)).toBe("—");
    expect(formatFxRate(null)).toBe("—");
  });
});
