/**
 * Direct-Blockfrost connector benchmark.
 *
 * Exercises the real `BlockfrostConnector` (the exact code the browser runs in
 * BLOCKFROST mode) against blockfrost.io, measuring per method: wall latency,
 * number of upstream HTTP calls (axios request interceptor), upstream bytes
 * received, and the size of the assembled envelope the frontend would consume.
 *
 * The connector performs no client-side caching, so cold == warm here; runs
 * are repeated N times for median/p95. TTFB is not meaningful for a
 * multi-request method and is reported as null.
 *
 * Build & run (from repo root — esbuild resolves the frontend path aliases):
 *   npx esbuild scripts/perf/bench-direct.ts --bundle --platform=node \
 *     --format=cjs --target=node18 \
 *     --alias:src=./packages/frontend/src --alias:@shared=./packages/shared/src \
 *     --outfile=/tmp/bench-direct.cjs \
 *   && node /tmp/bench-direct.cjs <label> <out.json> <runsPerMethod>
 *
 * Secrets: the Blockfrost project id is read from the repo-root .env at
 * runtime and never printed or written to the output file.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BlockfrostConnector } from "../../packages/frontend/src/commons/connector/blockfrost/blockfrostConnector";
import fixtures from "./fixtures.json";

const [, , label, outFile, runsArg] = process.argv;
const RUNS = Number(runsArg ?? 10);
if (!label || !outFile) {
  console.error("usage: node bench-direct.cjs <label> <out.json> <runs>");
  process.exit(1);
}

// Minimal .env parsing — only the two non-secret-loggable values we need.
const envText = readFileSync(join(process.cwd(), ".env"), "utf8");
const envVal = (key: string) => envText.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim() ?? "";
// REACT_APP_BLOCKFROST_API_KEY is the browser-mode key; it is empty in this
// repo's .env, so fall back to the gateway's blockfrost.io project id — the
// same credential type, just provisioned once.
const API_KEY = envVal("REACT_APP_BLOCKFROST_API_KEY") || envVal("API_KEY");
const NETWORK = envVal("REACT_APP_NETWORK") || "mainnet";
if (!API_KEY) {
  console.error("No Blockfrost project id found in root .env (REACT_APP_BLOCKFROST_API_KEY or API_KEY)");
  process.exit(1);
}
const BASE = `https://cardano-${NETWORK}.blockfrost.io/api/v0`;

const connector = new BlockfrostConnector(BASE, API_KEY);

// Upstream accounting via interceptors on the connector's own axios instance.
let upstreamCalls = 0;
let upstreamBytes = 0;
connector.client.interceptors.request.use((cfg) => {
  upstreamCalls += 1;
  return cfg;
});
connector.client.interceptors.response.use((res) => {
  try {
    upstreamBytes += JSON.stringify(res.data).length;
  } catch {
    /* non-JSON payload */
  }
  return res;
});

const F = fixtures as Record<string, any>;
const P = F.pageInfo;

// Every method the connector advertises (plus the getTxSummary default),
// one representative parameterization each — mirrors the gateway route list.
const METHODS: [string, () => Promise<unknown>][] = [
  ["dashboard/stats", () => connector.getDashboardStats()],
  ["blocks:list", () => connector.getBlocksPage(P)],
  ["blocks:detail", () => connector.getBlockDetail(F.blockId)],
  ["blocks:txs", () => connector.getTransactions(F.blockId, P)],
  ["epochs:list", () => connector.getEpochs(P)],
  ["epochs:detail", () => connector.getEpoch(F.epochNo)],
  ["epochs:blocks", () => connector.getBlocksByEpoch(F.epochNo, P)],
  ["txs:list", () => connector.getTransactions(undefined, P)],
  ["txs:summary", () => connector.getTxSummary(F.txHashScript)],
  ["txs:detail-script", () => connector.getTxDetail(F.txHashScript)],
  ["txs:detail-plain", () => connector.getTxDetail(F.txHashPlain)],
  ["tokens:list", () => connector.getTokensPage(P)],
  ["tokens:by-policy", () => connector.getTokensByPolicy(F.policyId, P)],
  ["tokens:detail", () => connector.getTokenDetail(F.tokenUnit)],
  ["tokens:holders", () => connector.getTokenHolders(F.tokenUnit, P)],
  ["tokens:txs", () => connector.getTokenTransactions(F.tokenUnit, P)],
  ["addresses:detail", () => connector.getWalletAddressFromAddress(F.address)],
  ["addresses:txs", () => connector.getAddressTxsFromAddress(F.address, P)],
  // Takes a *payment* address in both modes; the connector derives the stake key.
  ["addresses:stake", () => connector.getWalletStakeFromAddress(F.address)],
  ["pools:list", () => connector.getPoolList(P)],
  ["pools:detail", () => connector.getPoolDetail(F.poolId)],
  ["pools:blocks", () => connector.getPoolBlocks(F.poolId, P)],
  ["gov:actions", () => connector.getGovernanceOverviewList(P)],
  ["gov:action-detail", () => connector.getGovernanceDetail(F.govActionTx, F.govActionIndex)],
  ["gov:action-votes", () => connector.getGovernanceActionVotes(F.govActionTx, F.govActionIndex)],
  ["gov:dreps", () => connector.getDreps(P)],
  ["gov:drep-detail", () => connector.getDrep(F.drepId)],
  ["gov:drep-votes", () => connector.getDrepVotes(F.drepId, P)],
  ["gov:drep-delegates", () => connector.getDrepDelegates(F.drepId, P)],
  ["protocol-params", () => connector.getCurrentProtocolParameters()],
  ["search", () => connector.search(F.searchQuery)]
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const results: unknown[] = [];
  for (const [name, fn] of METHODS) {
    const runs: unknown[] = [];
    for (let i = 0; i < RUNS; i++) {
      upstreamCalls = 0;
      upstreamBytes = 0;
      const t0 = performance.now();
      let envelopeBytes = 0;
      let error: string | null = null;
      try {
        const out = await fn();
        envelopeBytes = JSON.stringify(out).length;
        error = (out as { error?: string | null })?.error ?? null;
      } catch (e) {
        error = (e as Error).message;
      }
      const ms = +(performance.now() - t0).toFixed(1);
      runs.push({ ms, ttfb: null, bytes: envelopeBytes, upstream: upstreamCalls, upstreamBytes, error });
      await sleep(100); // stay friendly to the public rate limit
    }
    results.push({ name, runs });
    const ms = (runs as { ms: number }[]).map((r) => r.ms).sort((a, b) => a - b);
    const first = runs[0] as { bytes: number; upstream: number; error: string | null };
    console.log(
      `${name.padEnd(22)} n=${runs.length} med=${ms[Math.floor(ms.length / 2)]}ms ` +
        `bytes=${first.bytes} upstream=${first.upstream}${first.error ? ` ERROR=${first.error.slice(0, 60)}` : ""}`
    );
  }
  writeFileSync(outFile, JSON.stringify({ label, base: "blockfrost.io(direct)", at: new Date().toISOString(), results }, null, 1));
  console.log(`\nwrote ${outFile}`);
}

main();
