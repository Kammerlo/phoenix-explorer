import { Box, Tooltip, Typography, alpha, useTheme } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";

import { AccentRole, accentColor } from "../playground/liveContext";

interface Props {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  description: string;
  accent: AccentRole;
  /** Optional secondary value rendered beneath the main value (e.g. ADA equivalent). */
  subValue?: string;
}

/**
 * Format a parameter value for display.
 *
 * `toLocaleString()` defaults to ≤3 fraction digits, which silently rounds
 * small fractions like `priceStep = 0.0000721` to `"0"`. We pick the decimal
 * count from the value's magnitude so sub-1 numbers always show their
 * leading non-zero digits.
 */
const fmt = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "—";
    const abs = Math.abs(v);
    if (abs === 0) return "0";
    if (abs >= 1) return v.toLocaleString();
    // Magnitude of the leading digit; e.g. 0.0000721 → -5.
    const magnitude = Math.floor(Math.log10(abs));
    const decimals = Math.min(20, Math.max(3, 2 - magnitude));
    return v.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  }
  return String(v);
};

/**
 * A single parameter tile — name + value + unit + description.
 *
 * Used as the canonical visual for each protocol parameter inside a section.
 * Hover lifts the card slightly via framer-motion and warms the accent ring.
 */
export const ParamCard = ({ label, value, unit, description, accent, subValue }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(accent, theme);
  const reduced = useReducedMotion();

  return (
    <Box
      component={motion.div}
      whileHover={reduced ? undefined : { y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      sx={{
        position: "relative",
        flex: "1 1 200px",
        minWidth: { xs: "100%", sm: 200 },
        borderRadius: 1.5,
        p: { xs: 1.75, sm: 2 },
        bgcolor: theme.isDark
          ? alpha(theme.palette.background.paper, 0.4)
          : alpha(theme.palette.background.paper, 0.7),
        border: `1px solid ${alpha(accentCss, theme.isDark ? 0.3 : 0.22)}`,
        backdropFilter: "blur(6px)",
        transition: "border-color 200ms ease, box-shadow 200ms ease",
        "&:hover": {
          borderColor: alpha(accentCss, 0.5),
          boxShadow: `0 6px 24px -8px ${alpha(accentCss, theme.isDark ? 0.4 : 0.25)}`
        }
      }}
    >
      <Typography
        variant="overline"
        sx={{
          color: accentCss,
          fontFamily: "monospace",
          fontWeight: 700,
          fontSize: "0.7rem",
          letterSpacing: "0.05em",
          lineHeight: 1.4
        }}
      >
        {label}
      </Typography>
      <Box display="flex" alignItems="baseline" gap={0.75} mt={0.25} flexWrap="wrap">
        <Tooltip title={typeof value === "number" ? value.toLocaleString() : ""} disableHoverListener={typeof value !== "number"}>
          <Typography
            variant="h6"
            component="span"
            fontWeight={700}
            sx={{
              fontFamily: "monospace",
              color: "text.primary",
              fontVariantNumeric: "tabular-nums"
            }}
          >
            {fmt(value)}
          </Typography>
        </Tooltip>
        {unit && (
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.7rem" }}
          >
            {unit}
          </Typography>
        )}
      </Box>
      {subValue && (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ fontVariantNumeric: "tabular-nums" }}
        >
          {subValue}
        </Typography>
      )}
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        mt={1}
        sx={{ lineHeight: 1.5 }}
      >
        {description}
      </Typography>
    </Box>
  );
};
