import { decodeFlatUplcToObject } from "@cardano-foundation/cf-flat-decoder-ts";

import { UPLCProgram } from "src/types/uplc";

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const len = Math.floor(clean.length / 2);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, "0");
  }
  return s;
}

// Strip exactly one CBOR definite-length byte-string wrapper (major type 2) and
// return the inner payload as hex. Used to peel double-CBOR-wrapped scripts.
// A tiny hand-rolled parser avoids pulling an ESM-only CBOR lib into the bundle
// (and the jest transform path) just for this one header.
function unwrapCborByteString(hex: string): string | null {
  const bytes = hexToBytes(hex);
  if (bytes.length < 1) return null;
  const b0 = bytes[0];
  if (b0 >> 5 !== 2) return null; // not a byte string
  const ai = b0 & 0x1f;
  let offset = 1;
  let len: number;
  if (ai < 24) {
    len = ai;
  } else if (ai === 24) {
    len = bytes[1];
    offset = 2;
  } else if (ai === 25) {
    len = (bytes[1] << 8) | bytes[2];
    offset = 3;
  } else if (ai === 26) {
    len = ((bytes[1] << 24) | (bytes[2] << 16) | (bytes[3] << 8) | bytes[4]) >>> 0;
    offset = 5;
  } else {
    return null; // 8-byte length / indefinite — not needed for scripts
  }
  const payload = bytes.slice(offset, offset + len);
  if (payload.length === 0) return null;
  return bytesToHex(payload);
}

/**
 * Decode a Plutus script's CBOR hex into a UPLC program tree consumable by the
 * `UPLCTree` component. Returns `null` for empty input or anything that isn't a
 * decodable Plutus script (e.g. native/timelock scripts, which have no UPLC).
 *
 * Replaces the previously dead `window.decodeUPLC` global (its WASM was never
 * wired up) with the pure-JS `@cardano-foundation/cf-flat-decoder-ts` decoder.
 * The decoder already peels one CBOR byte-string header, so we try the value
 * as-is first and, if it doesn't parse, strip one extra layer (double-wrapped
 * scripts) and retry.
 */
export function decodeScript(scriptCbor?: string | number | null): UPLCProgram | null {
  if (scriptCbor == null) return null;
  const hex = String(scriptCbor).trim();
  if (!hex) return null;

  const candidates = [hex];
  const unwrapped = unwrapCborByteString(hex);
  if (unwrapped && unwrapped !== hex) candidates.push(unwrapped);

  for (const candidate of candidates) {
    try {
      const decoded = decodeFlatUplcToObject(candidate);
      if (decoded && decoded.version && decoded.version.major != null) {
        // `decoded.data` is the program's root tree node; UPLCTree reads
        // `program.data` (its children), so the shapes line up directly.
        return { version: decoded.version, program: decoded.data as unknown as UPLCProgram["program"] };
      }
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}
