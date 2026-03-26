import { alpha, Box, styled } from "@mui/material";

/* ---------- outer wrapper ---------- */
export const FlowWrapper = styled(Box)<{ failed?: number }>(({ theme, failed }) => ({
  background: theme.palette.secondary[0],
  borderRadius: theme.spacing(2),
  marginTop: theme.spacing(2),
  padding: theme.spacing(3),
  position: "relative" as const,
  overflow: "hidden",
  ...(failed && {
    "&::after": {
      content: '""',
      position: "absolute" as const,
      inset: 0,
      pointerEvents: "none" as const,
      background: alpha(theme.palette.error.main, theme.isDark ? 0.06 : 0.03),
      borderRadius: "inherit"
    }
  }),
  [theme.breakpoints.down("md")]: {
    padding: theme.spacing(2)
  }
}));

/* ---------- 3-column row for inputs | center | outputs ---------- */
export const FlowRow = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  columnGap: theme.spacing(5),
  alignItems: "stretch",
  position: "relative" as const,
  [theme.breakpoints.down("md")]: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "stretch",
    gap: theme.spacing(2)
  }
}));

/* ---------- input/output section box (bordered card like Sender/Receiver in the design) ---------- */
export const SectionBox = styled(Box)(({ theme }) => ({
  border: `1.5px dashed ${alpha(theme.palette.secondary.light, 0.25)}`,
  borderRadius: theme.spacing(2),
  padding: theme.spacing(2),
  display: "flex",
  flexDirection: "column" as const,
  minWidth: 0
}));

/* ---------- legacy Column alias ---------- */
export const Column = styled(Box)({
  display: "flex",
  flexDirection: "column" as const,
  minWidth: 0
});

export const ColumnHeader = styled(Box)(({ theme }) => ({
  fontSize: "0.7rem",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: theme.palette.secondary.light,
  marginBottom: theme.spacing(1),
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5)
}));

export const Dot = styled("span")<{ color: string }>(({ color }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: color,
  display: "inline-block",
  flexShrink: 0
}));

/* ---------- count badge next to section header ---------- */
export const CountBadge = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 6px",
  minWidth: 20,
  height: 18,
  borderRadius: 9,
  fontSize: "0.65rem",
  fontWeight: 700,
  background: theme.isDark
    ? alpha(theme.palette.secondary.light, 0.12)
    : alpha(theme.palette.primary.main, 0.08),
  color: theme.palette.secondary.main,
  marginLeft: theme.spacing(0.75)
}));

