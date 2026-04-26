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
  APPROX_ACTIVE_POOLS,
  APPROX_ACTIVE_STAKE_ADA,
  pledgeBonusPct,
  saturationPct,
  saturationPointAda
} from "../playground/calculations";
import { POOLS_SCENARIOS } from "../playground/scenarios";
import { SECTIONS, accentColor } from "../playground/liveContext";

// @ts-ignore — TProtocolParam is a global declaration
import { TProtocolParam } from "src/types/protocol";

interface Props {
  params: TProtocolParam;
}

const num = (v: string | number | null | undefined): number => Number(v) || 0;

const SECTION = SECTIONS.find((s) => s.id === "pools")!;

export const PoolsSection = ({ params }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(SECTION.accent, theme);

  const k = num(params.nOpt);
  const a0 = num(params.a0);
  const minPoolCost = num(params.minPoolCost);

  const [scenarioId, setScenarioId] = useState(POOLS_SCENARIOS[0].id);
  const [poolStake, setPoolStake] = useState(POOLS_SCENARIOS[0].poolStakeAda);
  const [pledge, setPledge] = useState(POOLS_SCENARIOS[0].pledgeAda);

  const handleScenario = (id: string) => {
    const next = POOLS_SCENARIOS.find((s) => s.id === id);
    if (!next) return;
    setScenarioId(id);
    setPoolStake(next.poolStakeAda);
    setPledge(next.pledgeAda);
  };

  const satPoint = useMemo(() => saturationPointAda(k), [k]);
  const satPct = useMemo(() => saturationPct(poolStake, k), [poolStake, k]);
  const bonus = useMemo(() => pledgeBonusPct(pledge, k, a0), [pledge, k, a0]);

  const satColor =
    satPct >= 100
      ? theme.palette.error.main
      : satPct > 80
        ? theme.palette.warning.main
        : theme.palette.success.main;

  return (
    <SectionShell id={SECTION.id} accent={SECTION.accent}>
      <SectionHeader
        Icon={SECTION.Icon}
        title="Pool Mechanics"
        intent="k caps how much stake a single pool can earn rewards on; a₀ rewards operators who pledge their own ADA."
        accent={SECTION.accent}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.65, maxWidth: 760 }}>
        Two parameters do most of the work in pool economics.{" "}
        <Box component="strong" color="text.primary">k</Box> defines the target number of pools — past
        the saturation point, rewards taper off, pushing delegators to spread out.{" "}
        <Box component="strong" color="text.primary">a₀</Box> rewards operators who put their own ADA on
        the line (pledge), aligning operator incentives with delegators.
      </Typography>

      <LiveAnchorStat
        accent={SECTION.accent}
        prefix="≈"
        value={satPoint}
        decimals={0}
        unit="ADA"
        abbreviated
        estimate
        caption={
          <>
            saturation point per pool — total active stake (~{(APPROX_ACTIVE_STAKE_ADA / 1_000_000_000).toFixed(0)} B ADA){" "}
            divided by <code>k = {k.toLocaleString()}</code>. With ~{APPROX_ACTIVE_POOLS.toLocaleString()}{" "}
            pools registered, the network has more capacity than current stake demands.
          </>
        }
      />

      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        <ParamCard
          label="k (nOpt)"
          value={k}
          accent={SECTION.accent}
          description="Target number of pools — saturation point = totalStake / k."
        />
        <ParamCard
          label="a0"
          value={a0}
          accent={SECTION.accent}
          description="Pledge influence factor — higher pledge → bigger reward bonus."
        />
        <ParamCard
          label="minPoolCost"
          value={minPoolCost}
          unit="lovelace"
          accent={SECTION.accent}
          subValue={`= ${(minPoolCost / 1_000_000).toLocaleString()} ADA / epoch`}
          description="Minimum fixed fee a pool may charge per epoch."
        />
      </Box>

      <ScenarioPills
        items={POOLS_SCENARIOS}
        selectedId={scenarioId}
        onSelect={handleScenario}
        accent={SECTION.accent}
        caption="Try a pool profile"
      />

      <SimulatorPanel
        accent={SECTION.accent}
        inputs={
          <Box>
            <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={1}>
              <Typography variant="caption" color="text.secondary">
                Pool stake
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: accentCss,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums"
                }}
              >
                {(poolStake / 1_000_000).toFixed(1)} M ADA
              </Typography>
            </Box>
            <Slider
              value={poolStake}
              min={0}
              max={120_000_000}
              step={500_000}
              onChange={(_, v) => setPoolStake(v as number)}
              marks={[{ value: satPoint, label: "sat." }]}
              sx={{
                color: accentCss,
                mt: 1,
                "& .MuiSlider-markLabel": { fontSize: "0.65rem" }
              }}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${(v / 1_000_000).toFixed(1)} M`}
            />
            <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={1} mt={2}>
              <Typography variant="caption" color="text.secondary">
                Pool pledge (operator's own stake)
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: accentCss,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums"
                }}
              >
                {pledge >= 1_000_000
                  ? `${(pledge / 1_000_000).toFixed(2)} M ADA`
                  : `${(pledge / 1_000).toFixed(0)} k ADA`}
              </Typography>
            </Box>
            <Slider
              value={Math.min(pledge, satPoint)}
              min={0}
              max={Math.max(satPoint, 1_000_000)}
              step={100_000}
              onChange={(_, v) => setPledge(v as number)}
              marks={[{ value: satPoint, label: "cap" }]}
              sx={{
                color: accentCss,
                mt: 1,
                "& .MuiSlider-markLabel": { fontSize: "0.65rem" }
              }}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) =>
                v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)} M` : `${(v / 1_000).toFixed(0)} k`
              }
            />
            <Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
              No protocol max on pledge — but the a₀ bonus stops growing once pledge hits the
              saturation point (~{(satPoint / 1_000_000).toFixed(1)} M ADA).
            </Typography>
          </Box>
        }
        result={
          <Box>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                Saturation
              </Typography>
              <Typography variant="caption" fontWeight={700} sx={{ color: satColor }}>
                {satPct.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, satPct)}
              sx={{
                height: 14,
                borderRadius: 1,
                bgcolor: alpha(satColor, 0.18),
                "& .MuiLinearProgress-bar": { bgcolor: satColor }
              }}
            />
            <Typography
              variant="caption"
              display="block"
              mt={0.5}
              sx={{ color: satColor, fontWeight: 600 }}
            >
              {satPct >= 100
                ? "Over-saturated — rewards are clipped."
                : satPct > 80
                  ? "Approaching saturation — delegators may start migrating away."
                  : "Within saturation limit — full reward share."}
            </Typography>

            <Box mt={2}>
              <Typography variant="caption" color="text.secondary" display="block">
                Pledge influence bonus
              </Typography>
              <Typography
                fontWeight={800}
                sx={{ color: accentCss, fontSize: "1.4rem", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
              >
                +{bonus.toFixed(4)}%
              </Typography>
              <Typography variant="caption" color="text.disabled">
                approximate uplift on rewards (linearized from a₀ × pledge / saturation)
              </Typography>
            </Box>

            <Box mt={2} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: alpha(accentCss, theme.isDark ? 0.1 : 0.05) }}>
              <Typography variant="caption" color="text.secondary">
                Min monthly cost charged to delegators
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ color: accentCss }}>
                ≥ {((minPoolCost / 1_000_000) * 6).toLocaleString()} ADA / month
              </Typography>
              <Typography variant="caption" color="text.disabled">
                ~6 epochs per month at minPoolCost
              </Typography>
            </Box>
          </Box>
        }
      />

      <WhatIfExpander
        accent={SECTION.accent}
        prompt="What if k doubled from 500 to 1 000?"
        body={
          <>
            The saturation point would halve, from ~{(satPoint / 1_000_000).toFixed(1)} M ADA to ~
            {(satPoint / 2_000_000).toFixed(1)} M ADA. Whales delegating to single huge pools would
            be pushed to spread their stake. In practice this is exactly the lever Cardano governance
            uses to encourage decentralization — but it also raises operational overhead, so it's
            tuned cautiously.
          </>
        }
      />

      <BackgroundExpander
        title="Background — incentivized decentralization"
        body={
          <>
            <p>
              The Shelley reward formula gives every pool a "fair share" up to its saturation
              point: <code>satPoint = totalStake / k</code>. Past that, additional delegated stake
              earns no extra rewards — delegators are economically nudged to migrate elsewhere.
            </p>
            <p>
              <code>a₀</code> introduces a small bonus proportional to the operator's own pledge
              relative to saturation. The intent is to make Sybil-style cheap pool registration
              economically uninteresting: a thousand 0-pledge pools earn less than a few well-pledged
              pools at the same total stake.
            </p>
          </>
        }
        sources={[
          { label: "Shelley delegation paper", href: "https://iohk.io/en/research/library/papers/" },
          { label: "Cardano docs · stake pools", href: "https://docs.cardano.org/about-cardano/learn/stake-pool-operation" }
        ]}
      />
    </SectionShell>
  );
};
