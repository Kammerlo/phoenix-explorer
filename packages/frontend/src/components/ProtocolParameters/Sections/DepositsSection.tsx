import { Box, Typography, alpha, useTheme } from "@mui/material";
import { useMemo, useState } from "react";

import { BackgroundExpander } from "../Common/BackgroundExpander";
import { LiveAnchorStat } from "../Common/LiveAnchorStat";
import { ParamCard } from "../Common/ParamCard";
import { ScenarioPills } from "../Common/ScenarioPills";
import { SectionHeader } from "../Common/SectionHeader";
import { SectionShell } from "../Common/SectionShell";
import { SimulatorPanel } from "../Common/SimulatorPanel";
import { WhatIfExpander } from "../Common/WhatIfExpander";
import { estimateNetworkDeposits, lovelaceToAda } from "../playground/calculations";
import { DEPOSITS_SCENARIOS } from "../playground/scenarios";
import { SECTIONS, accentColor } from "../playground/liveContext";

// @ts-ignore — TProtocolParam is a global declaration
import { TProtocolParam } from "src/types/protocol";

interface Props {
  params: TProtocolParam;
}

const num = (v: string | number | null | undefined): number => Number(v) || 0;

const SECTION = SECTIONS.find((s) => s.id === "deposits")!;

const fmtAda = (ada: number): string => {
  if (ada >= 1_000_000) return `${(ada / 1_000_000).toFixed(2)} M ADA`;
  if (ada >= 1_000) return `${(ada / 1_000).toFixed(1)} k ADA`;
  return `${ada.toLocaleString(undefined, { maximumFractionDigits: 2 })} ADA`;
};

