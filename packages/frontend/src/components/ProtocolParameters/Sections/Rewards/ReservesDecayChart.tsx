import { Box, LinearProgress, Typography, alpha, useTheme } from "@mui/material";
import { useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { AccentRole, accentColor } from "../../playground/liveContext";
import {
  EPOCHS_PER_YEAR,
  projectReserves,
  tpsNeededForRewardsAda
} from "../../playground/calculations";

interface Props {
  /** Initial reserves in ADA (driven by the simulator's reserves slider). */
  initialReservesAda: number;
  rho: number;
  tau: number;
  accent: AccentRole;
  /** Years to project. Default: 25. */
  years?: number;
  /**
   * Average per-tx fee assumed for the TPS calculation (ADA). Constant —
   * matches the empirical 300 B wallet send.
   */
  avgFeeAda: number;
  /** User's chosen sustained TPS — for the coverage bar. */
  currentTps: number;
}

const fmtBillions = (v: number) => `${v.toFixed(1)} B`;
const fmtMillions = (v: number) =>
  v >= 1
    ? `${v.toFixed(1)} M`
    : v >= 0.1
      ? `${(v * 1000).toFixed(0)} k`
      : `${(v * 1_000_000).toFixed(0)}`;

/**
 * Three things the user asked to see, three explicit zones:
 *
 *   1. SNAPSHOT — what's happening right now: reserves, rewards, TPS needed.
 *   2. CHART    — reserves draining over the next 25 years.
 *   3. TPS BLOCK — required TPS to fund rewards from fees alone, with the
 *                  user's chosen TPS rendered as coverage on the same scale.
 *
 * One curve in the chart (reserves only) — every other number lives in text.
 */
export const ReservesDecayChart = ({
  initialReservesAda,
  rho,
  tau,
  accent,
  years = 25,
  avgFeeAda,
  currentTps
}: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(accent, theme);
  const okColor = theme.palette.success.main;
  const badColor = theme.palette.error.main;
  const reduced = useReducedMotion();

  const data = useMemo(
    () =>
      projectReserves(
        initialReservesAda,
        rho,
        tau,
        Math.round(years * EPOCHS_PER_YEAR),
        25
      ),
    [initialReservesAda, rho, tau, years]
  );

  const todayReservesB = data[0]?.reservesB ?? 0;
  const todayRewardsM = data[0]?.rewardsM ?? 0;
  const futureReservesB = data[data.length - 1]?.reservesB ?? 0;
  const futureRewardsM = data[data.length - 1]?.rewardsM ?? 0;

  // Year at which reserves drop to ≤1% of today — effectively "nearly empty".
  // Solve (1 − ρ)^n = 0.01 for n. Returns null if outside the chart horizon.
  const nearlyEmptyYear = useMemo(() => {
    if (rho <= 0 || rho >= 1) return null;
    const n = Math.log(0.01) / Math.log(1 - rho);
    const y = n / EPOCHS_PER_YEAR;
    return Number.isFinite(y) && y > 0 ? y : null;
  }, [rho]);
  const nearlyEmptyInRange =
    typeof nearlyEmptyYear === "number" && nearlyEmptyYear > 0 && nearlyEmptyYear <= years;

  const todayRewardsAda = todayRewardsM * 1_000_000;
  const tpsNeeded = useMemo(
    () => tpsNeededForRewardsAda(todayRewardsAda, avgFeeAda),
    [todayRewardsAda, avgFeeAda]
  );
  const coveragePct = tpsNeeded > 0 ? Math.min(100, (currentTps / tpsNeeded) * 100) : 0;
  const sustainable = currentTps >= tpsNeeded && tpsNeeded > 0;
  const verdictColor = sustainable ? okColor : badColor;

  const gridColor = alpha(theme.palette.text.primary, theme.isDark ? 0.12 : 0.08);
  const axisColor = alpha(theme.palette.text.primary, 0.55);

  return (
    <Box sx={{ width: "100%" }}>
      {/* ─── 1. SNAPSHOT ─── what's happening right now */}
      <Box
        sx={{
          mb: 1.5,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 1.5,
          bgcolor: alpha(accentCss, theme.isDark ? 0.1 : 0.04),
          border: `1px solid ${alpha(accentCss, 0.25)}`
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: accentCss, fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.08em", display: "block", mb: 0.5 }}
        >
          Today's snapshot
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={{ xs: 1.5, sm: 3 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Reserves remaining
            </Typography>
            <Typography
              fontWeight={800}
              sx={{
                color: accentCss,
                fontSize: "1.4rem",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums"
              }}
            >
              {fmtBillions(todayReservesB)} ADA
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Rewards paid each epoch
            </Typography>
            <Typography
              fontWeight={800}
              sx={{
                color: accentCss,
                fontSize: "1.4rem",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums"
              }}
            >
              {fmtMillions(todayRewardsM)} ADA
            </Typography>
            <Typography variant="caption" color="text.disabled">
              = reserves × ρ × (1 − τ)
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ─── 2. CHART ─── how the reserves drain */}
      <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
        Reserves draining over the next {years} years.
      </Typography>
      <Box sx={{ width: "100%", height: { xs: 220, sm: 260, md: 280 } }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 16, right: 32, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="ppReservesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentCss} stopOpacity={0.5} />
                <stop offset="100%" stopColor={accentCss} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="years"
              type="number"
              domain={[0, years]}
              tickFormatter={(v) => `${Math.round(v)}y`}
              stroke={axisColor}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={fmtBillions}
              stroke={axisColor}
              tick={{ fontSize: 11 }}
              label={{
                value: "Reserves (ADA)",
                angle: -90,
                position: "insideLeft",
                offset: 14,
                style: { fontSize: 11, fill: axisColor }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${alpha(theme.palette.text.primary, 0.15)}`,
                borderRadius: 8,
                fontSize: 12
              }}
              labelFormatter={(label) =>
                `~${Number(label).toFixed(1)} years from now`
              }
              formatter={(value: number, _name: string, item: { payload?: { rewardsM?: number } }) => {
                const rewards = item?.payload?.rewardsM ?? 0;
                return [
                  `${fmtBillions(value)} ADA reserves · ${fmtMillions(rewards)} ADA / epoch`,
                  ""
                ];
              }}
            />
            <Area
              type="monotone"
              dataKey="reservesB"
              name="Reserves"
              stroke={accentCss}
              strokeWidth={2.5}
              fill="url(#ppReservesFill)"
              isAnimationActive={!reduced}
              animationDuration={500}
            />
            <ReferenceDot
              x={0}
              y={todayReservesB}
              r={5}
              fill={accentCss}
              stroke={theme.palette.background.paper}
              strokeWidth={2}
              label={{
                value: `Today · ${fmtBillions(todayReservesB)}`,
                position: "right",
                fill: accentCss,
                fontSize: 11,
                fontWeight: 700,
                offset: 8
              }}
            />
            <ReferenceDot
              x={years}
              y={futureReservesB}
              r={4}
              fill={alpha(accentCss, 0.6)}
              stroke={theme.palette.background.paper}
              strokeWidth={2}
              label={{
                value: `In ${years}y · ${fmtBillions(futureReservesB)} (${fmtMillions(futureRewardsM)} / epoch)`,
                position: "left",
                fill: alpha(theme.palette.text.primary, 0.65),
                fontSize: 11,
                fontWeight: 600,
                offset: 8
              }}
            />
            {nearlyEmptyInRange && (
              <ReferenceLine
                x={nearlyEmptyYear as number}
                stroke={badColor}
                strokeWidth={2}
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
                label={{
                  value: `Nearly empty · year ${(nearlyEmptyYear as number).toFixed(0)}`,
                  position: "insideTop",
                  fill: badColor,
                  fontSize: 11,
                  fontWeight: 700,
                  offset: -2
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      {/* ─── 3. TPS BLOCK ─── how many TPS to be fee-sustainable */}
      <Box
        sx={{
          mt: 2,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 1.5,
          bgcolor: alpha(verdictColor, theme.isDark ? 0.1 : 0.04),
          border: `1px solid ${alpha(verdictColor, 0.3)}`
        }}
      >
        <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={1} flexWrap="wrap" mb={1}>
          <Typography
            variant="overline"
            sx={{ color: verdictColor, fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.08em" }}
          >
            TPS needed to fund rewards from fees alone
          </Typography>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              px: 1,
              py: 0.25,
              borderRadius: 999,
              bgcolor: alpha(verdictColor, theme.isDark ? 0.2 : 0.1),
              border: `1px solid ${alpha(verdictColor, 0.45)}`,
              color: verdictColor,
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase"
            }}
          >
            {sustainable ? "Sustainable" : "Not Sustainable"}
          </Box>
        </Box>
        <Box display="flex" flexWrap="wrap" gap={{ xs: 1.5, sm: 3 }} alignItems="baseline" mb={1.5}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Need
            </Typography>
            <Typography
              fontWeight={800}
              sx={{
                color: verdictColor,
                fontSize: "1.6rem",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums"
              }}
            >
              ≈ {Math.round(tpsNeeded).toLocaleString()} TPS
            </Typography>
            <Typography variant="caption" color="text.disabled" display="block">
              at avg {avgFeeAda.toFixed(3)} ADA / tx
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              You're at
            </Typography>
            <Typography
              fontWeight={800}
              sx={{
                color: "text.primary",
                fontSize: "1.6rem",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums"
              }}
            >
              {currentTps.toLocaleString()} TPS
            </Typography>
            <Typography variant="caption" color="text.disabled" display="block">
              {coveragePct.toFixed(1)}% of what's needed
            </Typography>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, coveragePct)}
          sx={{
            height: 10,
            borderRadius: 1,
            bgcolor: alpha(verdictColor, theme.isDark ? 0.18 : 0.1),
            "& .MuiLinearProgress-bar": { bgcolor: verdictColor }
          }}
        />
        <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
          {sustainable
            ? "At this TPS, fees alone already cover today's reward budget — reserves wouldn't need to drain to keep paying SPOs."
            : `At this TPS, fees only cover ${coveragePct.toFixed(0)}% of today's rewards. The rest is paid out of reserves until they decay enough to match.`}
        </Typography>
      </Box>
    </Box>
  );
};