/* ---------- change address badge on output cards ---------- */
export const ChangeBadge = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  fontSize: "0.6rem",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  padding: "1px 6px",
  borderRadius: 4,
  background: alpha(theme.palette.warning.main, 0.1),
  color: theme.isDark
    ? theme.palette.warning[200] || theme.palette.warning.light
    : theme.palette.warning[900] || theme.palette.warning.dark,
  border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`
}));

/* ---------- small numbered circle before address ---------- */
export const CardNumberBadge = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 20,
  height: 20,
  borderRadius: "50%",
  fontSize: "0.65rem",
  fontWeight: 700,
  background: theme.isDark
    ? alpha(theme.palette.secondary.light, 0.15)
    : alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.secondary.main,
  flexShrink: 0
}));

/* ---------- arrow column (kept for compat) ---------- */
export const ArrowColumn = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  [theme.breakpoints.down("md")]: {
    alignSelf: "center",
    padding: `${theme.spacing(0.5)} 0`,
    "& svg": {
      transform: "rotate(90deg)"
    }
  }
}));

/* ---------- UTXO card ---------- */
export const UtxoCard = styled(Box)<{
  side: "input" | "output" | "collateral";
  isContract?: number;
}>(({ theme, side, isContract }) => {
  const borderColor = {
    input: theme.palette.error[700] || theme.palette.error.main,
    output: theme.palette.success[700] || theme.palette.success.main,
    collateral: theme.palette.warning[700] || theme.palette.warning.main
  }[side];

  return {
    borderLeft: `3px solid ${borderColor}`,
    borderRadius: 8,
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(0.75),
    background: theme.isDark
      ? alpha(theme.palette.secondary[100] || "#1a1a2e", 0.5)
      : alpha(theme.palette.primary[100] || "#f5f7fa", 0.4),
    border: `1px solid ${theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e0e0e0"}`,
    borderLeftWidth: 3,
    borderLeftColor: borderColor,
    transition: "box-shadow 0.15s ease, background 0.15s ease",
    "&:hover": {
      boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.06)}`
    },
    "&:last-child": {
      marginBottom: 0
    },
    ...(isContract && {
      background: theme.isDark
        ? alpha(theme.palette.primary.main, 0.06)
        : alpha(theme.palette.primary.main, 0.03),
      borderColor: alpha(theme.palette.primary.main, 0.25),
      borderLeftColor: borderColor
    })
  };
});

export const ContractTag = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  fontSize: "0.6rem",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  color: theme.palette.primary.main,
  padding: "1px 6px",
  borderRadius: 4,
  background: alpha(theme.palette.primary.main, 0.08),
  "& svg": { width: 10, height: 10 }
}));

/* ---------- center transaction node ---------- */
export const CenterNode = styled(Box)(({ theme }) => ({
  background: theme.isDark
    ? alpha(theme.palette.primary.main, 0.06)
    : alpha(theme.palette.primary.main, 0.03),
  border: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
  borderRadius: theme.spacing(2),
  padding: theme.spacing(2),
  width: 230,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: theme.spacing(1),
  [theme.breakpoints.down("md")]: {
    width: "100%",
    alignSelf: "stretch"
  }
}));

/* ---------- total output box (green-tinted, most prominent element in center) ---------- */
export const TotalOutputBox = styled(Box)(({ theme }) => ({
  background: alpha(theme.palette.success.main, theme.isDark ? 0.1 : 0.06),
  border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
  borderRadius: theme.spacing(1.5),
  padding: theme.spacing(1, 1.5),
  width: "100%"
}));

/* ---------- fee callout (subtle red tint, below total output) ---------- */
export const FeeCallout = styled(Box)(({ theme }) => ({
  background: alpha(theme.palette.error.main, theme.isDark ? 0.06 : 0.03),
  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
  borderRadius: theme.spacing(1.5),
  padding: theme.spacing(0.75, 1.5),
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between"
}));

export const StatusChip = styled(Box)<{ txStatus: string }>(({ theme, txStatus }) => {
  const success = txStatus === "SUCCESS";
  const failed = txStatus === "FAILED";
  return {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    padding: "3px 10px",
    borderRadius: 4,
    background: success
      ? alpha(theme.palette.success.main, 0.12)
      : failed
        ? alpha(theme.palette.error.main, 0.12)
        : alpha(theme.palette.warning.main, 0.12),
    color: success
      ? theme.palette.success[800] || theme.palette.success.dark
      : failed
        ? theme.palette.error[700] || theme.palette.error.dark
        : theme.isDark
          ? theme.palette.warning[100] || theme.palette.warning.light
          : theme.palette.warning[800] || theme.palette.warning.dark
  };
});

export const FeeRow = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  padding: `${theme.spacing(0.5)} 0`,
  "&:not(:last-child)": {
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`
  }
}));

export const FeeLabel = styled("span")(({ theme }) => ({
  fontSize: "0.72rem",
  color: theme.palette.secondary.light,
  fontWeight: 500,
  whiteSpace: "nowrap" as const
}));

export const FeeValue = styled(Box)(({ theme }) => ({
  fontSize: "0.8rem",
  fontWeight: 700,
  color: theme.palette.secondary.main,
  display: "flex",
  alignItems: "center",
  gap: 3,
  whiteSpace: "nowrap" as const
}));

/* ---------- badge chips in center node ---------- */
export const BadgeChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  fontSize: "0.62rem",
  fontWeight: 600,
  padding: "2px 7px",
  borderRadius: 10,
  background: theme.isDark
    ? alpha(theme.palette.secondary.light, 0.1)
    : alpha(theme.palette.primary.main, 0.06),
  color: theme.palette.secondary.main,
  whiteSpace: "nowrap" as const,
  "& svg": { width: 12, height: 12 }
}));

