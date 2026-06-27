/**
 * Rough decompiler for Plutus data (datums / redeemers) from their CBOR hex
 * into a readable, indented structure — e.g.
 *
 *   Constr 0 [
 *     42,
 *     h'aabbcc',
 *     Constr 1 []
 *   ]
 *
 * Hand-rolled CBOR walk (no ESM dependency, so it stays unit-testable under
 * jest) covering exactly the Plutus-data subset: integers (incl. bignums),
 * byte strings (incl. chunked), lists, maps and constructors (tags 121-127,
 * 1280+, and the general tag 102). Best-effort: returns `null` on anything it
 * can't parse rather than throwing.
 */

const MAX_OUTPUT = 2000;
const MAX_DEPTH = 64;

type PData =
  | { t: "int"; v: bigint }
  | { t: "bytes"; v: Uint8Array }
  | { t: "text"; v: string }
  | { t: "list"; v: PData[] }
  | { t: "map"; v: [PData, PData][] }
  | { t: "constr"; tag: number; fields: PData[] };

interface Cursor {
  buf: Uint8Array;
  pos: number;
}

function hexToBytes(hex: string): Uint8Array {
  const len = hex.length / 2;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
  return s;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let v = 0n;
  for (let i = 0; i < bytes.length; i++) v = (v << 8n) | BigInt(bytes[i]);
  return v;
}

function readUint(s: Cursor, n: number): bigint {
  let v = 0n;
  for (let i = 0; i < n; i++) {
    if (s.pos >= s.buf.length) throw new Error("eof");
    v = (v << 8n) | BigInt(s.buf[s.pos++]);
  }
  return v;
}

// Resolve the length/value for a major type from the additional-info bits.
function readLen(s: Cursor, ai: number): bigint {
  if (ai < 24) return BigInt(ai);
  if (ai === 24) return readUint(s, 1);
  if (ai === 25) return readUint(s, 2);
  if (ai === 26) return readUint(s, 4);
  if (ai === 27) return readUint(s, 8);
  throw new Error(`bad additional info ${ai}`);
}

function readBytes(s: Cursor, ai: number): Uint8Array {
  if (ai === 31) {
    // Indefinite-length: concatenate definite-length chunks until the break.
    const chunks: Uint8Array[] = [];
    while (s.buf[s.pos] !== 0xff) {
      const cb = s.buf[s.pos++];
      const chunk = readBytes(s, cb & 0x1f);
      chunks.push(chunk);
    }
    s.pos++; // consume break
    const total = chunks.reduce((a, c) => a + c.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const c of chunks) {
      out.set(c, o);
      o += c.length;
    }
    return out;
  }
  const len = Number(readLen(s, ai));
  if (s.pos + len > s.buf.length) throw new Error("eof");
  const out = s.buf.slice(s.pos, s.pos + len);
  s.pos += len;
  return out;
}

function decodeItem(s: Cursor, depth: number): PData {
  if (depth > MAX_DEPTH) throw new Error("too deep");
  if (s.pos >= s.buf.length) throw new Error("eof");
  const b = s.buf[s.pos++];
  const major = b >> 5;
  const ai = b & 0x1f;

  switch (major) {
    case 0:
      return { t: "int", v: readLen(s, ai) };
    case 1:
      return { t: "int", v: -1n - readLen(s, ai) };
    case 2:
      return { t: "bytes", v: readBytes(s, ai) };
    case 3: {
      const bytes = readBytes(s, ai);
      try {
        return { t: "text", v: `"${new TextDecoder().decode(bytes)}"` };
      } catch {
        return { t: "bytes", v: bytes };
      }
    }
    case 4:
      return { t: "list", v: readArray(s, ai, depth) };
    case 5:
      return { t: "map", v: readMap(s, ai, depth) };
    case 6:
      return decodeTagged(s, readLen(s, ai), depth);
    case 7:
      return decodeSimple(s, ai);
    default:
      throw new Error("bad major");
  }
}

function readArray(s: Cursor, ai: number, depth: number): PData[] {
  const items: PData[] = [];
  if (ai === 31) {
    while (s.buf[s.pos] !== 0xff) items.push(decodeItem(s, depth + 1));
    s.pos++;
  } else {
    const n = Number(readLen(s, ai));
    for (let i = 0; i < n; i++) items.push(decodeItem(s, depth + 1));
  }
  return items;
}

