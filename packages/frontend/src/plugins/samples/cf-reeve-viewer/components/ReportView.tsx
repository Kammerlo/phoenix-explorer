import React, { useState } from "react";
import { Box, Collapse, SvgIcon, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { ReeveRoot } from "../types";
import { normalizeReport, ReportNode } from "../parse";
import { cleanCurrencyCode, formatReportAmount } from "../format";
import { hairline, mutedText, negativeText, strongText } from "../uiColors";

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <SvgIcon
    viewBox="0 0 24 24"
    sx={{
      fontSize: 18,
      transition: "transform 150ms ease",
      transform: open ? "rotate(0deg)" : "rotate(-90deg)",
      color: "text.secondary",
      "@media (prefers-reduced-motion: reduce)": { transition: "none" }
    }}
  >
    <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
  </SvgIcon>
);

const INDENT_STEP = 2.25; // theme spacing units per depth level

// Right-aligned, monospace, tabular figure. `kind` distinguishes on-chain leaf
// values from computed (derived) category subtotals. A null value renders "—".
const Amount: React.FC<{ value: number | null; text?: string; kind: "leaf" | "subtotal" }> = ({
  value,
  text,
  kind
}) => {
  const theme = useTheme();
  const negative = value !== null && value < 0;
  const display = value !== null ? formatReportAmount(value) : text ?? "—";
  return (
    <Typography
      component="span"
      sx={{
        ml: 2,
        flexShrink: 0,
        minWidth: { xs: 96, sm: 150 },
        textAlign: "right",
        fontFamily: "monospace",
        fontVariantNumeric: "tabular-nums",
        fontSize: kind === "subtotal" ? "0.78rem" : "0.82rem",
        fontWeight: kind === "subtotal" ? 600 : 500,
        fontStyle: kind === "subtotal" ? "italic" : "normal",
        color: negative ? negativeText(theme) : kind === "subtotal" ? mutedText(theme) : strongText(theme)
      }}
    >
      {display}
    </Typography>
  );
};

const LeafRow: React.FC<{ node: Extract<ReportNode, { kind: "value" }>; depth: number }> = ({
  node,
  depth
}) => {
  const theme = useTheme();
  return (
    <Box
      display="flex"
      alignItems="baseline"
      justifyContent="space-between"
      sx={{
        pl: depth * INDENT_STEP,
        py: 0.4,
        borderBottom: `1px solid ${hairline(theme)}`,
        "&:hover": { bgcolor: "action.hover" }
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: mutedText(theme),
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
        title={node.label}
      >
        {node.label}
      </Typography>
      <Amount value={node.value} text={node.text} kind="leaf" />
    </Box>
  );
};

const CategorySection: React.FC<{ node: Extract<ReportNode, { kind: "category" }>; depth: number }> = ({
  node,
  depth
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  const accent = theme.palette.primary.main;
  const isTop = depth === 0;

  return (
    <Box sx={{ mt: isTop ? 2 : 0.25 }}>
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          pl: depth * INDENT_STEP,
          py: isTop ? 0.6 : 0.4,
          cursor: "pointer",
          userSelect: "none",
          borderBottom: isTop ? `1px solid ${alpha(accent, 0.45)}` : "none",
          "&:hover .reeve-cat-label": { color: accent }
        }}
      >
        <Box display="flex" alignItems="center" gap={0.25} minWidth={0}>
          <Chevron open={open} />
          <Typography
            className="reeve-cat-label"
            sx={{
              fontWeight: 700,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              transition: "color 150ms ease",
              ...(isTop
                ? {
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontSize: "0.72rem",
                    color: mutedText(theme)
                  }
                : { fontSize: "0.82rem", color: strongText(theme) })
            }}
            title={node.label}
          >
            {node.label}
          </Typography>
        </Box>
        {/* Purely structural branches (no numeric descendants) show no total. */}
        <Amount value={node.hasValue ? node.subtotal : null} kind="subtotal" />
      </Box>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box sx={{ pt: 0.25 }}>
          {node.children.map((child) =>
            child.kind === "category" ? (
              <CategorySection key={child.key} node={child} depth={depth + 1} />
            ) : (
              <LeafRow key={child.key} node={child} depth={depth + 1} />
            )
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

const ReportView: React.FC<{ root: ReeveRoot }> = ({ root }) => {
  const theme = useTheme();
  const nodes = normalizeReport(root.data);
  const currency = cleanCurrencyCode(root.org?.currency_id);

  if (nodes.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: mutedText(theme) }}>
        No report data available.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography
        variant="caption"
        display="block"
        mb={0.5}
        sx={{ fontStyle: "italic", color: mutedText(theme) }}
      >
        Values{currency ? ` in ${currency}` : ""} are anchored on-chain · italic category totals are
        computed
      </Typography>
      <Box
        sx={{
          border: `1px solid ${hairline(theme)}`,
          borderRadius: 1.5,
          px: { xs: 1.25, sm: 2 },
          py: 1
        }}
      >
        {nodes.map((node) =>
          node.kind === "category" ? (
            <CategorySection key={node.key} node={node} depth={0} />
          ) : (
            <LeafRow key={node.key} node={node} depth={0} />
          )
        )}
      </Box>
    </Box>
  );
};

export default ReportView;
