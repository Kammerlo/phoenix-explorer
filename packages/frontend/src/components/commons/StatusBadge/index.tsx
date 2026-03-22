import { Chip, ChipProps } from "@mui/material";
import React from "react";

type StatusVariant =
  | "success"
  | "failed"
  | "active"
  | "inactive"
  | "pending"
  | "expired"
  | "enacted"
  | "ratified"
  | "dropped"
  | "live"
  | "retiring"
  | "retired";

interface StatusBadgeProps extends Omit<ChipProps, "color"> {
  status: StatusVariant | string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  success: { bg: "#d4edda", color: "#155724" },
  failed: { bg: "#f8d7da", color: "#721c24" },
  active: { bg: "#d4edda", color: "#155724" },
  inactive: { bg: "#e2e3e5", color: "#383d41" },
  pending: { bg: "#fff3cd", color: "#856404" },
  expired: { bg: "#f8d7da", color: "#721c24" },
  enacted: { bg: "#d4edda", color: "#155724" },
  ratified: { bg: "#cce5ff", color: "#004085" },
  dropped: { bg: "#e2e3e5", color: "#383d41" },
  live: { bg: "#d4edda", color: "#155724" },
  retiring: { bg: "#fff3cd", color: "#856404" },
  retired: { bg: "#e2e3e5", color: "#383d41" },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, sx, ...props }) => {
  const key = status?.toLowerCase() ?? "";
  const colors = STATUS_COLORS[key] ?? { bg: "#e2e3e5", color: "#383d41" };

  return (
    <Chip
      label={status}
      size="small"
      sx={{
        bgcolor: colors.bg,
        color: colors.color,
        fontWeight: 600,
        fontSize: "0.7rem",
        height: 22,
        borderRadius: "4px",
        textTransform: "capitalize",
        ...sx
      }}
      {...props}
    />
  );
};

export default StatusBadge;
