import { Box, Typography, alpha, useTheme } from "@mui/material";
import { useReducedMotion } from "framer-motion";
import { ReactNode } from "react";
import CountUp from "react-countup";

import { AccentRole, accentColor } from "../playground/liveContext";

interface Props {
  /** Numeric headline value. Animates with CountUp on entry. */
  value: number;
  /** Decimals shown in the count-up. */
  decimals?: number;
  /** Optional unit appended after the number (e.g. "ADA", "%", "TPS"). */
  unit?: string;
  /** Optional prefix (e.g. "≈"). */
  prefix?: string;
  /** Sentence framing the number — supports inline ReactNode for emphasis. */
  caption: ReactNode;
  /** Whether the underlying figure is an estimate, not directly observed. */
  estimate?: boolean;
  accent: AccentRole;
  /** Use SI suffixes (k, M, B) instead of fixed decimals. */
  abbreviated?: boolean;
}

const SI_SUFFIXES: [number, string][] = [
  [1_000_000_000, "B"],
  [1_000_000, "M"],
  [1_000, "k"]
];

const abbreviate = (n: number, decimals = 2): { value: number; suffix: string } => {
  for (const [div, suffix] of SI_SUFFIXES) {
    if (Math.abs(n) >= div) {
      return { value: Number((n / div).toFixed(decimals)), suffix };
    }
  }
  return { value: Number(n.toFixed(decimals)), suffix: "" };
};

/**
 * The big animated headline number that opens every section.
 *
 * `react-countup` handles the entrance animation; the surrounding caption
 * is intentionally rendered as plain text to keep the line scannable.
 */
export const LiveAnchorStat = ({
  value,
  decimals = 0,
  unit,
  prefix,
  caption,
  estimate = false,
  accent,
  abbreviated = false
}: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(accent, theme);
  const reduced = useReducedMotion();

  const target = abbreviated ? abbreviate(value, decimals) : { value, suffix: "" };

  return (
    <Box
      sx={{
        borderRadius: 2,
        bgcolor: alpha(accentCss, theme.isDark ? 0.1 : 0.06),
        border: `1px dashed ${alpha(accentCss, 0.45)}`,
        p: { xs: 2, sm: 2.5 },
        mb: 3
      }}
    >
      <Box display="flex" alignItems="baseline" flexWrap="wrap" gap={1}>
        {prefix && (
          <Typography
            component="span"
            fontWeight={700}
            sx={{ color: accentCss, fontSize: { xs: "1.6rem", sm: "2.1rem" } }}
          >
            {prefix}
          </Typography>
        )}
        <Typography
          component="span"
          fontWeight={800}
          sx={{
            color: accentCss,
            fontSize: { xs: "2.1rem", sm: "2.8rem" },
            lineHeight: 1.05,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em"
          }}
        >
          <CountUp
            end={target.value}
            duration={reduced ? 0 : 1.6}
            decimals={decimals}
            separator=","
            preserveValue
          />
          {target.suffix && (
            <Box component="span" sx={{ ml: 0.25 }}>
              {target.suffix}
            </Box>
          )}
        </Typography>
        {unit && (
          <Typography
            component="span"
            sx={{
              color: alpha(accentCss, 0.85),
              fontWeight: 600,
              fontSize: { xs: "1rem", sm: "1.15rem" }
            }}
          >
            {unit}
          </Typography>
        )}
        {estimate && (
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: "italic", ml: 0.5 }}
          >
            (estimate)
          </Typography>
        )}
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 1, lineHeight: 1.55, maxWidth: 720 }}
      >
        {caption}
      </Typography>
    </Box>
  );
};
