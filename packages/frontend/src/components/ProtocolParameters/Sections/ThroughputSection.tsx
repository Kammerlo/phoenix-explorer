import {
  Box,
  InputAdornment,
  LinearProgress,
  Slider,
  TextField,
  Typography,
  alpha,
  useTheme
} from "@mui/material";
import { useMemo, useState } from "react";

import { BackgroundExpander } from "../Common/BackgroundExpander";
import { LiveAnchorStat } from "../Common/LiveAnchorStat";
import { ParamCard } from "../Common/ParamCard";
import { ScenarioPills } from "../Common/ScenarioPills";
import { SectionHeader } from "../Common/SectionHeader";
import { SectionShell } from "../Common/SectionShell";
import { SimulatorPanel } from "../Common/SimulatorPanel";
import { WhatIfExpander } from "../Common/WhatIfExpander";
import {
  AVG_BLOCK_TIME_SECONDS,
  lovelaceToAda,
  minAdaForUtxoLovelace,
  tpsEstimate,
  txPerBlock
} from "../playground/calculations";
import { THROUGHPUT_SCENARIOS } from "../playground/scenarios";
import { SECTIONS, accentColor } from "../playground/liveContext";

// @ts-ignore — TProtocolParam is a global declaration
import { TProtocolParam } from "src/types/protocol";

interface Props {
  params: TProtocolParam;
}

const num = (v: string | number | null | undefined): number => Number(v) || 0;

const SECTION = SECTIONS.find((s) => s.id === "throughput")!;