function readMap(s: Cursor, ai: number, depth: number): [PData, PData][] {
  const pairs: [PData, PData][] = [];
  if (ai === 31) {
    while (s.buf[s.pos] !== 0xff) {
      const k = decodeItem(s, depth + 1);
      const v = decodeItem(s, depth + 1);
      pairs.push([k, v]);
    }
    s.pos++;
  } else {
    const n = Number(readLen(s, ai));
    for (let i = 0; i < n; i++) {
      const k = decodeItem(s, depth + 1);
      const v = decodeItem(s, depth + 1);
      pairs.push([k, v]);
    }
  }
  return pairs;
}

function decodeTagged(s: Cursor, tag: bigint, depth: number): PData {
  if (tag === 2n || tag === 3n) {
    const inner = decodeItem(s, depth + 1);
    const mag = inner.t === "bytes" ? bytesToBigInt(inner.v) : 0n;
    return { t: "int", v: tag === 2n ? mag : -1n - mag };
  }
  if (tag >= 121n && tag <= 127n) {
    const arr = decodeItem(s, depth + 1);
    return { t: "constr", tag: Number(tag - 121n), fields: arr.t === "list" ? arr.v : [] };
  }
  if (tag >= 1280n && tag <= 1400n) {
    const arr = decodeItem(s, depth + 1);
    return { t: "constr", tag: Number(tag - 1280n + 7n), fields: arr.t === "list" ? arr.v : [] };
  }
  if (tag === 102n) {
    const arr = decodeItem(s, depth + 1);
    if (arr.t === "list" && arr.v.length === 2 && arr.v[0].t === "int" && arr.v[1].t === "list") {
      return { t: "constr", tag: Number(arr.v[0].v), fields: arr.v[1].v };
    }
    return arr;
  }
  // Unknown tag — surface the inner value.
  return decodeItem(s, depth + 1);
}

function decodeSimple(s: Cursor, ai: number): PData {
  switch (ai) {
    case 20:
      return { t: "text", v: "False" };
    case 21:
      return { t: "text", v: "True" };
    case 22:
      return { t: "text", v: "null" };
    case 25:
      s.pos += 2;
      return { t: "text", v: "<float16>" };
    case 26:
      s.pos += 4;
      return { t: "text", v: "<float32>" };
    case 27:
      s.pos += 8;
      return { t: "text", v: "<float64>" };
    default:
      return { t: "text", v: "<simple>" };
  }
}

function prettyBytes(u: Uint8Array): string {
  const h = bytesToHex(u);
  if (h.length <= 64) return `h'${h}'`;
  return `h'${h.slice(0, 40)}…${h.slice(-8)}' (${u.length} bytes)`;
}

function pretty(d: PData, ind: number): string {
  const pad = "  ".repeat(ind);
  const padIn = "  ".repeat(ind + 1);
  switch (d.t) {
    case "int":
      return d.v.toString();
    case "text":
      return d.v;
    case "bytes":
      return prettyBytes(d.v);
    case "list":
      if (d.v.length === 0) return "[]";
      return "[\n" + d.v.map((x) => padIn + pretty(x, ind + 1)).join(",\n") + "\n" + pad + "]";
    case "map":
      if (d.v.length === 0) return "{}";
      return (
        "{\n" +
        d.v.map(([k, v]) => `${padIn}${pretty(k, ind + 1)}: ${pretty(v, ind + 1)}`).join(",\n") +
        "\n" +
        pad +
        "}"
      );
    case "constr":
      if (d.fields.length === 0) return `Constr ${d.tag} []`;
      return (
        `Constr ${d.tag} [\n` +
        d.fields.map((x) => padIn + pretty(x, ind + 1)).join(",\n") +
        "\n" +
        pad +
        "]"
      );
  }
}

/**
 * Decode Plutus-data CBOR hex into a readable indented string, or `null` if the
 * input is empty / not valid hex / not decodable.
 */
export function decodePlutusData(cborHex?: string | null): string | null {
  if (cborHex == null) return null;
  const hex = String(cborHex).trim().replace(/^0x/, "");
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  try {
    const data = decodeItem({ buf: hexToBytes(hex), pos: 0 }, 0);
    let out = pretty(data, 0);
    if (out.length > MAX_OUTPUT) out = out.slice(0, MAX_OUTPUT) + "\n… (truncated)";
    return out;
  } catch {
    return null;
  }
}
