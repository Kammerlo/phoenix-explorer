import { Box, Typography, alpha, useTheme } from "@mui/material";

import { SECTIONS, accentColor } from "../playground/liveContext";
import { useBreakpoint } from "src/hooks/useBreakpoint";

interface Props {
  /** Currently selected section id. */
  activeId: string;
  /** Called when the user picks a section. */
  onSelect: (id: string) => void;
}

/**
 * Controlled tab selector for the Protocol Parameters page.
 *
 * Desktop (md+): vertical rail. Mobile / tablet: a horizontally-scrolling pill
 * row sticky under the header. Picking an item swaps the rendered section in
 * place — no page scroll, no fetch.
 */
export const SectionAnchorNav = ({ activeId, onSelect }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const { isMobile, isTablet } = useBreakpoint();
  const compact = isMobile || isTablet;

  // ─── Compact (mobile / tablet): horizontal sticky pill row ────────────────
  if (compact) {
    return (
      <Box
        component="nav"
        role="tablist"
        aria-label="Protocol parameter sections"
        sx={{
          position: "sticky",
          top: 56,
          zIndex: 5,
          mx: -1,
          mb: 2,
          py: 1,
          px: 1,
          backdropFilter: "blur(10px)",
          bgcolor: alpha(theme.palette.background.default, 0.85),
          borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
          overflowX: "auto",
          "&::-webkit-scrollbar": { display: "none" }
        }}
      >
        <Box display="flex" gap={0.75}>
          {SECTIONS.map(({ id, short, accent }) => {
            const accentCss = accentColor(accent, theme);
            const active = id === activeId;
            return (
              <Box
                key={id}
                component="button"
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelect(id)}
                sx={{
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  py: 0.5,
                  px: 1.25,
                  borderRadius: 999,
                  border: `1px solid ${active ? accentCss : alpha(accentCss, 0.25)}`,
                  bgcolor: active ? alpha(accentCss, 0.15) : "transparent",
                  color: active ? accentCss : "text.secondary",
                  transition: "all 180ms ease",
                  "&:hover": { borderColor: accentCss, color: accentCss },
                  "&:focus-visible": {
                    outline: `2px solid ${alpha(accentCss, 0.6)}`,
                    outlineOffset: 2
                  }
                }}
              >
                {short}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  // ─── Desktop: vertical rail ──────────────────────────────────────────────
  return (
    <Box
      component="nav"
      role="tablist"
      aria-label="Protocol parameter sections"
      aria-orientation="vertical"
      sx={{
        position: "sticky",
        top: 96,
        py: 1
      }}
    >
      <Typography
        variant="overline"
        color="text.disabled"
        sx={{ fontSize: "0.65rem", letterSpacing: "0.08em", display: "block", mb: 1.5, pl: 1 }}
      >
        Protocol parameters
      </Typography>
      <Box
        component="ul"
        sx={{
          listStyle: "none",
          m: 0,
          p: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0.25
        }}
      >
        {SECTIONS.map(({ id, short, accent, Icon }) => {
          const accentCss = accentColor(accent, theme);
          const active = id === activeId;
          return (
            <Box component="li" key={id}>
              <Box
                component="button"
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelect(id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  width: "100%",
                  py: 0.85,
                  pl: 1.25,
                  pr: 1.5,
                  border: "none",
                  borderRadius: 1.5,
                  borderLeft: `2px solid ${active ? accentCss : "transparent"}`,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  color: active ? "text.primary" : "text.secondary",
                  bgcolor: active ? alpha(accentCss, theme.isDark ? 0.12 : 0.06) : "transparent",
                  fontWeight: active ? 600 : 500,
                  fontSize: "0.85rem",
                  transition: "all 180ms ease",
                  "&:hover": {
                    color: "text.primary",
                    bgcolor: alpha(accentCss, theme.isDark ? 0.08 : 0.04)
                  },
                  "&:focus-visible": {
                    outline: `2px solid ${alpha(accentCss, 0.6)}`,
                    outlineOffset: 2
                  }
                }}
              >
                <Box
                  sx={{
                    color: active ? accentCss : alpha(accentCss, 0.55),
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  <Icon size={16} />
                </Box>
                <span>{short}</span>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
