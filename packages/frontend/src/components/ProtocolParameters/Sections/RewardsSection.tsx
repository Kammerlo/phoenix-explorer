import { Box, Slider, Typography, alpha, useTheme } from "@mui/material";
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
  APPROX_RESERVES_ADA,
  EPOCHS_PER_YEAR,
  epochRewardsAda,
  estimatedStakingApyPct,
  feeRevenuePerEpochAda,
  halfLifeYears,
  lovelaceToAda,
  poolsShareAda,
  txFeeLovelace
} from "../playground/calculations";
import { REWARDS_SCENARIOS } from "../playground/scenarios";
import { SECTIONS, accentColor } from "../playground/liveContext";
import { ReservesDecayChart } from "./Rewards/ReservesDecayChart";

// @ts-ignore — TProtocolParam is a global declaration
import { TProtocolParam } from "src/types/protocol";

interface Props {
  params: TProtocolParam;
}

const num = (v: string | number | null | undefined): number => Number(v) || 0;

const SECTION = SECTIONS.find((s) => s.id === "rewards")!;

const fmtAda = (ada: number): string => {
  if (ada >= 1_000_000) return `${(ada / 1_000_000).toFixed(2)} M ADA`;
  if (ada >= 1_000) return `${(ada / 1_000).toFixed(1)} k ADA`;
  return `${ada.toLocaleString(undefined, { maximumFractionDigits: 0 })} ADA`;
};

