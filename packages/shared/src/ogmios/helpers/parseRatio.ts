export function parseRatio(s: string | number, fallback = 0): number {
  if (typeof s === "number") return s;
  if (typeof s === "string") {
    const slash = s.indexOf("/");
    if (slash > 0) {
      const num = Number(s.slice(0, slash));
      const den = Number(s.slice(slash + 1));
      if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) return num / den;
      return fallback;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}
