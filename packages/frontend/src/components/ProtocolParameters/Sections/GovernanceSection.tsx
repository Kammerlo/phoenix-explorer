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
  MAINNET_EPOCH_DAYS,
  epochsToDays,
  epochsToMonths,
  epochsToYears
} from "../playground/calculations";
import { GOVERNANCE_SCENARIOS } from "../playground/scenarios";
import { SECTIONS, accentColor } from "../playground/liveContext";

// @ts-ignore — TProtocolParam is a global declaration
import { TProtocolParam } from "src/types/protocol";

interface Props {
  params: TProtocolParam;
}

const num = (v: string | number | null | undefined): number => Number(v) || 0;

const SECTION = SECTIONS.find((s) => s.id === "governance")!;

export const GovernanceSection = ({ params }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(SECTION.accent, theme);

  const govActionLifetime = num(params.govActionLifetime);
  const drepActivity = num(params.drepActivity);
  const ccMinSize = num(params.ccMinSize);
  const ccMaxTermLength = num(params.ccMaxTermLength);

  const initialEpochs = govActionLifetime || 6;
  const [scenarioId, setScenarioId] = useState(GOVERNANCE_SCENARIOS[0].id);
  const [epochs, setEpochs] = useState<number>(initialEpochs);

  const handleScenario = (id: string) => {
    const next = GOVERNANCE_SCENARIOS.find((s) => s.id === id);
    if (!next) return;
    setScenarioId(id);
    if (next.epochs !== undefined) setEpochs(next.epochs);
    else if (next.paramKey) {
      const map: Record<string, number> = {
        govActionLifetime,
        drepActivity,
        ccMaxTermLength
      };
      setEpochs(map[next.paramKey] || 1);
    }
  };

  const days = epochsToDays(epochs);
  const months = epochsToMonths(epochs);
  const years = epochsToYears(epochs);

  const expiresAt = useMemo(() => {
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString(undefined, { dateStyle: "long" });
  }, [days]);

  return (
    <SectionShell id={SECTION.id} accent={SECTION.accent}>
      <SectionHeader
        Icon={SECTION.Icon}
        title="Governance Timelines"
        intent="Conway-era governance is epoch-gated. Translating epochs to real-world time is the unlock."
        accent={SECTION.accent}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.65, maxWidth: 760 }}>
        After the Chang hard fork, every Cardano governance event is paced in epochs. Proposals
        accept votes for a fixed window, DReps must show up periodically to keep their voting
        power alive, and Constitutional Committee terms are bounded.{" "}
        <Box component="strong" color="text.primary">
          On mainnet, 1 epoch = {MAINNET_EPOCH_DAYS} real-world days.
        </Box>
      </Typography>

      <LiveAnchorStat
        accent={SECTION.accent}
        prefix=""
        value={govActionLifetime}
        decimals={0}
        unit="epochs"
        caption={
          <>
            governance-action lifetime — about{" "}
            <Box component="strong" color="text.primary">
              {epochsToDays(govActionLifetime).toLocaleString()} real-world days
            </Box>
            . If a proposal isn't ratified in that window, the deposit is refunded and the action
            expires.
          </>
        }
      />

      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        <ParamCard
          label="govActionLifetime"
          value={govActionLifetime}
          unit="epochs"
          accent={SECTION.accent}
          subValue={`= ${epochsToDays(govActionLifetime)} days`}
          description="Window during which a governance action accepts votes."
        />
        <ParamCard
          label="drepActivity"
          value={drepActivity}
          unit="epochs"
          accent={SECTION.accent}
          subValue={`= ${epochsToDays(drepActivity)} days`}
          description="Inactivity grace period before a DRep's voting power lapses."
        />
        <ParamCard
          label="ccMinSize"
          value={ccMinSize}
          accent={SECTION.accent}
          description="Minimum number of Constitutional Committee members required."
        />
        <ParamCard
          label="ccMaxTermLength"
          value={ccMaxTermLength}
          unit="epochs"
          accent={SECTION.accent}
          subValue={`= ${epochsToYears(ccMaxTermLength).toFixed(1)} years`}
          description="Longest term a Constitutional Committee member may serve."
        />
      </Box>

      <ScenarioPills
        items={GOVERNANCE_SCENARIOS}
        selectedId={scenarioId}
        onSelect={handleScenario}
        accent={SECTION.accent}
        caption="Pick a governance window"
      />

      <SimulatorPanel
        accent={SECTION.accent}
        inputs={
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Epoch count
            </Typography>
            <Slider
              value={epochs}
              min={1}
              max={Math.max(200, ccMaxTermLength || 200)}
              step={1}
              onChange={(_, v) => setEpochs(v as number)}
              sx={{ color: accentCss, mt: 1 }}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v} ep`}
            />
            <Typography variant="caption" color="text.disabled">
              Drag to convert any epoch count into real time.
            </Typography>
          </Box>
        }
        result={
          <Box>
            <Box
              display="grid"
              gridTemplateColumns={{ xs: "repeat(3, 1fr)" }}
              gap={1}
              mb={2}
            >
              {[
                { label: "Days", value: days.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
                { label: "Months", value: months.toFixed(1) },
                { label: "Years", value: years.toFixed(2) }
              ].map((c) => (
                <Box
                  key={c.label}
                  sx={{
                    textAlign: "center",
                    py: 1.25,
                    px: 0.5,
                    borderRadius: 1.5,
                    bgcolor: alpha(accentCss, theme.isDark ? 0.12 : 0.05),
                    border: `1px solid ${alpha(accentCss, 0.25)}`
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}
                  >
                    {c.label}
                  </Typography>
                  <Typography
                    fontWeight={700}
                    sx={{
                      color: accentCss,
                      fontVariantNumeric: "tabular-nums",
                      fontSize: "1.15rem",
                      lineHeight: 1.2
                    }}
                  >
                    {c.value}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.text.primary, theme.isDark ? 0.06 : 0.04),
                border: `1px dashed ${alpha(theme.palette.text.primary, 0.18)}`
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block">
                If submitted now, expires
              </Typography>
              <Typography fontWeight={700} sx={{ color: "text.primary" }}>
                {expiresAt}
              </Typography>
            </Box>
          </Box>
        }
      />

      <WhatIfExpander
        accent={SECTION.accent}
        prompt="What if proposal lifetimes were halved?"
        body={
          <>
            Faster governance — but DReps with weekly review cadences would miss votes more often,
            and last-minute lobbying would dominate. Cardano picked{" "}
            <Box component="strong" color="text.primary">
              {govActionLifetime} epochs ≈ {epochsToDays(govActionLifetime)} days
            </Box>{" "}
            as a balance between snap decisions and broad participation.
          </>
        }
      />

      <BackgroundExpander
        title="Background — Conway governance in one paragraph"
        body={
          <>
            <p>
              The Chang hard fork (Sep 2024) activated CIP-1694: a three-body governance system
              made of <strong>DReps</strong> (delegated representatives chosen by ADA holders),
              <strong> SPOs</strong> (stake-pool operators voting on behalf of their pools), and a{" "}
              <strong>Constitutional Committee</strong> that must co-sign any change. Each
              proposal has a fixed lifetime; thresholds for ratification are themselves
              parameter-tunable.
            </p>
            <p>
              Voting thresholds (e.g. <code>dvtMotionNoConfidence</code>,{" "}
              <code>pvtCommitteeNormal</code>) aren't surfaced on this page yet — they live in a
              richer protocol-parameter shape that will be wired in a follow-up.
            </p>
          </>
        }
        sources={[
          { label: "CIP-1694 (governance)", href: "https://cips.cardano.org/cip/CIP-1694" },
          { label: "Cardano docs · governance", href: "https://docs.cardano.org/about-cardano/learn/cardano-governance" }
        ]}
      />
    </SectionShell>
  );
};
