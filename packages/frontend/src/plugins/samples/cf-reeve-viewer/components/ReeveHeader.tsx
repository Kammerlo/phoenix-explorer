import React from "react";
import { Box, Chip, Divider, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { formatDateTimeLocal } from "src/commons/utils/helper";
import { ReeveRoot } from "../types";
import { cleanCurrencyCode } from "../format";
import { mutedText, strongText } from "../uiColors";

interface ReeveHeaderProps {
  root: ReeveRoot;
  /** Human label for the record type chip (renderer label, else the raw type). */
  typeLabel?: string;
}

function initialsOf(name?: string): string {
  if (!name) return "—";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** "BALANCE_SHEET" -> "Balance Sheet", "MONTHLY" -> "Monthly". */
function titleCase(value: string | number): string {
  return String(value)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function truncateMiddle(value: string, head = 8, tail = 6): string {
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

const Field: React.FC<{ label: string; value: string; mono?: boolean; title?: string }> = ({
  label,
  value,
  mono,
  title
}) => {
  const theme = useTheme();
  return (
    <Box minWidth={0} sx={{ textAlign: "center" }}>
      <Typography
        sx={{
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontSize: "0.6rem",
          fontWeight: 600,
          color: mutedText(theme),
          lineHeight: 1.6
        }}
      >
        {label}
      </Typography>
      <Typography
        title={title ?? value}
        sx={{
          color: strongText(theme),
          fontWeight: 600,
          fontSize: mono ? "0.76rem" : "0.84rem",
          fontFamily: mono ? "monospace" : undefined,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

const ReeveHeader: React.FC<ReeveHeaderProps> = ({ root, typeLabel }) => {
  const theme = useTheme();
  const { org, metadata } = root;
  const accent = theme.palette.primary.main;
  const currency = cleanCurrencyCode(org?.currency_id);

  // Context subtitle, e.g. "Balance Sheet · Monthly 2025 · Period 12".
  // Driven by field presence (not a type literal) so future report-family types
  // surface their context too.
  const contextParts: string[] = [];
  if (root.subtype) contextParts.push(titleCase(root.subtype));
  const period = [
    root.interval ? titleCase(root.interval) : "",
    root.year !== undefined ? String(root.year) : ""
  ]
    .filter(Boolean)
    .join(" ");
  if (period) contextParts.push(period);
  if (root.period !== undefined) contextParts.push(`Period ${root.period}`);
  const subtitle = contextParts.join("  ·  ");

  return (
    <Box
      mb={2}
      sx={{
        borderRadius: 2,
        border: `1px solid ${alpha(accent, theme.isDark ? 0.35 : 0.2)}`,
        borderLeft: `3px solid ${accent}`,
        bgcolor: theme.isDark ? alpha(accent, 0.08) : alpha(accent, 0.04),
        overflow: "hidden"
      }}
    >
      {/* Identity row */}
      <Box display="flex" alignItems="flex-start" gap={1.5} p={2} pb={1.5}>
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: "50%",
            bgcolor: alpha(accent, theme.isDark ? 0.28 : 0.14),
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "0.9rem",
            letterSpacing: "0.02em"
          }}
        >
          {initialsOf(org?.name)}
        </Box>

        <Box flexGrow={1} minWidth={0}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            color={theme.palette.secondary.main}
            sx={{ lineHeight: 1.25 }}
          >
            {org?.name ?? "Unknown Organisation"}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: mutedText(theme), mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
          {(typeLabel ?? root.type) && (
            <Chip
              label={typeLabel ?? root.type}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: "0.68rem",
                bgcolor: alpha(accent, theme.isDark ? 0.25 : 0.14),
                color: accent
              }}
            />
          )}
          {metadata?.version && (
            <Typography variant="caption" sx={{ color: mutedText(theme) }}>
              v{metadata.version}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Metadata grid */}
      {(org?.country_code || currency || org?.tax_id_number || org?.id || metadata?.timestamp) && (
        <>
          <Divider sx={{ borderColor: alpha(accent, theme.isDark ? 0.25 : 0.15) }} />
          <Box
            sx={{
              px: 2,
              py: 1.25,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "flex-start",
              columnGap: { xs: 3, sm: 4 },
              rowGap: 1.5
            }}
          >
            {org?.country_code && <Field label="Country" value={org.country_code} />}
            {currency && <Field label="Currency" value={currency} />}
            {org?.tax_id_number && <Field label="Tax ID" value={org.tax_id_number} />}
            {org?.id && (
              <Tooltip title={org.id} arrow placement="top">
                <Box minWidth={0}>
                  <Field label="Organisation ID" value={truncateMiddle(org.id)} title={org.id} mono />
                </Box>
              </Tooltip>
            )}
            {metadata?.timestamp && (
              <Field label="Created" value={formatDateTimeLocal(String(metadata.timestamp))} />
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default ReeveHeader;
