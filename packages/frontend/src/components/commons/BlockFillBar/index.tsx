import React from "react";
import { Box, BoxProps, Tooltip, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

/** Cardano mainnet max block body size in bytes (protocol parameter). */
export const MAX_BLOCK_SIZE_BYTES = 90_112;

function fillColor(pct: number, theme: ReturnType<typeof useTheme>) {
  if (pct >= 90) return theme.palette.error.main;
  if (pct >= 70) return theme.palette.warning.main;
  if (pct >= 30) return theme.palette.success.main;
  return theme.palette.primary.main;
}

function fillLabel(pct: number): string {
  if (pct >= 90) return "High";
  if (pct >= 70) return "Medium";
  if (pct > 0) return "Low";
  return "Empty";
}

// ─── Mini variant (for table rows) ───────────────────────

interface MiniProps extends BoxProps {
  size?: number;
  maxSize?: number;
}

export const BlockFillBarMini: React.FC<MiniProps> = ({ size, maxSize = MAX_BLOCK_SIZE_BYTES, ...rest }) => {
  const theme = useTheme();
  if (size == null) return <Box sx={{ color: "secondary.light", fontSize: "0.75rem" }}>—</Box>;

  const pct = Math.min(100, (size / maxSize) * 100);
  const color = fillColor(pct, theme);
  const label = `${pct.toFixed(1)}% · ${(size / 1024).toFixed(1)} KB`;

  return (
    <Tooltip title={`${label} · ${size.toLocaleString()} bytes`} placement="top" arrow>
      <Box display="flex" alignItems="center" gap={0.75} sx={{ minWidth: 80 }} {...rest}>
        <Box
          sx={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            bgcolor: theme.isDark ? alpha(theme.palette.secondary.light, 0.12) : alpha(theme.palette.secondary.light, 0.15),
            overflow: "hidden"
          }}
        >
          <Box
            sx={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 3,
              bgcolor: color,
              transition: "width 0.4s ease"
            }}
          />
        </Box>
        <Box
          sx={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color,
            whiteSpace: "nowrap",
            minWidth: 34,
            textAlign: "right"
          }}
        >
          {pct.toFixed(0)}%
        </Box>
      </Box>
    </Tooltip>
  );
};

// ─── Full variant (for block detail) ─────────────────────

interface FullProps extends BoxProps {
  size?: number;
  maxSize?: number;
}

export const BlockFillBarFull: React.FC<FullProps> = ({ size, maxSize = MAX_BLOCK_SIZE_BYTES, ...rest }) => {
  const theme = useTheme();

  const pct = size != null ? Math.min(100, (size / maxSize) * 100) : 0;
  const color = fillColor(pct, theme);
  const isEmpty = size == null || size === 0;

  return (
    <Box {...rest}>
      {/* Header row */}
      <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={1}>
        <Box sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "secondary.light" }}>
          Block utilization
        </Box>
        <Box display="flex" alignItems="center" gap={0.75}>
          {!isEmpty && (
            <Box
              sx={{
                fontSize: "0.6rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                bgcolor: alpha(color, 0.12),
                color
              }}
            >
              {fillLabel(pct)}
            </Box>
          )}
          <Box sx={{ fontSize: "1.4rem", fontWeight: 800, color, lineHeight: 1 }}>
            {isEmpty ? "—" : `${pct.toFixed(1)}%`}
          </Box>
        </Box>
      </Box>

      {/* Progress bar */}
      <Box
        sx={{
          height: 12,
          borderRadius: 6,
          bgcolor: theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : alpha(theme.palette.secondary.light, 0.12),
          overflow: "hidden",
          position: "relative"
        }}
      >
        {!isEmpty && (
          <Box
            sx={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 6,
              background: `linear-gradient(90deg, ${alpha(color, 0.7)} 0%, ${color} 100%)`,
              transition: "width 0.5s ease",
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)",
                borderRadius: "inherit"
              }
            }}
          />
        )}
      </Box>

      {/* Size info */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.75}>
        <Box sx={{ fontSize: "0.72rem", color: "secondary.light" }}>
          {isEmpty ? "No data" : `${size!.toLocaleString()} B · ${(size! / 1024).toFixed(2)} KB`}
        </Box>
        <Box sx={{ fontSize: "0.72rem", color: "secondary.light", opacity: 0.6 }}>
          max {(maxSize / 1024).toFixed(0)} KB
        </Box>
      </Box>
    </Box>
  );
};

export default BlockFillBarMini;
