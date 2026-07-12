#!/usr/bin/env node
/**
 * Aggregates benchmark JSONs into per-endpoint markdown tables.
 *
 *   node scripts/perf/report.mjs <baselineDir> <afterDir>
 *
 * Expects in each dir: gw-cold-r1..3.json, gw-warm.json, direct.json
 * (as produced by run-phase.sh). Prints markdown to stdout.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const [, , beforeDir, afterDir] = process.argv;
if (!beforeDir) {
  console.error("usage: node report.mjs <baselineDir> [afterDir]");
  process.exit(1);
}

const load = (dir, file) => {
  const p = join(dir, file);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
};

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};
const p95 = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)] : null;
};

// Merge cold rounds: one run per endpoint per round -> 3 samples.
function coldStats(dir) {
  const byName = new Map();
  for (const r of [1, 2, 3]) {
    const data = load(dir, `gw-cold-r${r}.json`);
    if (!data) continue;
    for (const ep of data.results) {
      const bucket = byName.get(ep.name) ?? [];
      bucket.push(...ep.runs);
      byName.set(ep.name, bucket);
    }
  }
  return statsFrom(byName);
}

function sweepStats(dir, file) {
  const data = load(dir, file);
  if (!data) return new Map();
  const byName = new Map(data.results.map((ep) => [ep.name, ep.runs]));
  return statsFrom(byName);
}

function statsFrom(byName) {
  const out = new Map();
  for (const [name, runs] of byName) {
    const ok = runs.filter((r) => (r.status ? r.status === 200 : !r.error));
    out.set(name, {
      n: runs.length,
      med: median(ok.map((r) => r.ms)),
      p95: p95(ok.map((r) => r.ms)),
      ttfb: median(ok.map((r) => r.ttfb).filter((v) => v != null)),
      bytes: median(ok.map((r) => r.bytes)),
      upstream: median(ok.map((r) => r.upstream)),
      errors: runs.length - ok.length
    });
  }
  return out;
}

const fmtMs = (v) => (v == null ? "—" : v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`);
const fmtB = (v) => (v == null ? "—" : v >= 1024 ? `${(v / 1024).toFixed(1)}KB` : `${v}B`);
const delta = (a, b) => {
  if (a == null || b == null || a === 0) return "—";
  const pct = ((b - a) / a) * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`;
};

function table(title, before, after, cols) {
  console.log(`\n### ${title}\n`);
  const names = [...before.keys()];
  if (after) {
    console.log(`| Endpoint | ${cols} (before) | ${cols} (after) | Δ med | upstream before→after | bytes before→after |`);
    console.log("|---|---|---|---|---|---|");
    for (const name of names) {
      const b = before.get(name);
      const a = after.get(name);
      if (!b) continue;
      console.log(
        `| ${name} | ${fmtMs(b.med)} / ${fmtMs(b.p95)} | ${a ? `${fmtMs(a.med)} / ${fmtMs(a.p95)}` : "—"} | ${a ? delta(b.med, a.med) : "—"} | ${b.upstream}→${a?.upstream ?? "—"} | ${fmtB(b.bytes)}→${a ? fmtB(a.bytes) : "—"} |`
      );
    }
  } else {
    console.log(`| Endpoint | n | med | p95 | TTFB | bytes | upstream | errors |`);
    console.log("|---|---|---|---|---|---|---|---|");
    for (const name of names) {
      const b = before.get(name);
      console.log(
        `| ${name} | ${b.n} | ${fmtMs(b.med)} | ${fmtMs(b.p95)} | ${fmtMs(b.ttfb)} | ${fmtB(b.bytes)} | ${b.upstream} | ${b.errors} |`
      );
    }
  }
}

table("Gateway — cold (fresh process, n=3 rounds)", coldStats(beforeDir), afterDir ? coldStats(afterDir) : null, "med/p95");
table("Gateway — warm (primed, n=10)", sweepStats(beforeDir, "gw-warm.json"), afterDir ? sweepStats(afterDir, "gw-warm.json") : null, "med/p95");
table("Direct Blockfrost connector (n=10, no cache)", sweepStats(beforeDir, "direct.json"), afterDir ? sweepStats(afterDir, "direct.json") : null, "med/p95");
