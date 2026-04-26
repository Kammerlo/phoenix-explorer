import { Accordion, AccordionDetails, AccordionSummary, Box, Typography, alpha, useTheme } from "@mui/material";
import { ReactNode } from "react";
import { IoChevronDown } from "react-icons/io5";

import { AccentRole, accentColor } from "../playground/liveContext";

interface Props {
  prompt: string;
  body: ReactNode;
  accent: AccentRole;
}

/**
 * "What if?" — opinionated comparison expander at the bottom of each section.
 *
 * Closed by default; expanding it doesn't shift the page above. Title row
 * uses a tinted background so it reads as a callout, not just another card.
 */
export const WhatIfExpander = ({ prompt, body, accent }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(accent, theme);

  return (
    <Accordion
      disableGutters
      square
      sx={{
        mt: 2.5,
        bgcolor: alpha(accentCss, theme.isDark ? 0.08 : 0.04),
        border: `1px solid ${alpha(accentCss, 0.25)}`,
        borderRadius: 2,
        overflow: "hidden",
        "&::before": { display: "none" }
      }}
    >
      <AccordionSummary
        expandIcon={<IoChevronDown size={18} color={accentCss} />}
        sx={{
          px: 2,
          minHeight: 48,
          "& .MuiAccordionSummary-content": { my: 1 }
        }}
      >
        <Box display="flex" alignItems="center" gap={1.25} flexWrap="wrap">
          <Box
            component="span"
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 999,
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: accentCss,
              border: `1px solid ${alpha(accentCss, 0.4)}`,
              bgcolor: alpha(accentCss, theme.isDark ? 0.15 : 0.08)
            }}
          >
            What if?
          </Box>
          <Typography variant="body2" fontWeight={600} sx={{ color: "text.primary" }}>
            {prompt}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pb: 2.5, pt: 0 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          component="div"
          sx={{ lineHeight: 1.6 }}
        >
          {body}
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
};
