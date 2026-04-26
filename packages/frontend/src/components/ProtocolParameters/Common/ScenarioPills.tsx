import { Box, Tooltip, Typography, alpha, useTheme } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";

import { AccentRole, accentColor } from "../playground/liveContext";

export interface ScenarioPillItem {
  id: string;
  label: string;
  description?: string;
}

interface Props {
  items: ScenarioPillItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  accent: AccentRole;
  /** Optional label rendered above the pill row. */
  caption?: string;
}

/**
 * Horizontal chip row of named scenario presets — clicking one snaps the
 * surrounding simulator inputs to a realistic preset. The active pill is
 * filled with the section accent; inactive pills sit on a subtle
 * background and animate their border on hover.
 */
export const ScenarioPills = ({ items, selectedId, onSelect, accent, caption }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(accent, theme);
  const reduced = useReducedMotion();

  return (
    <Box mb={2.5}>
      {caption && (
        <Typography
          variant="overline"
          color="text.secondary"
          display="block"
          sx={{ fontSize: "0.7rem", letterSpacing: "0.06em", mb: 0.75 }}
        >
          {caption}
        </Typography>
      )}
      <Box
        display="flex"
        flexWrap="wrap"
        gap={1}
        role="tablist"
        aria-label={caption ?? "Scenarios"}
      >
        {items.map((item) => {
          const active = item.id === selectedId;
          const pill = (
            <Box
              key={item.id}
              component={motion.button}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(item.id)}
              whileHover={reduced ? undefined : { y: -1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              sx={{
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "0.8rem",
                fontWeight: 600,
                lineHeight: 1.3,
                py: 0.65,
                px: 1.5,
                borderRadius: 999,
                border: `1px solid ${active ? accentCss : alpha(accentCss, 0.32)}`,
                bgcolor: active
                  ? accentCss
                  : alpha(accentCss, theme.isDark ? 0.08 : 0.05),
                color: active ? theme.palette.getContrastText(accentCss) : "text.primary",
                transition: "background-color 180ms ease, border-color 180ms ease, color 180ms ease",
                "&:hover": {
                  borderColor: accentCss,
                  bgcolor: active ? accentCss : alpha(accentCss, theme.isDark ? 0.16 : 0.1)
                },
                "&:focus-visible": {
                  outline: `2px solid ${alpha(accentCss, 0.6)}`,
                  outlineOffset: 2
                }
              }}
            >
              {item.label}
            </Box>
          );

          return item.description ? (
            <Tooltip key={item.id} title={item.description} arrow placement="top">
              {pill}
            </Tooltip>
          ) : (
            pill
          );
        })}
      </Box>
    </Box>
  );
};
