import React from "react";
import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { ReeveRoot } from "../types";
import { isReeveLeafObject, reeveLeafValue, reeveOrderedEntries } from "../parse";
import { hairline, mutedText, strongText } from "../uiColors";

// Recursive, schema-agnostic renderer. Used as the fallback for Reeve `type`s
// that don't (yet) have a dedicated view, so future types degrade gracefully.
// Reuses the report `_o`/`{ v, _o }` normalization so the production wire format
// renders cleanly (ordered, ordering hints stripped, leaves unwrapped) rather
// than as raw `_o: 2` rows.

const INDENT_STEP = 2;

function displayValue(value: unknown): string {
  return value !== null && typeof value === "object" ? JSON.stringify(value) : String(value);
}

function entriesOf(value: object): [string, unknown][] {
  return Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as [string, unknown])
    : reeveOrderedEntries(value as Record<string, unknown>);
}

const ValueRow: React.FC<{ label: string; value: string; depth: number }> = ({ label, value, depth }) => {
  const theme = useTheme();
  return (
    <Box
      display="flex"
      alignItems="baseline"
      gap={1}
      sx={{
        pl: depth * INDENT_STEP,
        py: 0.3,
        borderBottom: `1px solid ${hairline(theme)}`
      }}
    >
      <Typography variant="body2" sx={{ color: mutedText(theme), minWidth: 160, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-word", color: strongText(theme) }}>
        {value}
      </Typography>
    </Box>
  );
};

const Node: React.FC<{ name: string; value: unknown; depth: number }> = ({ name, value, depth }) => {
  const theme = useTheme();

  // Unwrap a Reeve `{ v, _o }` leaf to its underlying value.
  const resolved = isReeveLeafObject(value) ? reeveLeafValue(value) : value;

  if (resolved !== null && typeof resolved === "object") {
    return (
      <Box>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            color: mutedText(theme),
            pl: depth * INDENT_STEP,
            mt: depth === 0 ? 1 : 0.25,
            textTransform: depth === 0 ? "uppercase" : "none",
            letterSpacing: depth === 0 ? "0.04em" : 0,
            fontSize: depth === 0 ? "0.72rem" : "0.8rem",
            borderBottom: depth === 0 ? `1px solid ${alpha(theme.palette.primary.main, 0.4)}` : "none",
            pb: depth === 0 ? 0.25 : 0
          }}
        >
          {name}
        </Typography>
        {entriesOf(resolved).map(([k, v]) => (
          <Node key={k} name={k} value={v} depth={depth + 1} />
        ))}
      </Box>
    );
  }

  return <ValueRow label={name} value={displayValue(resolved)} depth={depth} />;
};

const GenericView: React.FC<{ root: ReeveRoot }> = ({ root }) => {
  const theme = useTheme();
  const payload = root.data ?? {};
  const entries =
    payload && typeof payload === "object" ? entriesOf(payload) : ([["data", payload]] as [string, unknown][]);

  return (
    <Box>
      <Typography variant="caption" display="block" mb={0.75} sx={{ fontStyle: "italic", color: mutedText(theme) }}>
        No dedicated view for type “{root.type ?? "UNKNOWN"}” yet — showing the raw structure.
      </Typography>
      <Box
        sx={{
          border: `1px solid ${hairline(theme)}`,
          borderRadius: 1.5,
          px: { xs: 1.25, sm: 2 },
          py: 1
        }}
      >
        {entries.map(([k, v]) => (
          <Node key={k} name={k} value={v} depth={0} />
        ))}
      </Box>
    </Box>
  );
};

export default GenericView;