export const RewardsSection = ({ params }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(SECTION.accent, theme);

  const rho = num(params.rho);
  const tau = num(params.tau);
  const minPoolCost = num(params.minPoolCost);
  const minFeeA = num(params.minFeeA);
  const minFeeB = num(params.minFeeB);

  // Empirical baseline fee for the sustainability sim: a 300 B wallet → wallet send.
  const empiricalFeeAda = lovelaceToAda(txFeeLovelace(300, minFeeA, minFeeB));

  const [scenarioId, setScenarioId] = useState(REWARDS_SCENARIOS[0].id);
  const [rhoMul, setRhoMul] = useState(REWARDS_SCENARIOS[0].rhoMultiplier);
  const [tauMul, setTauMul] = useState(REWARDS_SCENARIOS[0].tauMultiplier);
  const [tps, setTps] = useState(5); // empirical Cardano sustained TPS

  const handleScenario = (id: string) => {
    const next = REWARDS_SCENARIOS.find((s) => s.id === id);
    if (!next) return;
    setScenarioId(id);
    setRhoMul(next.rhoMultiplier);
    setTauMul(next.tauMultiplier);
  };

  // Reserves are always projected from today's mainnet value — no slider.
  const effectiveRho = rho * rhoMul;
  const effectiveTau = tau * tauMul;

  const epochRewards = useMemo(
    () => epochRewardsAda(APPROX_RESERVES_ADA, effectiveRho),
    [effectiveRho]
  );
  const poolsAda = poolsShareAda(epochRewards, effectiveTau);
  const apy = estimatedStakingApyPct(APPROX_RESERVES_ADA, effectiveRho, effectiveTau);
  const halfLife = halfLifeYears(effectiveRho);

  // Live anchor (top of section) uses unmodified on-chain ρ/τ.
  const liveEpochRewards = epochRewardsAda(APPROX_RESERVES_ADA, rho);
  const livePoolsShare = poolsShareAda(liveEpochRewards, tau);

  const feeRevenuePerEpoch = useMemo(
    () => feeRevenuePerEpochAda(tps, empiricalFeeAda),
    [tps, empiricalFeeAda]
  );

  return (
    <SectionShell id={SECTION.id} accent={SECTION.accent}>
      <SectionHeader
        Icon={SECTION.Icon}
        title="Rewards & Treasury"
        intent="Each epoch a fraction of remaining reserves is minted; the treasury keeps τ, the rest goes to pools."
        accent={SECTION.accent}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.65, maxWidth: 760 }}>
        Cardano's monetary policy is fixed and deflationary. ADA isn't created from nothing each
        epoch — it's <Box component="strong" color="text.primary">released</Box> from the reserves
        pool at rate <code>ρ</code>. Once reserves are exhausted, rewards must come from
        transaction fees. The treasury accumulates <code>τ</code> of every reward distribution to
        fund Cardano's long-term operation through governance proposals.
      </Typography>

      <LiveAnchorStat
        accent={SECTION.accent}
        prefix="≈"
        value={livePoolsShare}
        decimals={1}
        unit="ADA"
        abbreviated
        estimate
        caption={
          <>
            distributed to pools and delegators each epoch (estimated from current reserves and ρ).
            Treasury keeps <Box component="strong" color="text.primary">{(tau * 100).toFixed(1)}%</Box> on top of that.
          </>
        }
      />

      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        <ParamCard
          label="rho (ρ)"
          value={rho}
          accent={SECTION.accent}
          subValue={`= ${(rho * 100).toFixed(3)}% of reserves / epoch`}
          description="Monetary expansion rate. Each epoch, ρ × reserves is minted as the reward pool."
        />
        <ParamCard
          label="tau (τ)"
          value={tau}
          accent={SECTION.accent}
          subValue={`= ${(tau * 100).toFixed(1)}% to treasury`}
          description="Treasury growth rate — the fraction of every reward distribution kept by the treasury."
        />
        <ParamCard
          label="minPoolCost"
          value={minPoolCost}
          unit="lovelace"
          accent={SECTION.accent}
          subValue={`= ${(minPoolCost / 1_000_000).toLocaleString()} ADA / epoch`}
          description="Minimum fixed fee a pool may charge — keeps tiny pools economically viable."
        />
      </Box>

      <ScenarioPills
        items={REWARDS_SCENARIOS}
        selectedId={scenarioId}
        onSelect={handleScenario}
        accent={SECTION.accent}
        caption="Pick a what-if"
      />

      <SimulatorPanel
        accent={SECTION.accent}
        inputsCaption="Tweak the model"
        resultCaption="Projection"
        inputs={
          <Box>
            <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={1}>
              <Typography variant="caption" color="text.secondary">
                ρ multiplier (1 = on-chain)
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: accentCss, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
              >
                {rhoMul.toFixed(2)}× → ρ = {effectiveRho.toFixed(4)}
              </Typography>
            </Box>
            <Slider
              value={rhoMul}
              min={0.25}
              max={4}
              step={0.05}
              onChange={(_, v) => setRhoMul(v as number)}
              sx={{ color: accentCss, mt: 1 }}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}×`}
            />

            <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={1} mt={2}>
              <Typography variant="caption" color="text.secondary">
                τ multiplier (1 = on-chain)
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: accentCss, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
              >
                {tauMul.toFixed(2)}× → τ = {effectiveTau.toFixed(3)}
              </Typography>
            </Box>
            <Slider
              value={tauMul}
              min={0.25}
              max={4}
              step={0.05}
              onChange={(_, v) => setTauMul(v as number)}
              sx={{ color: accentCss, mt: 1 }}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}×`}
            />

            <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={1} mt={2}>
              <Typography variant="caption" color="text.secondary">
                Sustained TPS (fee revenue)
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: accentCss, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
              >
                {tps} TPS · {fmtAda(feeRevenuePerEpoch)} / epoch
              </Typography>
            </Box>
            <Slider
              value={tps}
              min={0}
              max={500}
              step={1}
              onChange={(_, v) => setTps(v as number)}
              marks={[{ value: 5, label: "today" }]}
              sx={{
                color: accentCss,
                mt: 1,
                "& .MuiSlider-markLabel": { fontSize: "0.65rem" }
              }}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v} TPS`}
            />
            <Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
              Fixed fee ≈ {empiricalFeeAda.toFixed(3)} ADA / tx (300 B wallet send).
            </Typography>

            <Box
              mt={2.5}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: alpha(accentCss, theme.isDark ? 0.1 : 0.04),
                border: `1px dashed ${alpha(accentCss, 0.35)}`
              }}
            >
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" color="text.secondary">Today's epoch rewards</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ color: accentCss }}>
                  {fmtAda(epochRewards)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" color="text.secondary">Pools & delegators ({((1 - effectiveTau) * 100).toFixed(1)}%)</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ color: theme.palette.success.main }}>
                  {fmtAda(poolsAda)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" color="text.secondary">Est. staking APY</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ color: accentCss }}>
                  {apy.toFixed(2)}%
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Reserves half-life</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ color: accentCss }}>
                  {Number.isFinite(halfLife) ? `${halfLife.toFixed(1)} y (${(halfLife * EPOCHS_PER_YEAR).toFixed(0)} ep)` : "never"}
                </Typography>
              </Box>
            </Box>
          </Box>
        }
        result={
          <ReservesDecayChart
            accent={SECTION.accent}
            initialReservesAda={APPROX_RESERVES_ADA}
            rho={effectiveRho}
            tau={effectiveTau}
            years={25}
            avgFeeAda={empiricalFeeAda}
            currentTps={tps}
          />
        }
      />

      <WhatIfExpander
        accent={SECTION.accent}
        prompt="Why a multiplicative reserve, not a fixed annual mint?"
        body={
          <>
            With <code>ρ = {rho}</code>, each epoch the reserves shrink by{" "}
            <Box component="strong" color="text.primary">{(rho * 100).toFixed(2)}%</Box>. That's
            geometric decay: the same percentage of an ever-smaller pool. Reserves halve in roughly{" "}
            <Box component="strong" color="text.primary">
              {halfLifeYears(rho).toFixed(1)} years
            </Box>{" "}
            at the current ρ; halving ρ would push the half-life out to{" "}
            <Box component="strong" color="text.primary">
              {halfLifeYears(rho / 2).toFixed(1)} years
            </Box>. By the time reserves are exhausted, transaction-fee revenue should be high
            enough to fund pool rewards directly — the system was designed to deflate gracefully
            into a fee-driven equilibrium.
          </>
        }
      />

      <BackgroundExpander
        title="Background — Cardano's monetary model"
        body={
          <>
            <p>
              Cardano's max supply is 45 billion ADA. Reserves have decayed from ~14 billion at
              the Shelley launch to roughly 6.4 billion today; the rest has already been released
              as block rewards. Each epoch, <code>ρ × reserves</code> is minted as the reward pool.{" "}
              <code>τ</code> of that pool funds the treasury; the remaining <code>1 − τ</code> is
              distributed to pools and delegators in proportion to stake (with a small <code>a₀</code>{" "}
              bonus for pledged stake — see Pool Mechanics).
            </p>
            <p>
              The treasury holds an ever-growing ADA balance — currently around 1.6 billion ADA.
              It can only be spent through governance proposals ratified by DReps and the
              Constitutional Committee.
            </p>
          </>
        }
        sources={[
          { label: "Shelley delegation paper", href: "https://iohk.io/en/research/library/papers/" },
          { label: "Cardano docs · monetary policy", href: "https://docs.cardano.org/learn/cardano-tokenomics" }
        ]}
      />
    </SectionShell>
  );
};
