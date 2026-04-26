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
import {
  LOVELACE_PER_ADA,
  lovelaceToAda,
  requiredCollateralLovelace
} from "../playground/calculations";
import { COLLATERAL_SCENARIOS } from "../playground/scenarios";
import { SECTIONS, accentColor } from "../playground/liveContext";

// @ts-ignore — TProtocolParam is a global declaration
import { TProtocolParam } from "src/types/protocol";

interface Props {
  params: TProtocolParam;
}

const num = (v: string | number | null | undefined): number => Number(v) || 0;

const SECTION = SECTIONS.find((s) => s.id === "collateral")!;

export const CollateralSection = ({ params }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(SECTION.accent, theme);

  const collateralPercent = num(params.collateralPercent);
  const maxCollateralInputs = num(params.maxCollateralInputs);
  const maxValSize = num(params.maxValSize);

  const [scenarioId, setScenarioId] = useState(COLLATERAL_SCENARIOS[1].id);
  const initial = COLLATERAL_SCENARIOS[1];
  const [scriptFeeAda, setScriptFeeAda] = useState(initial.scriptFeeAda);
  const [valueBytes, setValueBytes] = useState(initial.valueFieldBytes);

  const handleScenario = (id: string) => {
    const next = COLLATERAL_SCENARIOS.find((s) => s.id === id);
    if (!next) return;
    setScenarioId(id);
    setScriptFeeAda(next.scriptFeeAda);
    setValueBytes(next.valueFieldBytes);
  };

  const collateralLovelace = useMemo(
    () => requiredCollateralLovelace(scriptFeeAda * LOVELACE_PER_ADA, collateralPercent),
    [scriptFeeAda, collateralPercent]
  );
  const collateralAda = lovelaceToAda(collateralLovelace);
  const valuePct = maxValSize > 0 ? Math.min(100, (valueBytes / maxValSize) * 100) : 0;

  return (
    <SectionShell id={SECTION.id} accent={SECTION.accent}>
      <SectionHeader
        Icon={SECTION.Icon}
        title="Collateral & Plutus Safety"
        intent="Cardano's safety net for failed smart contracts — and the value-field cap that keeps txs sane."
        accent={SECTION.accent}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.65, maxWidth: 760 }}>
        When you submit a Plutus transaction, the wallet earmarks{" "}
        <Box component="strong" color="text.primary">collateral</Box> — a small ADA-only UTxO that
        gets consumed only if the script <em>fails</em>. If the script succeeds, you pay the normal
        fee and the collateral is released untouched. This lets relays accept Plutus transactions
        without speculatively executing them, and gives the network a deterministic cost model under
        adversarial conditions.
      </Typography>

      <LiveAnchorStat
        accent={SECTION.accent}
        prefix=""
        value={collateralPercent}
        decimals={0}
        unit="%"
        caption={
          <>
            of the script fee must be locked as collateral. Cardano caps the collateral inputs
            at <Box component="strong" color="text.primary">{maxCollateralInputs}</Box> per tx so
            wallets always have a clean ADA-only input to designate.
          </>
        }
      />

      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        <ParamCard
          label="collateralPercent"
          value={collateralPercent}
          unit="%"
          accent={SECTION.accent}
          description="Percentage of script fee earmarked as collateral; consumed only on script failure."
        />
        <ParamCard
          label="maxCollateralInputs"
          value={maxCollateralInputs}
          unit="inputs"
          accent={SECTION.accent}
          description="How many UTxOs you may combine to meet the collateral requirement."
        />
        <ParamCard
          label="maxValSize"
          value={maxValSize}
          unit="bytes"
          accent={SECTION.accent}
          subValue={`= ${(maxValSize / 1024).toFixed(1)} KB`}
          description="Maximum serialized size of a UTxO's value field (ADA + native assets)."
        />
      </Box>

      <ScenarioPills
        items={COLLATERAL_SCENARIOS}
        selectedId={scenarioId}
        onSelect={handleScenario}
        accent={SECTION.accent}
        caption="Try a script profile"
      />

      <SimulatorPanel
        accent={SECTION.accent}
        inputs={
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Script fee (ADA)
            </Typography>
            <Slider
              value={scriptFeeAda}
              min={0.05}
              max={3}
              step={0.05}
              onChange={(_, v) => setScriptFeeAda(v as number)}
              sx={{ color: accentCss, mt: 1 }}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v.toFixed(2)} ADA`}
            />
            <Typography variant="caption" color="text.secondary" display="block" mt={2}>
              Value-field bytes (ADA + assets in this UTxO)
            </Typography>
            <Slider
              value={valueBytes}
              min={28}
              max={maxValSize || 5000}
              step={20}
              onChange={(_, v) => setValueBytes(v as number)}
              sx={{ color: accentCss, mt: 1 }}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v} B`}
            />
          </Box>
        }
        result={
          <Box>
            <Typography variant="caption" color="text.secondary">
              Required collateral
            </Typography>
            <Typography
              fontWeight={800}
              sx={{
                color: accentCss,
                fontSize: "1.6rem",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.1
              }}
            >
              {collateralAda.toFixed(3)} ADA
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              = {collateralPercent}% × {scriptFeeAda.toFixed(2)} ADA · returned if the script succeeds
            </Typography>

            <Box mt={2}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Value-field fill (vs maxValSize)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {valuePct.toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={valuePct}
                sx={{
                  height: 10,
                  borderRadius: 1,
                  bgcolor: alpha(accentCss, theme.isDark ? 0.16 : 0.08),
                  "& .MuiLinearProgress-bar": { bgcolor: accentCss }
                }}
              />
              <Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
                Bundling many native tokens grows the value field — at 100% the UTxO is rejected.
              </Typography>
            </Box>
          </Box>
        }
      />

      <WhatIfExpander
        accent={SECTION.accent}
        prompt="What if collateralPercent dropped from 150% to 100%?"
        body={
          <>
            DApp UX would improve — wallets would lock less ADA per swap. But failed scripts
            (think: bad price oracle, panic exit) would no longer fully cover the network's lost
            validation work. Cardano's parameter committee has kept this intentionally above-cost
            so that script-spam attacks remain unprofitable for the attacker.
          </>
        }
      />

      <BackgroundExpander
        title="Background — why Cardano needs collateral at all"
        body={
          <>
            <p>
              On Ethereum, a failed transaction still consumes gas — the network is paid even when
              your contract reverts. Cardano's deterministic fee model precludes this: the fee is
              fixed before submission, so the network needs another mechanism to recover its cost
              when a script unexpectedly fails. That mechanism is collateral.
            </p>
            <p>
              Collateral inputs must be ADA-only (no native tokens) so that consuming them in a
              failure path doesn't accidentally trap user assets. <code>maxCollateralInputs</code>{" "}
              caps how many UTxOs you may combine — keeping wallet UX simple.
            </p>
          </>
        }
        sources={[
          { label: "CIP-40 (collateral)", href: "https://cips.cardano.org/cip/CIP-0040" },
          { label: "Alonzo spec", href: "https://github.com/IntersectMBO/cardano-ledger" }
        ]}
      />
    </SectionShell>
  );
};
