import { Accordion, AccordionDetails, AccordionSummary, Box, Link, Typography, alpha, useTheme } from "@mui/material";
import { ReactNode } from "react";
import { IoChevronDown } from "react-icons/io5";

interface Source {
  label: string;
  href: string;
}

interface Props {
  title: string;
  body: ReactNode;
  sources?: Source[];
}

/**
 * "Background" expander — 100–200 words of plain-English deeper context per
 * section. Cited sources surface as small outbound links at the bottom.
 *
 * Visually quieter than `WhatIfExpander` so it doesn't compete for attention.
 */
export const BackgroundExpander = ({ title, body, sources = [] }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };

  return (
    <Accordion
      disableGutters
      square
      sx={{
        mt: 1.5,
        bgcolor: "transparent",
        border: `1px dashed ${alpha(theme.palette.text.secondary, theme.isDark ? 0.25 : 0.2)}`,
        borderRadius: 2,
        boxShadow: "none",
        "&::before": { display: "none" }
      }}
    >
      <AccordionSummary
        expandIcon={<IoChevronDown size={16} />}
        sx={{
          px: 2,
          minHeight: 44,
          "& .MuiAccordionSummary-content": { my: 0.75 }
        }}
      >
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pb: 2.5, pt: 0 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          component="div"
          sx={{ lineHeight: 1.7, "& p": { mt: 0, mb: 1.25, "&:last-child": { mb: 0 } } }}
        >
          {body}
        </Typography>
        {sources.length > 0 && (
          <Box mt={1.5} display="flex" flexWrap="wrap" gap={1.5}>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}
            >
              Sources
            </Typography>
            {sources.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                variant="caption"
                underline="hover"
                sx={{ fontWeight: 500 }}
              >
                {s.label} ↗
              </Link>
            ))}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
