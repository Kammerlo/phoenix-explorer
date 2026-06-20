import { parseReeveMetadata, normalizeReport, ReportCategory, ReportLeaf } from "./parse";

const REPORT_VALUE = JSON.stringify({
  "1447": {
    org: { name: "Cardano Foundation", currency_id: "ISO_4217:CHF", country_code: "CH" },
    metadata: { timestamp: "2025-10-08T04:20:58Z", version: "1.1" },
    type: "REPORT",
    interval: "MONTHLY",
    year: "2025",
    period: 12,
    subtype: "BALANCE_SHEET",
    data: { assets: { _o: 1, cash: { v: 1000, _o: 1 } } }
  }
});

describe("parseReeveMetadata", () => {
  it("extracts the 1447 root from a metadata array with JSON string values", () => {
    const root = parseReeveMetadata([{ label: 1447, value: REPORT_VALUE }]);
    expect(root?.type).toBe("REPORT");
    expect(root?.org?.name).toBe("Cardano Foundation");
  });

  it("matches a label given as a string", () => {
    const root = parseReeveMetadata([{ label: "1447", value: REPORT_VALUE }]);
    expect(root?.type).toBe("REPORT");
  });

  it("accepts an already-parsed object value (not a JSON string)", () => {
    const obj = JSON.parse(REPORT_VALUE);
    const root = parseReeveMetadata([{ label: 1447, value: obj }]);
    expect(root?.subtype).toBe("BALANCE_SHEET");
  });

  it("accepts a root that is not wrapped under '1447'", () => {
    const unwrapped = JSON.stringify({ type: "REPORT", org: { name: "X" } });
    const root = parseReeveMetadata([{ label: 1447, value: unwrapped }]);
    expect(root?.type).toBe("REPORT");
    expect(root?.org?.name).toBe("X");
  });

  it("returns null when label 1447 is absent", () => {
    expect(parseReeveMetadata([{ label: 721, value: "{}" }])).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseReeveMetadata([{ label: 1447, value: "{not json" }])).toBeNull();
  });

  it("returns null for non-array input", () => {
    expect(parseReeveMetadata(null)).toBeNull();
    expect(parseReeveMetadata({})).toBeNull();
    expect(parseReeveMetadata(undefined)).toBeNull();
  });
});

describe("normalizeReport", () => {
  it("orders top-level categories by _o", () => {
    const data = {
      liabilities: { _o: 2, x: { v: 5, _o: 1 } },
      assets: { _o: 1, y: { v: 10, _o: 1 } }
    };
    expect(normalizeReport(data).map((n) => n.key)).toEqual(["assets", "liabilities"]);
  });

  it("treats {v,_o} objects as value leaves, not categories", () => {
    const data = { assets: { _o: 1, cash: { v: 1000.5, _o: 1 } } };
    const assets = normalizeReport(data)[0] as ReportCategory;
    expect(assets.kind).toBe("category");
    const cash = assets.children[0];
    expect(cash.kind).toBe("value");
    expect(cash.kind === "value" && cash.value).toBe(1000.5);
  });

  it("strips _o and orders leaves within a category", () => {
    const data = { cat: { _o: 1, b: { v: 2, _o: 2 }, a: { v: 1, _o: 1 } } };
    const leaves = (normalizeReport(data)[0] as ReportCategory).children;
    expect(leaves.map((l) => l.key)).toEqual(["a", "b"]);
  });

  it("computes category subtotals from descendant leaves", () => {
    const data = {
      assets: {
        _o: 1,
        current: { _o: 1, cash: { v: 100, _o: 1 }, digital: { v: 50, _o: 2 } },
        noncurrent: { _o: 2, fin: { v: 25, _o: 1 } }
      }
    };
    const assets = normalizeReport(data)[0] as ReportCategory;
    expect(assets.subtotal).toBe(175);
    expect((assets.children[0] as ReportCategory).subtotal).toBe(150);
  });

  it("supports the published plain-string form (no _o, value is a string)", () => {
    const data = {
      assets: { current_assets: { cash: "1000" }, non_current_assets: { property: "5000" } }
    };
    const assets = normalizeReport(data)[0] as ReportCategory;
    expect(assets.kind).toBe("category");
    expect(assets.subtotal).toBe(6000);
    const cash = (assets.children[0] as ReportCategory).children[0];
    expect(cash.kind === "value" && cash.value).toBe(1000);
  });

  it("humanizes keys for display labels", () => {
    const data = { "non-current_assets": { "other_short-term_receivables": { v: 1, _o: 1 } } };
    const top = normalizeReport(data)[0] as ReportCategory;
    expect(top.label).toBe("Non-current assets");
    expect((top.children[0]).label).toBe("Other short-term receivables");
  });

  it("falls back to insertion order when _o is absent", () => {
    const data = { b: { x: "1" }, a: { y: "2" } };
    expect(normalizeReport(data).map((n) => n.key)).toEqual(["b", "a"]);
  });

  it("returns [] for non-object data", () => {
    expect(normalizeReport("string")).toEqual([]);
    expect(normalizeReport(null)).toEqual([]);
    expect(normalizeReport(123)).toEqual([]);
  });

  it("treats a branch that also carries its own v as a category and keeps its children", () => {
    const data = {
      current_assets: { v: 6000, _o: 1, cash: { v: 1000, _o: 1 }, property: { v: 5000, _o: 2 } }
    };
    const cat = normalizeReport(data)[0] as ReportCategory;
    expect(cat.kind).toBe("category");
    expect(cat.children.map((c) => c.key)).toEqual(["cash", "property"]);
    // an explicit on-chain branch total is preferred over the derived sum
    expect(cat.subtotal).toBe(6000);
  });

  it("stringifies object/array leaf values instead of [object Object]", () => {
    const leaf = normalizeReport({ x: { v: { nested: 1 }, _o: 1 } })[0] as ReportLeaf;
    expect(leaf.kind).toBe("value");
    expect(leaf.value).toBeNull();
    expect(leaf.text).toBe('{"nested":1}');
  });

  it("orders untagged siblings after explicitly-ordered ones (no _o/index collision)", () => {
    const data = { a: { _o: 1, v: 1 }, b: { v: 2 }, c: { _o: 0, v: 3 } };
    expect(normalizeReport(data).map((n) => n.key)).toEqual(["c", "a", "b"]);
  });

  it("marks an empty/structural-only category as having no numeric value", () => {
    const cat = normalizeReport({ empty: { _o: 1 } })[0] as ReportCategory;
    expect(cat.kind).toBe("category");
    expect(cat.hasValue).toBe(false);
  });

  it("marks a category with numeric descendants as hasValue true", () => {
    const cat = normalizeReport({ assets: { _o: 1, cash: { v: 100, _o: 1 } } })[0] as ReportCategory;
    expect(cat.hasValue).toBe(true);
  });
});
