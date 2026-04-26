import { Box, Typography, alpha, useTheme } from "@mui/material";

import { SectionHeader } from "../Common/SectionHeader";
import { SectionShell } from "../Common/SectionShell";
import { SECTIONS, accentColor, eraForVersion } from "../playground/liveContext";

// @ts-ignore — TProtocolParam is a global declaration
import { TProtocolParam } from "src/types/protocol";

interface Props {
  params: TProtocolParam;
}

const num = (v: string | number | null | undefined): number => Number(v) || 0;

const SECTION = SECTIONS.find((s) => s.id === "version")!;

/**
 * Compact footer panel surfacing the live protocol version and era. Renders
 * after the last functional section so it doesn't compete for attention with
 * the playgrounds above.
 */
export const ProtocolVersionFooter = ({ params }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(SECTION.accent, theme);

  const major = num(params.protocolMajor);
  const minor = num(params.protocolMinor);
  const era = eraForVersion(major);

  return (
    <SectionShell id={SECTION.id} accent={SECTION.accent}>
      <SectionHeader
        Icon={SECTION.Icon}
        title="Protocol Version"
        intent="The chain's current era and version. Major bumps are hard forks; minor bumps are soft-forkable changes."
        accent={SECTION.accent}
      />

      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", sm: "auto 1fr" }}
        gap={{ xs: 2, sm: 4 }}
        alignItems="center"
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          bgcolor: alpha(accentCss, theme.isDark ? 0.1 : 0.04),
          border: `1px solid ${alpha(accentCss, 0.25)}`
        }}
      >
        <Box textAlign={{ xs: "left", sm: "center" }}>
          <Typography
            variant="overline"
            sx={{ display: "block", color: accentCss, fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.1em" }}
          >
            Era
          </Typography>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: "1.6rem", sm: "1.9rem" },
              color: "text.primary",
              lineHeight: 1.1,
              letterSpacing: "-0.02em"
            }}
          >
            {era.name}
          </Typography>
          <Typography
            sx={{
              mt: 0.5,
              fontWeight: 700,
              fontFamily: "monospace",
              fontSize: "0.95rem",
              color: accentCss
            }}
          >
            v{major}.{minor}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            since {era.startedAt}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
            {era.tagline}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, mt: 1.5 }}>
            Cardano upgrades through the <Box component="strong" color="text.primary">hard-fork combinator</Box>:
            a <strong>major</strong> version bump activates a new ledger era at a chosen epoch
            boundary, with the old rules still valid up to that epoch. <strong>Minor</strong> bumps
            are soft-forkable, meaning old nodes still validate the chain — useful for cost-model
            updates and smaller tweaks that don't change ledger semantics.
          </Typography>
        </Box>
      </Box>
    </SectionShell>
  );
};
