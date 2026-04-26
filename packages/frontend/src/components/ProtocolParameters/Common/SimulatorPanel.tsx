import { Box, Typography, alpha, useTheme } from "@mui/material";
import { ReactNode } from "react";

import { AccentRole, accentColor } from "../playground/liveContext";

interface Props {
  inputs: ReactNode;
  result: ReactNode;
  accent: AccentRole;
  inputsCaption?: string;
  resultCaption?: string;
}

/**
 * Two-column simulator layout: inputs on the left, result on the right.
 *
 * Stacks vertically on narrow viewports. The right column gets the section
 * accent treatment so the result feels emphasized; the left column stays
 * paper-tinted to keep slider focus subtle.
 */
export const SimulatorPanel = ({
  inputs,
  result,
  accent,
  inputsCaption = "Try it",
  resultCaption = "Result"
}: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(accent, theme);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 1fr) minmax(260px, 1.2fr)" },
        gap: { xs: 2, md: 3 },
        borderRadius: 2,
        overflow: "hidden",
        border: `1px solid ${alpha(accentCss, 0.18)}`
      }}
    >
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          bgcolor: theme.isDark
            ? alpha(theme.palette.background.paper, 0.5)
            : alpha(theme.palette.background.paper, 0.8)
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          display="block"
          sx={{ fontSize: "0.7rem", letterSpacing: "0.06em", mb: 1 }}
        >
          {inputsCaption}
        </Typography>
        {inputs}
      </Box>
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          bgcolor: alpha(accentCss, theme.isDark ? 0.1 : 0.05),
          borderTop: { xs: `1px solid ${alpha(accentCss, 0.18)}`, md: "none" },
          borderLeft: { xs: "none", md: `1px solid ${alpha(accentCss, 0.18)}` }
        }}
      >
        <Typography
          variant="overline"
          sx={{
            color: accentCss,
            display: "block",
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            fontWeight: 700,
            mb: 1
          }}
        >
          {resultCaption}
        </Typography>
        {result}
      </Box>
    </Box>
  );
};