export const ThroughputSection = ({ params }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(SECTION.accent, theme);

  const maxBlockSize = num(params.maxBlockSize) || num(params.maxBBSize);
  const maxTxSize = num(params.maxTxSize);
  const coinsPerUTxOByte = num(params.coinsPerUTxOByte);

  // Slider bounds for the block-size playground: from a quarter of today's
  // value up to 4× — covers "what if it shrank" and "what if it doubled twice".
  const blockSizeMin = Math.max(8 * 1024, Math.floor((maxBlockSize || 90112) / 4 / 1024) * 1024);
  const blockSizeMax = Math.max(maxBlockSize * 4 || 360 * 1024, 90112 * 4);

  const [scenarioId, setScenarioId] = useState(THROUGHPUT_SCENARIOS[0].id);
  const [avgTxBytes, setAvgTxBytes] = useState(THROUGHPUT_SCENARIOS[0].avgTxBytes);
  const [outputBytes, setOutputBytes] = useState(THROUGHPUT_SCENARIOS[0].utxoOutputBytes);
  const [blockSize, setBlockSize] = useState(maxBlockSize || 90112);

  const perBlock = useMemo(() => txPerBlock(blockSize, avgTxBytes), [blockSize, avgTxBytes]);
  const tps = useMemo(() => tpsEstimate(blockSize, avgTxBytes), [blockSize, avgTxBytes]);
  const blockFillPct = useMemo(
    () => (blockSize > 0 ? Math.min(100, ((avgTxBytes * perBlock) / blockSize) * 100) : 0),
    [avgTxBytes, perBlock, blockSize]
  );
  const minUtxoAda = useMemo(
    () => lovelaceToAda(minAdaForUtxoLovelace(coinsPerUTxOByte, outputBytes)),
    [coinsPerUTxOByte, outputBytes]
  );

  const blockSizeIsLive = blockSize === maxBlockSize;

  // Anchor uses the empirical 330B avg tx size to express realistic peak TPS.
  const anchorTps = tpsEstimate(maxBlockSize, 330);
  const anchorPerBlock = txPerBlock(maxBlockSize, 330);
  const tpsIfDoubled = tpsEstimate(maxBlockSize * 2, 330);

  const handleScenario = (id: string) => {
    const next = THROUGHPUT_SCENARIOS.find((s) => s.id === id);
    if (!next) return;
    setScenarioId(id);
    setAvgTxBytes(next.avgTxBytes);
    setOutputBytes(next.utxoOutputBytes);
  };

  return (
    <SectionShell id={SECTION.id} accent={SECTION.accent}>
      <SectionHeader
        Icon={SECTION.Icon}
        title="Throughput & min UTxO"
        intent="Block size limits set the throughput ceiling; coinsPerUTxOByte sets the floor for every output."
        accent={SECTION.accent}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.65, maxWidth: 760 }}>
        Cardano is intentionally conservative on block size. Bigger blocks raise peak transactions
        per second but slow propagation across the relay network — and slow propagation increases
        the chance of orphaned blocks. <Box component="strong" color="text.primary">coinsPerUTxOByte</Box>{" "}
        sets the minimum ADA every UTxO must carry, keeping the ledger from filling with dust.
      </Typography>

      <LiveAnchorStat
        accent={SECTION.accent}
        prefix="≈"
        value={anchorTps}
        decimals={1}
        unit="TPS"
        caption={
          <>
            at today's settings the network can fit{" "}
            <Box component="strong" color="text.primary">{anchorPerBlock.toLocaleString()} txs</Box> per
            block — using the empirical ~330 B average transaction size.
          </>
        }
      />

      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        <ParamCard
          label="maxBlockSize"
          value={maxBlockSize}
          unit="bytes"
          accent={SECTION.accent}
          subValue={`= ${(maxBlockSize / 1024).toFixed(1)} KB`}
          description="Maximum total block body size — the throughput ceiling."
        />
        <ParamCard
          label="maxTxSize"
          value={maxTxSize}
          unit="bytes"
          accent={SECTION.accent}
          subValue={`= ${(maxTxSize / 1024).toFixed(1)} KB`}
          description="Maximum size of a single transaction — caps script complexity."
        />
        <ParamCard
          label="coinsPerUTxOByte"
          value={coinsPerUTxOByte}
          unit="lovelace / byte"
          accent={SECTION.accent}
          description="Min ADA per byte of serialized UTxO output."
        />
      </Box>

      <ScenarioPills
        items={THROUGHPUT_SCENARIOS}
        selectedId={scenarioId}
        onSelect={handleScenario}
        accent={SECTION.accent}
        caption="Pick a traffic mix"
      />

      <SimulatorPanel
        accent={SECTION.accent}
        inputs={
          <Box display="flex" flexDirection="column" gap={2}>
            <Box>
              <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={1}>
                <Typography variant="caption" color="text.secondary">
                  Block-body size
                </Typography>
                {!blockSizeIsLive && (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setBlockSize(maxBlockSize)}
                    sx={{
                      cursor: "pointer",
                      border: "none",
                      bgcolor: "transparent",
                      color: accentCss,
                      fontFamily: "inherit",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      p: 0,
                      "&:hover": { textDecoration: "underline" }
                    }}
                  >
                    reset to live ({(maxBlockSize / 1024).toFixed(1)} KB)
                  </Box>
                )}
              </Box>
              <Slider
                value={blockSize}
                min={blockSizeMin}
                max={blockSizeMax}
                step={1024}
                onChange={(_, v) => setBlockSize(v as number)}
                marks={[{ value: maxBlockSize, label: "live" }]}
                sx={{
                  color: accentCss,
                  mt: 1,
                  "& .MuiSlider-markLabel": { fontSize: "0.65rem" }
                }}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${(v / 1024).toFixed(0)} KB`}
              />
              <Typography variant="caption" color="text.disabled">
                {blockSizeIsLive
                  ? "Matches the on-chain value."
                  : `Drag to compare against the live ${(maxBlockSize / 1024).toFixed(1)} KB.`}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Average tx size in this block
              </Typography>
              <TextField
                type="number"
                size="small"
                value={avgTxBytes}
                onChange={(e) =>
                  setAvgTxBytes(Math.max(60, Math.min(maxTxSize || 16384, Number(e.target.value) || 330)))
                }
                sx={{ width: 130, mt: 0.5, mb: 1 }}
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">B</InputAdornment> }
                }}
              />
              <Slider
                value={avgTxBytes}
                min={100}
                max={maxTxSize || 16384}
                step={20}
                onChange={(_, v) => setAvgTxBytes(v as number)}
                sx={{ color: accentCss }}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v.toLocaleString()} B`}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                UTxO output size (for min-ADA check)
              </Typography>
              <Slider
                value={outputBytes}
                min={28}
                max={400}
                step={2}
                onChange={(_, v) => setOutputBytes(v as number)}
                sx={{ color: accentCss }}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v} B`}
              />
            </Box>
          </Box>
        }
        result={
          <Box>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                Block fill at {avgTxBytes.toLocaleString()} B avg tx
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: blockSizeIsLive ? "text.secondary" : accentCss, fontWeight: blockSizeIsLive ? 400 : 700 }}
              >
                {(blockSize / 1024).toFixed(1)} KB
                {!blockSizeIsLive && " (sim)"}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={blockFillPct}
              sx={{
                height: 12,
                borderRadius: 1,
                bgcolor: alpha(accentCss, theme.isDark ? 0.18 : 0.1),
                "& .MuiLinearProgress-bar": { bgcolor: accentCss }
              }}
            />
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              {perBlock.toLocaleString()} txs per block · {blockFillPct.toFixed(1)}% full
            </Typography>

            <Typography
              sx={{
                mt: 2,
                fontWeight: 800,
                fontSize: "1.6rem",
                color: accentCss,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums"
              }}
            >
              {tps.toFixed(1)} TPS
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              at ~{AVG_BLOCK_TIME_SECONDS}s average block time
            </Typography>

            <Box
              mt={2}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: alpha(accentCss, theme.isDark ? 0.1 : 0.05),
                border: `1px dashed ${alpha(accentCss, 0.35)}`
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block">
                A {outputBytes} B UTxO must hold at least
              </Typography>
              <Typography
                fontWeight={700}
                sx={{ color: accentCss, fontVariantNumeric: "tabular-nums" }}
              >
                {minUtxoAda.toFixed(6)} ADA
              </Typography>
            </Box>
          </Box>
        }
      />

      <WhatIfExpander
        accent={SECTION.accent}
        prompt="What if maxBlockSize doubled?"
        body={
          <>
            Peak TPS would lift from{" "}
            <Box component="strong" color="text.primary">{anchorTps.toFixed(1)}</Box> to{" "}
            <Box component="strong" color="text.primary">{tpsIfDoubled.toFixed(1)}</Box> at the
            330 B empirical mix. The cost: each block takes longer to propagate across global relay
            nodes, raising the chance of two valid blocks competing in the same slot — an orphaned
            block. Cardano's parameter committee weighs these trade-offs explicitly.
          </>
        }
      />

      <BackgroundExpander
        title="Background — block size, UTxO floor, and the relay network"
        body={
          <>
            <p>
              Cardano's relay network is global and largely peer-to-peer. Every block must reach
              every honest node before the next slot leader produces a successor. Doubling block
              size doesn't double TPS in practice — propagation latency rises and orphan rate grows.
            </p>
            <p>
              <code>coinsPerUTxOByte</code> replaced the older <code>minUtxoValue</code> after the
              Babbage era. The byte-level granularity protects the ledger from being filled with
              free, useless dust outputs while still allowing minimal multi-asset bundles.
            </p>
          </>
        }
        sources={[
          { label: "CIP-31 (reference inputs)", href: "https://cips.cardano.org/cip/CIP-0031" },
          { label: "Babbage spec", href: "https://github.com/IntersectMBO/cardano-ledger" }
        ]}
      />
    </SectionShell>
  );
};
