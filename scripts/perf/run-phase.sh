#!/usr/bin/env bash
# Full measurement phase for the endpoint benchmark (gateway + direct mode).
#
#   scripts/perf/run-phase.sh <phase-label> <out-dir> <gateway-log-file>
#
# Protocol (identical for the before- and after-phase):
#   1. 3 cold rounds: restart the gateway, sweep every endpoint once (n=1).
#   2. 1 warm sweep: 1 discarded priming hit + 10 timed runs per endpoint.
#   3. Direct mode: 10 runs per connector method (no cache -> cold == warm).
#
# The gateway log is the upstream-call counter (client-proxy log lines).
# Requires: repo root cwd, root .env configured, node >= 18, esbuild.
set -euo pipefail

PHASE=$1
OUT=$2
GW_LOG=$3
mkdir -p "$OUT"

restart_gateway() {
  lsof -tiTCP:3000 -sTCP:LISTEN | xargs kill 2>/dev/null || true
  sleep 1
  PORT=3000 nohup npm run dev --workspace=gateway >"$GW_LOG" 2>&1 &
  until curl -sf http://localhost:3000/api/protocol-params -o /dev/null 2>/dev/null; do sleep 1; done
}

for r in 1 2 3; do
  echo "=== $PHASE: cold round $r"
  restart_gateway
  GW_LOG="$GW_LOG" node scripts/perf/bench-gateway.mjs "$PHASE-cold-r$r" "$OUT/gw-cold-r$r.json" 1
done

echo "=== $PHASE: warm sweep (prime + 10 runs)"
GW_LOG="$GW_LOG" node scripts/perf/bench-gateway.mjs "$PHASE-warm" "$OUT/gw-warm.json" 10 --prime

echo "=== $PHASE: direct mode (10 runs per method)"
BUNDLE=$(mktemp -t bench-direct).cjs
npx esbuild scripts/perf/bench-direct.ts --bundle --platform=node --format=cjs --target=node18 \
  --alias:src=./packages/frontend/src --alias:@shared=./packages/shared/src \
  --outfile="$BUNDLE" --log-level=warning
node "$BUNDLE" "$PHASE-direct" "$OUT/direct.json" 10

echo "=== $PHASE complete -> $OUT"
