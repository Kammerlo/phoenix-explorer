import React from "react";
import { Box, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

export const BLOCK_MAX_SIZE = 90_112; // bytes — Cardano Conway-era max block size

interface Props {
  size: number | undefined;
  /**
   * Optional protocol-era max for this block. Defaults to current Conway max.
   * Pre-Conway / Byron / EBB blocks have a different limit; pass the epoch's
   * `maxBlockSize` to render an accurate fill ratio. Falls back to clamping
   * the displayed max so the bar never displays > 100% nonsense.
   */
  maxSize?: number;
}

/**
 * Compact block-fill progress bar + percentage label.
 * Used in the block list table "Fill" column.
 */
export const BlockFillBarMini: React.FC<Props> = ({ size, maxSize }) => {
  const theme = useTheme();
  if (size == null) return <Box sx={{ color: "secondary.light", fontSize: "0.78rem" }}>—</Box>;

  const effectiveMax = Math.max(maxSize || BLOCK_MAX_SIZE, size);
  const pct = Math.min(100, Math.round((size / effectiveMax) * 100));
  const barColor =
    pct >= 90 ? theme.palette.error.main :
    pct >= 70 ? theme.palette.warning.main :
    theme.palette.success.main;

  return (
    <Box sx={{ minWidth: 90 }}>
      <Box
        sx={{
          height: 5,
          borderRadius: 3,
          mb: 0.4,
          bgcolor: theme.isDark
            ? alpha(theme.palette.secondary.light, 0.1)
            : alpha(theme.palette.secondary.light, 0.15),
          overflow: "hidden"
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 3,
            bgcolor: barColor,
            transition: "width 0.3s ease"
          }}
        />
      </Box>
      <Box sx={{ fontSize: "0.7rem", color: "secondary.light" }}>
        {pct}%
      </Box>
    </Box>
  );
};

/**
 * Full block-fill bar with label and byte count.
 * Used in the block detail visual stats panel.
 */
export const BlockFillBarFull: React.FC<Props> = ({ size, maxSize }) => {
  const theme = useTheme();
  if (size == null) return <Box sx={{ color: "secondary.light", fontSize: "0.78rem" }}>—</Box>;

  const protocolMax = maxSize || BLOCK_MAX_SIZE;
  const exceedsCurrentMax = size > protocolMax;
  const effectiveMax = Math.max(protocolMax, size);
  const pct = Math.min(100, Math.round((size / effectiveMax) * 100));
  const barColor = exceedsCurrentMax
    ? theme.palette.secondary.light
    : pct >= 90 ? theme.palette.error.main :
      pct >= 70 ? theme.palette.warning.main :
      theme.palette.success.main;
  const barWidthPct = exceedsCurrentMax ? 100 : pct;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={0.75} mb={0.75}>
        <Box sx={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "secondary.light" }}>
          Block Fill
        </Box>
      </Box>
      <Box display="flex" alignItems="baseline" gap={0.5} mb={0.75}>
        <Box sx={{ fontSize: "1.1rem", fontWeight: 700, color: barColor }}>
          {exceedsCurrentMax ? "—" : `${pct}%`}
        </Box>
        <Box sx={{ fontSize: "0.72rem", color: "secondary.light" }}>
          {exceedsCurrentMax
            ? `${size.toLocaleString()} bytes (pre-Conway era)`
            : `${size.toLocaleString()} / ${protocolMax.toLocaleString()} bytes`}
        </Box>
      </Box>
      <Box
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: theme.isDark
            ? alpha(theme.palette.secondary.light, 0.1)
            : alpha(theme.palette.secondary.light, 0.15),
          overflow: "hidden"
        }}
      >
        <Box
          sx={{
            width: `${barWidthPct}%`,
            height: "100%",
            borderRadius: 4,
            background: `linear-gradient(90deg, ${alpha(barColor, 0.7)} 0%, ${barColor} 100%)`,
            transition: "width 0.4s ease"
          }}
        />
      </Box>
    </Box>
  );
};

export default BlockFillBarMini;