/* ---------- UTXO card sub-elements ---------- */
export const AddressLink = styled(Box)(({ theme }) => ({
  fontFamily: "var(--font-family-text), monospace",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: theme.palette.primary.main,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
  "& a": {
    color: "inherit",
    textDecoration: "none",
    "&:hover": { textDecoration: "underline" }
  }
}));

export const AmountText = styled(Box)<{ side?: "input" | "output" | "collateral" }>(({ theme, side }) => ({
  fontWeight: 700,
  fontSize: "0.82rem",
  display: "flex",
  alignItems: "center",
  gap: 3,
  color:
    side === "input"
      ? theme.palette.error[700] || theme.palette.error.main
      : side === "output"
        ? theme.isDark
          ? theme.palette.success[700] || theme.palette.success.main
          : theme.palette.success[800] || theme.palette.success.dark
        : theme.palette.warning[700] || theme.palette.warning.main
}));

export const TokenBadge = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  fontSize: "0.65rem",
  fontWeight: 600,
  padding: "2px 7px",
  borderRadius: 10,
  background: theme.isDark
    ? alpha(theme.palette.warning.main, 0.12)
    : alpha(theme.palette.warning.main, 0.08),
  color: theme.isDark
    ? theme.palette.warning[100] || theme.palette.warning.light
    : theme.palette.warning[800] || theme.palette.warning.dark,
  cursor: "pointer",
  userSelect: "none" as const
}));

export const ShowMoreButton = styled(Box)(({ theme }) => ({
  textAlign: "center" as const,
  marginTop: theme.spacing(0.5),
  "& button": {
    fontSize: "0.72rem",
    color: theme.palette.primary.main,
    textTransform: "none" as const,
    fontWeight: 600,
    padding: "2px 12px",
    minWidth: "auto"
  }
}));

/* ---------- minting section ---------- */
export const MintSection = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1.5),
  padding: theme.spacing(1.5),
  borderRadius: 8,
  border: `1px solid ${alpha(theme.palette.info?.main || theme.palette.primary.main, 0.2)}`,
  background: alpha(theme.palette.info?.main || theme.palette.primary.main, theme.isDark ? 0.04 : 0.02)
}));

export const MintRow = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: `${theme.spacing(0.375)} 0`,
  fontSize: "0.75rem",
  gap: theme.spacing(1),
  "&:not(:last-child)": {
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`
  }
}));

export const MintAssetName = styled(Box)(({ theme }) => ({
  fontFamily: "var(--font-family-text), monospace",
  fontWeight: 600,
  color: theme.palette.secondary.main,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
  maxWidth: "60%"
}));

export const MintQuantity = styled(Box)<{ positive?: number }>(({ theme, positive }) => ({
  fontWeight: 700,
  whiteSpace: "nowrap" as const,
  color: positive
    ? theme.palette.success[700] || theme.palette.success.main
    : theme.palette.error[700] || theme.palette.error.main
}));

/* ---------- collateral section ---------- */
export const CollateralSection = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1.5),
  padding: theme.spacing(2),
  borderRadius: theme.spacing(1.5),
  border: `1px dashed ${alpha(theme.palette.warning.main, 0.4)}`,
  background: alpha(theme.palette.warning.main, theme.isDark ? 0.02 : 0.01)
}));

/* ---------- withdrawal section ---------- */
export const WithdrawalSection = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1.5),
  padding: theme.spacing(1.5),
  borderRadius: 8,
  border: `1px solid ${alpha(theme.palette.secondary.light, 0.15)}`,
  background: alpha(theme.palette.secondary.light, theme.isDark ? 0.04 : 0.02)
}));

export const WithdrawalRow = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: `${theme.spacing(0.375)} 0`,
  fontSize: "0.75rem",
  gap: theme.spacing(1),
  "&:not(:last-child)": {
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`
  }
}));

/* ---------- empty state ---------- */
export const EmptyColumn = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(3),
  color: theme.palette.secondary.light,
  fontSize: "0.8rem",
  fontStyle: "italic" as const,
  border: `1px dashed ${alpha(theme.palette.secondary.light, 0.2)}`,
  borderRadius: 8
}));
