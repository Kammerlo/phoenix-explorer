import { Box, LinearProgress, Slider, Typography, alpha, useTheme } from "@mui/material";
import { useMemo, useState } from "react";

import { BackgroundExpander } from "../Common/BackgroundExpander";
import { LiveAnchorStat } from "../Common/LiveAnchorStat";
import { ParamCard } from "../Common/ParamCard";
import { ScenarioPills } from "../Common/ScenarioPills";
import { SectionHeader } from "../Common/SectionHeader";
import { SectionShell } from "../Common/SectionShell";
import { SimulatorPanel } from "../Common/SimulatorPanel";
import { WhatIfExpander } from "../Common/WhatIfExpander";
import { lovelaceToAda, scriptFeeLovelace } from "../playground/calculations";
import { SCRIPTS_SCENARIOS } from "../playground/scenarios";
import { SECTIONS, accentColor } from "../playground/liveContext";

// @ts-ignore — TProtocolParam is a global declaration
import { TProtocolParam } from "src/types/protocol";

interface Props {
  params: TProtocolParam;
}

const num = (v: string | number | null | undefined): number => Number(v) || 0;

const SECTION = SECTIONS.find((s) => s.id === "scripts")!;

export const ScriptsSection = ({ params }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(SECTION.accent, theme);

  const priceMem = num(params.priceMem);
  const priceStep = num(params.priceStep);
  const maxTxMem = num(params.maxTxExMem);
  const maxTxSteps = num(params.maxTxExSteps);
  const maxBlockMem = num(params.maxBlockExMem);
  const maxBlockSteps = num(params.maxBlockExSteps);

  const [scenarioId, setScenarioId] = useState(SCRIPTS_SCENARIOS[1].id); // default DEX swap
  const initial = SCRIPTS_SCENARIOS[1];
  const [mem, setMem] = useState(initial.memUnits);
  const [steps, setSteps] = useState(initial.cpuSteps);

  const handleScenario = (id: string) => {
    const next = SCRIPTS_SCENARIOS.find((s) => s.id === id);
    if (!next) return;
    setScenarioId(id);
    setMem(next.memUnits);
    setSteps(next.cpuSteps);
  };

  const feeLovelace = useMemo(
    () => scriptFeeLovelace(mem, steps, priceMem, priceStep),
    [mem, steps, priceMem, priceStep]
  );
  const feeAda = lovelaceToAda(feeLovelace);
  const memPct = maxTxMem > 0 ? Math.min(100, (mem / maxTxMem) * 100) : 0;
  const stepPct = maxTxSteps > 0 ? Math.min(100, (steps / maxTxSteps) * 100) : 0;

  const dex = SCRIPTS_SCENARIOS.find((s) => s.id === "dex-swap")!;
  const dexFeeAda = lovelaceToAda(scriptFeeLovelace(dex.memUnits, dex.cpuSteps, priceMem, priceStep));

  return (
    <SectionShell id={SECTION.id} accent={SECTION.accent}>
      <SectionHeader
        Icon={SECTION.Icon}
        title="Plutus Script Execution"
        intent="Smart contracts pay for memory and CPU on-chain. The cost is set by priceMem and priceStep."
        accent={SECTION.accent}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.65, maxWidth: 760 }}>
        Plutus scripts run inside a deterministic interpreter on every node that validates a block.
        Cardano charges for both <Box component="strong" color="text.primary">memory</Box> (peak
        allocation) and <Box component="strong" color="text.primary">CPU steps</Box> (work done) so
        the network can budget execution per transaction <em>and</em> per block. A wallet predicts
        the exact fee via Plutus cost models <em>before</em> submission.
      </Typography>

      <LiveAnchorStat
        accent={SECTION.accent}
        prefix="≈"
        value={dexFeeAda}
        decimals={3}
        unit="ADA"
        caption={
          <>
            script fee for a typical DEX swap (~1.5 M memory units, ~600 M CPU steps). On top of the
            base transaction fee — that's ~{(dex.memUnits / 1_000_000).toFixed(1)} M mem and{" "}
            {(dex.cpuSteps / 1_000_000).toFixed(0)} M CPU steps.
          </>
        }
      />

      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        <ParamCard
          label="priceMem"
          value={priceMem}
          unit="lovelace / unit"
          accent={SECTION.accent}
          description="Cost per memory unit consumed by a Plutus script."
        />
        <ParamCard
          label="priceStep"
          value={priceStep}
          unit="lovelace / unit"
          accent={SECTION.accent}
          description="Cost per CPU step consumed by a Plutus script."
        />
        <ParamCard
          label="maxTxExMem"
          value={maxTxMem}
          unit="units"
          accent={SECTION.accent}
          description="Memory budget for a single transaction."
        />
        <ParamCard
          label="maxTxExSteps"
          value={maxTxSteps}
          unit="units"
          accent={SECTION.accent}
          description="CPU budget for a single transaction."
        />
        <ParamCard
          label="maxBlockExMem"
          value={maxBlockMem}
          unit="units"
          accent={SECTION.accent}
          description="Memory budget for all scripts in a block."
        />
        <ParamCard
          label="maxBlockExSteps"
          value={maxBlockSteps}
          unit="units"
          accent={SECTION.accent}
          description="CPU budget for all scripts in a block."
        />
      </Box>

      <ScenarioPills
        items={SCRIPTS_SCENARIOS}
        selectedId={scenarioId}
        onSelect={handleScenario}
        accent={SECTION.accent}
        caption="Pick a script profile"
      />

      <SimulatorPanel
        accent={SECTION.accent}
        inputs={
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Memory units used
            </Typography>
            <Slider
              value={mem}
              min={0}
              max={maxTxMem || 16_500_000}
              step={50_000}
              onChange={(_, v) => setMem(v as number)}
              sx={{ color: accentCss, mt: 1 }}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${(v / 1_000_000).toFixed(2)} M`}
            />
            <Typography variant="caption" color="text.secondary" display="block" mt={2}>
              CPU steps used
            </Typography>
            <Slider
              value={steps}
              min={0}
              max={maxTxSteps || 10_000_000_000}
              step={1_000_000}
              onChange={(_, v) => setSteps(v as number)}
              sx={{ color: accentCss, mt: 1 }}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${(v / 1_000_000_000).toFixed(2)} B`}
            />
          </Box>
        }
        result={
          <Box>
            <Typography
              variant="body2"
              sx={{ fontFamily: "monospace", color: "text.secondary", lineHeight: 1.6 }}
            >
              <Box component="span" sx={{ color: "text.primary", fontWeight: 700 }}>
                mem
              </Box>{" "}
              × priceMem +{" "}
              <Box component="span" sx={{ color: "text.primary", fontWeight: 700 }}>
                steps
              </Box>{" "}
              × priceStep
            </Typography>
            <Typography
              sx={{
                mt: 1.5,
                fontWeight: 800,
                fontSize: "1.6rem",
                color: accentCss,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.1
              }}
            >
              {feeAda.toFixed(6)} ADA
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              ≡ {feeLovelace.toLocaleString()} lovelace
            </Typography>

            <Box mt={2}>
              <Typography variant="caption" color="text.secondary" display="block">
                Mem budget used: {memPct.toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={memPct}
                sx={{
                  height: 8,
                  borderRadius: 1,
                  mt: 0.5,
                  bgcolor: alpha(accentCss, theme.isDark ? 0.18 : 0.1),
                  "& .MuiLinearProgress-bar": { bgcolor: accentCss }
                }}
              />
            </Box>
            <Box mt={1.25}>
              <Typography variant="caption" color="text.secondary" display="block">
                CPU budget used: {stepPct.toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stepPct}
                sx={{
                  height: 8,
                  borderRadius: 1,
                  mt: 0.5,
                  bgcolor: alpha(theme.palette.info.main, 0.15),
                  "& .MuiLinearProgress-bar": { bgcolor: theme.palette.info.main }
                }}
              />
            </Box>
          </Box>
        }
      />

      <WhatIfExpander
        accent={SECTION.accent}
        prompt="Why two prices, not one combined cost?"
        body={
          <>
            Memory and CPU stress nodes differently. A script that allocates a lot but runs fast
            (memory-heavy) impacts node RAM; a script that runs many steps with small allocations
            (CPU-heavy) impacts validation latency. Pricing them separately lets the network charge
            in proportion to what each script actually costs the relay layer to verify.
          </>
        }
      />

      <BackgroundExpander
        title="Background — Plutus cost models"
        body={
          <>
            <p>
              Each Plutus version (V1, V2, V3) carries its own cost model — a giant table mapping
              every primitive opcode (<code>addInteger</code>, <code>cons</code>, etc.) to its
              memory and CPU budget. The cost models live in <code>costModels</code> on the chain;
              changing them is a parameter update, often timed with a hard fork.
            </p>
            <p>
              Because the model is fixed and deterministic, wallets can pre-compute the exact
              <code> mem × priceMem + steps × priceStep</code> charge before submitting — a property
              the Plutus deterministic execution model relies on.
            </p>
          </>
        }
        sources={[
          { label: "CIP-32 (inline datums)", href: "https://cips.cardano.org/cip/CIP-0032" },
          { label: "Plutus core documentation", href: "https://plutus.readthedocs.io/" }
        ]}
      />
    </SectionShell>
  );
};
