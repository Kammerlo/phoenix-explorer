import { Box, Typography, alpha, useTheme } from "@mui/material";
import {
  IoFlashOutline,
  IoLayersOutline,
  IoLeafOutline,
  IoPulseOutline,
  IoSparklesOutline,
  IoTrendingUpOutline
} from "react-icons/io5";

import { eraForVersion } from "../playground/liveContext";
import {
  AVG_BLOCK_TIME_SECONDS,
  lovelaceToAda,
  tpsEstimate,
  txFeeLovelace
} from "../playground/calculations";
import { HeroStatTile } from "./HeroStatTile";

// @ts-ignore — TProtocolParam is a global declaration
import { TProtocolParam } from "src/types/protocol";

interface Props {
  params: TProtocolParam;
  epoch?: number | null;
}

const num = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Top of the page: title, the Live · Epoch N badge with a pulsing dot, and
 * six count-up stat tiles distilling the most-quoted parameters.
 *
 * The tile values are derived once from the incoming `params`. Re-mounting
 * the hero on prop change re-runs the count-up, which gives "live refresh"
 * a tactile feel without expensive logic.
 */
export const Hero = ({ params, epoch }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };

  const minFee300 = lovelaceToAda(txFeeLovelace(300, num(params.minFeeA), num(params.minFeeB)));
  const tpsAt330 = tpsEstimate(num(params.maxBlockSize) || num(params.maxBBSize), 330);
  const era = eraForVersion(num(params.protocolMajor));

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: 3,
        overflow: "hidden",
        p: { xs: 2.5, sm: 4, md: 5 },
        mb: { xs: 3, md: 4 },
        bgcolor: theme.isDark
          ? alpha(theme.palette.background.paper, 0.45)
          : alpha(theme.palette.primary.main, 0.04),
        border: `1px solid ${alpha(theme.palette.primary.main, theme.isDark ? 0.25 : 0.15)}`,
        backgroundImage: `radial-gradient(80% 80% at 0% 0%, ${alpha(
          theme.palette.primary.main,
          theme.isDark ? 0.22 : 0.1
        )}, transparent 60%), radial-gradient(60% 60% at 100% 0%, ${alpha(
          theme.palette.info.main,
          theme.isDark ? 0.18 : 0.08
        )}, transparent 65%)`
      }}
    >
      <Box
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        mb={{ xs: 2.5, md: 3 }}
      >
        <Box maxWidth={680}>
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap" mb={1}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.25,
                py: 0.4,
                borderRadius: 999,
                bgcolor: alpha(theme.palette.success.main, theme.isDark ? 0.18 : 0.1),
                border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: theme.palette.success.main
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: theme.palette.success.main,
                  "@keyframes ppLivePulse": {
                    "0%, 100%": { boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0.55)}` },
                    "50%": { boxShadow: `0 0 0 6px ${alpha(theme.palette.success.main, 0)}` }
                  },
                  animation: "ppLivePulse 2s ease-in-out infinite",
                  "@media (prefers-reduced-motion: reduce)": {
                    animation: "none"
                  }
                }}
              />
              <Box component="span">LIVE</Box>
              {typeof epoch === "number" && epoch > 0 && (
                <Box component="span" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  · Epoch {epoch.toLocaleString()}
                </Box>
              )}
            </Box>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 1.25,
                py: 0.4,
                borderRadius: 999,
                bgcolor: alpha(theme.palette.primary.main, theme.isDark ? 0.2 : 0.08),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: theme.palette.primary.main
              }}
            >
              {era.name} · v{num(params.protocolMajor)}.{num(params.protocolMinor)}
            </Box>
          </Box>
          <Typography
            variant="h3"
            component="h1"
            fontWeight={800}
            sx={{
              letterSpacing: "-0.025em",
              fontSize: { xs: "2rem", sm: "2.4rem", md: "2.75rem" },
              lineHeight: 1.05
            }}
          >
            Protocol Parameters
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            mt={1.25}
            sx={{ maxWidth: 640, lineHeight: 1.55 }}
          >
            The 30+ knobs that govern Cardano. Live values, real-world examples, and interactive
            simulators for fees, throughput, deposits, rewards, pools, scripts, and governance.
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(6, 1fr)"
          },
          gap: { xs: 1.25, sm: 1.5, md: 1.75 }
        }}
      >
        <HeroStatTile
          label="Pool target k"
          value={num(params.nOpt)}
          context="Saturation point = total stake / k"
          Icon={IoLayersOutline}
          accent="primary"
          tooltip="The 'desired number of pools' parameter from the Shelley delegation paper. Stake spreads thinner as k grows."
        />
        <HeroStatTile
          label="Reward rate ρ"
          value={num(params.rho) * 100}
          decimals={3}
          suffix="%"
          context="Of remaining reserves minted each epoch"
          Icon={IoTrendingUpOutline}
          accent="success"
          tooltip="Monetary expansion rate. Reserves drain multiplicatively each epoch by ρ."
        />
        <HeroStatTile
          label="Treasury cut τ"
          value={num(params.tau) * 100}
          decimals={1}
          suffix="%"
          context="Of epoch rewards routed to treasury"
          Icon={IoLeafOutline}
          accent="info"
          tooltip="Treasury growth rate. Funds the Cardano treasury for governance-approved spending."
        />
        <HeroStatTile
          label="Min fee · 300 B"
          value={minFee300}
          decimals={3}
          suffix="ADA"
          context="A typical wallet → wallet send"
          Icon={IoFlashOutline}
          accent="warning"
          tooltip="Computed live: minFeeB + 300 × minFeeA, converted to ADA."
        />
        <HeroStatTile
          label="Pledge influence a₀"
          value={num(params.a0)}
          decimals={2}
          context="Higher pledge → bigger reward bonus"
          Icon={IoSparklesOutline}
          accent="violet"
          tooltip="Linear-ish coefficient on pledge in the pool reward formula. Pledge alignment matters."
        />
        <HeroStatTile
          label="Peak TPS · empirical"
          value={tpsAt330}
          decimals={1}
          context={`At ~${AVG_BLOCK_TIME_SECONDS}s blocks · 330 B avg tx`}
          Icon={IoPulseOutline}
          accent="secondary"
          tooltip="Theoretical peak: maxBlockSize ÷ avg-tx-bytes ÷ avg block time. Real-world TPS depends on traffic mix."
        />
      </Box>
    </Box>
  );
};
