import { Box, InputAdornment, Slider, TextField, Typography, alpha, useTheme } from "@mui/material";
import { useMemo, useState } from "react";

import { BackgroundExpander } from "../Common/BackgroundExpander";
import { LiveAnchorStat } from "../Common/LiveAnchorStat";
import { ParamCard } from "../Common/ParamCard";
import { ScenarioPills } from "../Common/ScenarioPills";
import { SectionHeader } from "../Common/SectionHeader";
import { SectionShell } from "../Common/SectionShell";
import { SimulatorPanel } from "../Common/SimulatorPanel";
import { WhatIfExpander } from "../Common/WhatIfExpander";
import { lovelaceToAda, txFeeLovelace } from "../playground/calculations";
import { FEES_SCENARIOS } from "../playground/scenarios";
import { SECTIONS, accentColor } from "../playground/liveContext";

// @ts-ignore — TProtocolParam is a global declaration
import { TProtocolParam } from "src/types/protocol";

interface Props {
  params: TProtocolParam;
}

const num = (v: string | number | null | undefined): number => Number(v) || 0;

const SECTION = SECTIONS.find((s) => s.id === "fees")!;

export const FeesSection = ({ params }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(SECTION.accent, theme);

  const minFeeA = num(params.minFeeA);
  const minFeeB = num(params.minFeeB);

  const [scenarioId, setScenarioId] = useState(FEES_SCENARIOS[0].id);
  const [txBytes, setTxBytes] = useState(FEES_SCENARIOS[0].txBytes);

  const feeLovelace = useMemo(
    () => txFeeLovelace(txBytes, minFeeA, minFeeB),
    [txBytes, minFeeA, minFeeB]
  );
  const feeAda = lovelaceToAda(feeLovelace);

  // Anchor uses the empirical "wallet send" scenario as a relatable headline.
  const anchorAda = lovelaceToAda(txFeeLovelace(300, minFeeA, minFeeB));
  const dexFeeNow = lovelaceToAda(txFeeLovelace(1400, minFeeA, minFeeB));
  const dexFeeIfDoubled = lovelaceToAda(txFeeLovelace(1400, minFeeA * 2, minFeeB));

  const handleScenario = (id: string) => {
    const next = FEES_SCENARIOS.find((s) => s.id === id);
    if (!next) return;
    setScenarioId(id);
    setTxBytes(next.txBytes);
  };

  return (
    <SectionShell id={SECTION.id} accent={SECTION.accent}>
      <SectionHeader
        Icon={SECTION.Icon}
        title="Transaction Fees"
        intent="Every Cardano transaction pays a deterministic fee proportional to its size."
        accent={SECTION.accent}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.65, maxWidth: 760 }}>
        Cardano fees are <Box component="strong" color="text.primary">deterministic</Box> — anyone
        can compute them up-front from <code>minFeeB + bytes × minFeeA</code>. There's no priority
        gas auction. Bigger transactions cost more because they take more bytes to relay.
      </Typography>

      <LiveAnchorStat
        accent={SECTION.accent}
        prefix="≈"
        value={anchorAda}
        decimals={3}
        unit="ADA"
        caption={
          <>
            for a typical wallet → wallet send (300 bytes). A DEX swap is ~
            <Box component="strong" color="text.primary">{dexFeeNow.toFixed(3)} ADA</Box> at this
            size budget.
          </>
        }
      />

      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        <ParamCard
          label="minFeeA"
          value={minFeeA}
          unit="lovelace / byte"
          accent={SECTION.accent}
          description="Per-byte coefficient. The fee grows linearly with transaction size."
        />
        <ParamCard
          label="minFeeB"
          value={minFeeB}
          unit="lovelace"
          accent={SECTION.accent}
          subValue={`= ${(minFeeB / 1_000_000).toFixed(6)} ADA`}
          description="Fixed base fee charged on every transaction regardless of size."
        />
      </Box>

      <ScenarioPills
        items={FEES_SCENARIOS}
        selectedId={scenarioId}
        onSelect={handleScenario}
        accent={SECTION.accent}
        caption="Try a realistic transaction"
      />

      <SimulatorPanel
        accent={SECTION.accent}
        inputs={
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Transaction size
            </Typography>
            <TextField
              type="number"
              size="small"
              value={txBytes}
              onChange={(e) =>
                setTxBytes(Math.max(50, Math.min(16384, Number(e.target.value) || 300)))
              }
              sx={{ width: 130, mt: 0.75, mb: 1.5 }}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">B</InputAdornment> }
              }}
            />
            <Slider
              value={txBytes}
              min={100}
              max={16384}
              step={20}
              onChange={(_, v) => setTxBytes(v as number)}
              sx={{ color: accentCss }}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v.toLocaleString()} B`}
            />
            <Typography variant="caption" color="text.disabled">
              Sliders accept any size up to <code>maxTxSize</code>.
            </Typography>
          </Box>
        }
        result={
          <Box>
            <Typography
              variant="body2"
              sx={{ fontFamily: "monospace", lineHeight: 1.6, color: "text.secondary" }}
            >
              <Box component="span" sx={{ color: "text.primary", fontWeight: 700 }}>
                {minFeeB.toLocaleString()}
              </Box>
              {" + "}
              <Box component="span" sx={{ color: "text.primary", fontWeight: 700 }}>
                {txBytes.toLocaleString()}
              </Box>
              {" × "}
              <Box component="span" sx={{ color: "text.primary", fontWeight: 700 }}>
                {minFeeA}
              </Box>
              {" lovelace"}
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
            <Box
              mt={1.5}
              sx={{
                p: 1.25,
                borderRadius: 1,
                bgcolor: alpha(accentCss, theme.isDark ? 0.12 : 0.06),
                border: `1px dashed ${alpha(accentCss, 0.35)}`
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Cost is fully predictable before you submit. Wallets quote this exact amount.
              </Typography>
            </Box>
          </Box>
        }
      />

      <WhatIfExpander
        accent={SECTION.accent}
        prompt="What if Cardano doubled the per-byte fee?"
        body={
          <>
            A DEX swap (~1.4 KB) would jump from{" "}
            <Box component="strong" color="text.primary">{dexFeeNow.toFixed(3)} ADA</Box> to{" "}
            <Box component="strong" color="text.primary">{dexFeeIfDoubled.toFixed(3)} ADA</Box>.
            Wallet sends would barely move (their cost is dominated by the fixed base fee). Doubling{" "}
            <code>minFeeA</code> is a way to discourage block-bloating contract patterns without
            touching everyday users.
          </>
        }
      />

      <BackgroundExpander
        title="Background — how Cardano fees got here"
        body={
          <>
            <p>
              Shelley (2020) introduced the <code>minFeeA × bytes + minFeeB</code> formula. Unlike
              Ethereum's gas auction, Cardano's fee is fixed at submission time — a property the
              Plutus ledger relies on for its deterministic execution model.
            </p>
            <p>
              The current values (<code>minFeeA = 44</code>, <code>minFeeB = 155 381</code>) have
              held since the Mary hard fork. Native asset metadata, datums, and reference scripts
              all add bytes — which is why a DEX swap costs noticeably more than a vanilla send.
            </p>
          </>
        }
        sources={[
          { label: "CIP-9 (parameter update)", href: "https://cips.cardano.org/cip/CIP-0009" },
          { label: "Cardano docs · fees", href: "https://docs.cardano.org/about-cardano/explore-more/fee-structure" }
        ]}
      />
    </SectionShell>
  );
};