export const DepositsSection = ({ params }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(SECTION.accent, theme);

  const keyDeposit = num(params.keyDeposit);
  const poolDeposit = num(params.poolDeposit);
  const govActionDeposit = num(params.govActionDeposit);
  const drepDeposit = num(params.drepDeposit);

  const [scenarioId, setScenarioId] = useState(DEPOSITS_SCENARIOS[0].id);
  const scenario = DEPOSITS_SCENARIOS.find((s) => s.id === scenarioId)!;

  const totals = useMemo(
    () => estimateNetworkDeposits(keyDeposit, poolDeposit, govActionDeposit),
    [keyDeposit, poolDeposit, govActionDeposit]
  );

  const scenarioLockedLovelace = useMemo(() => {
    let total = 0;
    if (scenario.participants.includes("key")) total += keyDeposit;
    if (scenario.participants.includes("pool")) total += poolDeposit;
    if (scenario.participants.includes("drep")) total += drepDeposit;
    if (scenario.participants.includes("govAction")) total += govActionDeposit;
    return total;
  }, [scenario, keyDeposit, poolDeposit, drepDeposit, govActionDeposit]);

  const tiles = [
    { id: "key",       label: "keyDeposit",       value: keyDeposit,       desc: "Register a stake key — refunded on deregistration." },
    { id: "pool",      label: "poolDeposit",      value: poolDeposit,      desc: "Register a stake pool — refunded on retirement." },
    { id: "drep",      label: "drepDeposit",      value: drepDeposit,      desc: "Register as a DRep — refunded on retirement." },
    { id: "govAction", label: "govActionDeposit", value: govActionDeposit, desc: "Submit a governance action — refunded if ratified or expired." }
  ];

  return (
    <SectionShell id={SECTION.id} accent={SECTION.accent}>
      <SectionHeader
        Icon={SECTION.Icon}
        title="Participation Deposits"
        intent="Refundable ADA locked while you participate. None of it is burned."
        accent={SECTION.accent}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.65, maxWidth: 760 }}>
        Cardano gates participation behind <Box component="strong" color="text.primary">refundable</Box>{" "}
        deposits — anti-spam tolls that you get back when you exit. They make registrations
        non-disposable without making participation expensive: the only ongoing cost is the
        opportunity cost of locked ADA.
      </Typography>

      <LiveAnchorStat
        accent={SECTION.accent}
        prefix="≈"
        value={lovelaceToAda(totals.totalLockedLovelace)}
        decimals={1}
        unit="ADA"
        abbreviated
        estimate
        caption={
          <>
            currently locked across the network: ~{lovelaceToAda(totals.poolsLockedLovelace).toLocaleString(undefined, { maximumFractionDigits: 0 })} ADA in pool
            registrations, ~{lovelaceToAda(totals.stakeKeysLockedLovelace).toLocaleString(undefined, { maximumFractionDigits: 0 })} ADA in stake-key
            deposits, plus open governance actions. <Box component="strong" color="text.primary">All refundable.</Box>
          </>
        }
      />

      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        {tiles.map((t) => (
          <ParamCard
            key={t.id}
            label={t.label}
            value={t.value}
            unit="lovelace"
            accent={SECTION.accent}
            subValue={`= ${fmtAda(lovelaceToAda(t.value))}`}
            description={t.desc}
          />
        ))}
      </Box>

      <ScenarioPills
        items={DEPOSITS_SCENARIOS}
        selectedId={scenarioId}
        onSelect={setScenarioId}
        accent={SECTION.accent}
        caption="What you'd lock to participate"
      />

      <SimulatorPanel
        accent={SECTION.accent}
        inputsCaption="Scenario"
        resultCaption="ADA you would lock"
        inputs={
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mb: 2 }}>
              {scenario.description}
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              {tiles.map((t) => {
                const active = scenario.participants.includes(t.id as never);
                return (
                  <Box
                    key={t.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      opacity: active ? 1 : 0.32,
                      transition: "opacity 200ms ease"
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: active ? accentCss : alpha(accentCss, 0.3)
                      }}
                    />
                    <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.primary" }}>
                      {t.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                      {fmtAda(lovelaceToAda(t.value))}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        }
        result={
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "2rem",
                color: accentCss,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums"
              }}
            >
              {fmtAda(lovelaceToAda(scenarioLockedLovelace))}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              ≡ {scenarioLockedLovelace.toLocaleString()} lovelace
            </Typography>
            <Box
              mt={2}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.success.main, theme.isDark ? 0.12 : 0.08),
                border: `1px dashed ${alpha(theme.palette.success.main, 0.4)}`
              }}
            >
              <Typography variant="caption" sx={{ color: theme.palette.success.main, fontWeight: 700 }}>
                Returned in full when you exit.
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Deposits are not fees — no ADA is burned.
              </Typography>
            </Box>
          </Box>
        }
      />

      <WhatIfExpander
        accent={SECTION.accent}
        prompt="Why is govActionDeposit so much larger than the others?"
        body={
          <>
            At ~100,000 ADA, the governance-action deposit is the single largest lock on Cardano. It
            exists to prevent proposal spam: ratifying or processing a proposal costs the network
            real coordination work, and a low deposit would invite low-quality submissions. The
            deposit is fully refunded once the action is ratified or expires — so it's a cost only
            for non-serious submitters who let their action lapse without follow-through.
          </>
        }
      />

      <BackgroundExpander
        title="Background — refundable deposits as a design choice"
        body={
          <>
            <p>
              In most ledgers, a registration costs you a permanent fee. Cardano took a different
              path: the cost is locked, not consumed. That keeps barriers low for anyone seriously
              participating while still making it expensive to spam the registration set with
              throwaway entries — a useful asymmetry for an open, permissionless network.
            </p>
            <p>
              Conway introduced two new deposits — <code>drepDeposit</code> for DRep registration
              and <code>govActionDeposit</code> for proposal submission — to extend the same logic
              to governance.
            </p>
          </>
        }
        sources={[
          { label: "CIP-1694 (governance)", href: "https://cips.cardano.org/cip/CIP-1694" },
          { label: "Cardano docs · staking", href: "https://docs.cardano.org/about-cardano/learn/stake-pool-operation" }
        ]}
      />
    </SectionShell>
  );
};
