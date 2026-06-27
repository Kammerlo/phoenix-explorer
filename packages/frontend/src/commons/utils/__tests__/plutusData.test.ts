import { decodePlutusData } from "src/commons/utils/plutusData";

describe("decodePlutusData", () => {
  it("decodes an empty constructor (Constr 0 [])", () => {
    // d879 = CBOR tag 121, 80 = empty array
    expect(decodePlutusData("d87980")).toBe("Constr 0 []");
  });

  it("decodes a positive and negative integer", () => {
    expect(decodePlutusData("182a")).toBe("42"); // uint 42
    expect(decodePlutusData("20")).toBe("-1"); // negint -1
  });

  it("decodes a byte string as hex", () => {
    expect(decodePlutusData("43aabbcc")).toBe("h'aabbcc'");
  });

  it("decodes a constructor with fields (indefinite array)", () => {
    // d879 tag121, 9f indefinite array, 182a int 42, 43aabbcc bytes, ff break
    const out = decodePlutusData("d8799f182a43aabbccff");
    expect(out).toContain("Constr 0 [");
    expect(out).toContain("42");
    expect(out).toContain("h'aabbcc'");
  });

  it("decodes a map", () => {
    // a1 map(1), 01 key int 1, 02 val int 2
    const out = decodePlutusData("a10102");
    expect(out).toContain("1: 2");
  });

  it("decodes constructor alternative 1 (tag 122)", () => {
    // d87a = tag 122 (constr 1), 80 empty array
    expect(decodePlutusData("d87a80")).toBe("Constr 1 []");
  });

  it("returns null for empty / invalid input", () => {
    expect(decodePlutusData(undefined)).toBeNull();
    expect(decodePlutusData("")).toBeNull();
    expect(decodePlutusData("zz")).toBeNull();
    expect(decodePlutusData("abc")).toBeNull(); // odd length
  });

  it("does not throw on a real datum and yields a structured result", () => {
    const real =
      "d8799fd8799f581c0e5fa0f3c4a7b3e5a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1ffff";
    const out = decodePlutusData(real);
    expect(out).not.toBeNull();
    expect(out as string).toContain("Constr 0 [");
  });
});
