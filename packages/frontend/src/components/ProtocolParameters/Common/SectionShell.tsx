import { Box, alpha, useTheme } from "@mui/material";
import { ReactNode } from "react";

import { AccentRole, accentColor } from "../playground/liveContext";

interface Props {
  id: string;
  accent: AccentRole;
  children: ReactNode;
}

/**
 * Visual shell for each protocol-parameter section.
 *
 * Static panel with a 3 px accent stripe on the left edge and a subtle
 * accent-tinted background. Tab-swap animation is owned by the page-level
 * `AnimatePresence` wrapper, so this component stays visually neutral.
 */
export const SectionShell = ({ id, accent, children }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(accent, theme);

  return (
    <Box
      component="section"
      id={id}
      sx={{
        position: "relative",
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: alpha(accentCss, theme.isDark ? 0.05 : 0.025),
        border: `1px solid ${alpha(accentCss, theme.isDark ? 0.22 : 0.18)}`,
        p: { xs: 2.25, sm: 3, md: 4 },
        // Left accent stripe.
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          width: 3,
          right: "auto",
          background: `linear-gradient(180deg, ${alpha(accentCss, 0.85)}, ${alpha(
            accentCss,
            0
          )})`
        }
      }}
    >
      {children}
    </Box>
  );
};
