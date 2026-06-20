import { Theme, alpha } from "@mui/material/styles";

// ---------------------------------------------------------------------------
// Mode-aware color helpers for the Reeve viewer.
//
// This theme's `text.*` tokens are near-black (#141520 / #50596D) in BOTH the
// light AND dark palettes, and the metadata panel the viewer renders inside is
// a DARK surface in dark mode — so `text.primary`/`text.secondary` are unreadable
// there. `secondary.main` is the one mode-aware high-contrast token
// (#24262E light / #F6F9FF dark). We derive muted/faint tones from it so the
// whole viewer stays legible in both modes. Gate everything on `theme.isDark`.
// ---------------------------------------------------------------------------

/** High-contrast body text (values, headings). */
export const strongText = (theme: Theme): string => theme.palette.secondary.main;

/** Muted secondary text (labels, captions) — readable in both modes. */
export const mutedText = (theme: Theme): string =>
  theme.isDark ? alpha(theme.palette.secondary.main, 0.68) : theme.palette.text.secondary;

/** Faint tertiary text (batch ids, disabled hints) — still visible on dark. */
export const faintText = (theme: Theme): string =>
  theme.isDark ? alpha(theme.palette.secondary.main, 0.45) : theme.palette.text.disabled;

/** Hairline separators / borders that work over either surface. */
export const hairline = (theme: Theme): string =>
  alpha(theme.palette.secondary.main, theme.isDark ? 0.18 : 0.12);

/** Negative-amount red that keeps contrast on the dark surface. */
export const negativeText = (theme: Theme): string =>
  theme.isDark ? theme.palette.error[700] : theme.palette.error.main;
