import { Box, Typography, alpha, useTheme } from "@mui/material";
import { ComponentType } from "react";

import { AccentRole, accentColor } from "../playground/liveContext";

interface Props {
  Icon: ComponentType<{ size?: number | string }>;
  title: string;
  intent: string;
  accent: AccentRole;
}

/**
 * Section title row: tinted icon chip + headline + one-line intent.
 *
 * Kept dense — the section's "Why this matters" paragraph lives below this
 * component, not inside it.
 */
export const SectionHeader = ({ Icon, title, intent, accent }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(accent, theme);

  return (
    <Box display="flex" gap={2} alignItems="flex-start" mb={2.5}>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 1.5,
          flexShrink: 0,
          bgcolor: alpha(accentCss, theme.isDark ? 0.18 : 0.12),
          color: accentCss,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `inset 0 0 0 1px ${alpha(accentCss, 0.3)}`
        }}
      >
        <Icon size={22} />
      </Box>
      <Box minWidth={0}>
        <Typography
          variant="h5"
          component="h2"
          fontWeight={700}
          sx={{ letterSpacing: "-0.01em", color: "text.primary", lineHeight: 1.15 }}
        >
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5} sx={{ lineHeight: 1.5 }}>
          {intent}
        </Typography>
      </Box>
    </Box>
  );
};
