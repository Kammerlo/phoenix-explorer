#!/usr/bin/env node
/**
 * Gateway endpoint benchmark.
 *
 * Measures, per endpoint: total latency, TTFB (headers received), payload size
 * (identity encoding), and the number of upstream Blockfrost/demeter calls the
 * request triggered — counted from the gateway's client-proxy log lines
 * ("[demeter] …" / "[blockfrost] …"), which the gateway emits for every
 * upstream SDK call.
 *
 * Usage:
 *   node scripts/perf/bench-gateway.mjs <label> <out.json> <runsPerEndpoint> [--prime]
 *
 * Env:
 *   GW_BASE  gateway base URL   (default http://localhost:3000)
 *   GW_LOG   gateway log file   (required for upstream counting)
 *
 * Protocol notes (keep identical for before/after):
 *   - Endpoints run strictly sequentially, in the fixed order below.
 *   - "cold" = runsPerEndpoint=1 against a freshly restarted gateway process
 *     (the driver restarts the process between cold rounds). Shared-cache
 *     effects within one sweep exist but are identical across rounds/phases.
 *   - "warm" = --prime (one discarded priming hit) + N timed runs per endpoint.
 */
import { readFileSync, openSync, readSync, fstatSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [, , label, outFile, runsArg, ...flags] = process.argv;
const RUNS = Number(runsArg ?? 1);
const PRIME = flags.includes("--prime");
const BASE = process.env.GW_BASE ?? "http://localhost:3000";
const LOG = process.env.GW_LOG;
if (!label || !outFile || !LOG) {
  console.error("usage: GW_LOG=<gateway.log> node bench-gateway.mjs <label> <out.json> <runs> [--prime]");
  process.exit(1);
}

const F = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures.json"), "utf8"));
const P = `page=${F.pageInfo.page}&size=${F.pageInfo.size}`;

// Every gateway route, one representative parameterization each.
const ENDPOINTS = [
  ["dashboard/stats", `/api/dashboard/stats`],
  ["blocks:list", `/api/blocks?${P}`],
  ["blocks:detail", `/api/blocks/${F.blockId}`],
  ["blocks:txs", `/api/blocks/${F.blockId}/transactions?${P}`],
  ["epochs:list", `/api/epochs?${P}`],
  ["epochs:detail", `/api/epochs/${F.epochNo}`],
  ["epochs:blocks", `/api/epochs/${F.epochNo}/blocks?${P}`],
  ["txs:list", `/api/transactions?${P}`],
  ["txs:summary", `/api/transactions/${F.txHashScript}/summary`],
  ["txs:detail-script", `/api/transactions/${F.txHashScript}`],
  ["txs:detail-plain", `/api/transactions/${F.txHashPlain}`],
  ["tokens:list", `/api/tokens?${P}`],
  ["tokens:by-policy", `/api/tokens/policy/${F.policyId}?${P}`],
  ["tokens:detail", `/api/tokens/${F.tokenUnit}`],
  ["tokens:holders", `/api/tokens/${F.tokenUnit}/holders?${P}`],
  ["tokens:txs", `/api/tokens/${F.tokenUnit}/transactions?${P}`],
  ["addresses:detail", `/api/addresses/${F.address}`],
  ["addresses:txs", `/api/addresses/${F.address}/transactions?${P}`],
  ["addresses:stake", `/api/addresses/${F.address}/stake`],
  ["pools:list", `/api/pools?${P}`],
  ["pools:detail", `/api/pools/${F.poolId}`],
  ["pools:blocks", `/api/pools/${F.poolId}/blocks?${P}`],
  ["gov:actions", `/api/governance/actions?${P}`],
  ["gov:action-detail", `/api/governance/actions/${F.govActionTx}/${F.govActionIndex}`],
  ["gov:action-votes", `/api/governance/actions/${F.govActionTx}/${F.govActionIndex}/votes`],
  ["gov:dreps", `/api/governance/dreps?${P}`],
  ["gov:drep-detail", `/api/governance/dreps/${F.drepId}`],
  ["gov:drep-votes", `/api/governance/dreps/${F.drepId}/votes?${P}`],
  ["gov:drep-delegates", `/api/governance/dreps/${F.drepId}/delegates?${P}`],
  ["protocol-params", `/api/protocol-params`],
  ["search", `/api/search?q=${F.searchQuery}`],
  ["scripts:verification", `/api/scripts/${F.scriptHash}/verification`]
];

// Incremental log reader: counts upstream-call lines added since last mark.
const logFd = openSync(LOG, "r");
let logOffset = fstatSync(logFd).size;
function upstreamCallsSinceMark() {
  const size = fstatSync(logFd).size;
  if (size <= logOffset) { logOffset = size; return 0; }
  const buf = Buffer.alloc(size - logOffset);
  readSync(logFd, buf, 0, buf.length, logOffset);
  logOffset = size;
  const text = buf.toString("utf8");
  return (text.match(/\[(demeter|blockfrost)\] /g) ?? []).length;
}

async function measure(url) {
  upstreamCallsSinceMark(); // reset mark
  const t0 = performance.now();
  const res = await fetch(BASE + url, { headers: { "Accept-Encoding": "identity" } });
  const ttfb = performance.now() - t0;
  const body = await res.arrayBuffer();
  const total = performance.now() - t0;
  // Give the last upstream log line a moment to flush before counting.
  await new Promise((r) => setTimeout(r, 60));
  return {
    ms: +total.toFixed(1),
    ttfb: +ttfb.toFixed(1),
    bytes: body.byteLength,
    status: res.status,
    upstream: upstreamCallsSinceMark()
  };
}

const results = [];
for (const [name, url] of ENDPOINTS) {
  const runs = [];
  if (PRIME) await measure(url); // discarded priming hit
  for (let i = 0; i < RUNS; i++) runs.push(await measure(url));
  results.push({ name, url, runs });
  const ms = runs.map((r) => r.ms).sort((a, b) => a - b);
  console.log(
    `${name.padEnd(22)} n=${runs.length} med=${ms[Math.floor(ms.length / 2)]}ms ` +
      `bytes=${runs[0].bytes} upstream=${runs[0].upstream} status=${runs[0].status}`
  );
}

writeFileSync(outFile, JSON.stringify({ label, base: BASE, at: new Date().toISOString(), results }, null, 1));
console.log(`\nwrote ${outFile}`);
