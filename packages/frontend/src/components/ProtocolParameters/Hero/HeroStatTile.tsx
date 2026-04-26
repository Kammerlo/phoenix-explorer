import { Box, Tooltip, Typography, alpha, useTheme } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import { ComponentType, ReactNode } from "react";
import CountUp from "react-countup";

import { AccentRole, accentColor } from "../playground/liveContext";

interface Props {
  label: string;
  /** Numeric value used by CountUp. */
  value: number;
  /** How many decimals CountUp should animate to. */
  decimals?: number;
  /** Optional unit / suffix shown next to the value (e.g. "%", "ADA"). */
  suffix?: string;
  /** Optional prefix (e.g. "v", "≈"). */
  prefix?: string;
  /** Single-sentence sub-description rendered below the value. */
  context: ReactNode;
  Icon: ComponentType<{ size?: number | string }>;
  accent: AccentRole;
  /** Optional hint shown in a tooltip on hover. */
  tooltip?: string;
}

/**
 * One tile in the hero strip. Animates count-up on entry and lifts subtly
 * on hover. Background is a soft accent wash; corner glyph is the section
 * icon at low opacity for a discreet visual marker.
 */
export const HeroStatTile = ({
  label,
  value,
  decimals = 0,
  suffix,
  prefix,
  context,
  Icon,
  accent,
  tooltip
}: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(accent, theme);
  const reduced = useReducedMotion();

  const tile = (
    <Box
      component={motion.div}
      whileHover={reduced ? undefined : { y: -3 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 2,
        p: { xs: 1.75, sm: 2.25 },
        bgcolor: theme.isDark
          ? alpha(theme.palette.background.paper, 0.5)
          : alpha(theme.palette.background.paper, 0.85),
        border: `1px solid ${alpha(accentCss, theme.isDark ? 0.3 : 0.22)}`,
        backdropFilter: "blur(8px)",
        backgroundImage: `radial-gradient(120% 120% at 0% 0%, ${alpha(
          accentCss,
          theme.isDark ? 0.18 : 0.1
        )}, transparent 55%)`,
        boxShadow: theme.isDark ? `0 1px 0 0 ${alpha("#fff", 0.04)} inset` : "none",
        transition: "border-color 200ms ease",
        "&:hover": {
          borderColor: alpha(accentCss, 0.45),
          boxShadow: `0 12px 32px -16px ${alpha(accentCss, theme.isDark ? 0.6 : 0.35)}`
        }
      }}
    >
      <Box
        sx={{
          position: "absolute",
          right: -10,
          bottom: -14,
          color: alpha(accentCss, theme.isDark ? 0.18 : 0.12),
          pointerEvents: "none"
        }}
      >
        <Icon size={88} />
      </Box>
      <Typography
        variant="overline"
        sx={{
          color: accentCss,
          fontWeight: 700,
          fontSize: "0.66rem",
          letterSpacing: "0.08em",
          display: "block",
          lineHeight: 1.4
        }}
      >
        {label}
      </Typography>
      <Box display="flex" alignItems="baseline" gap={0.5} mt={0.25}>
        {prefix && (
          <Typography
            component="span"
            sx={{ color: accentCss, fontWeight: 700, fontSize: { xs: "1.2rem", sm: "1.4rem" } }}
          >
            {prefix}
          </Typography>
        )}
        <Typography
          component="span"
          sx={{
            color: "text.primary",
            fontWeight: 800,
            fontSize: { xs: "1.6rem", sm: "1.85rem" },
            letterSpacing: "-0.01em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.1
          }}
        >
          <CountUp
            end={value}
            duration={reduced ? 0 : 1.4}
            decimals={decimals}
            separator=","
            preserveValue
          />
        </Typography>
        {suffix && (
          <Typography
            component="span"
            sx={{
              color: alpha(accentCss, 0.85),
              fontWeight: 600,
              fontSize: { xs: "0.85rem", sm: "0.95rem" }
            }}
          >
            {suffix}
          </Typography>
        )}
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mt: 0.75, lineHeight: 1.45, position: "relative", zIndex: 1 }}
      >
        {context}
      </Typography>
    </Box>
  );

  return tooltip ? (
    <Tooltip title={tooltip} arrow placement="top">
      {tile}
    </Tooltip>
  ) : (
    tile
  );
};
