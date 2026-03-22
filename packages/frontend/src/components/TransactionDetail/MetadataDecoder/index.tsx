import React, { useMemo, useState } from "react";
import { Box, Chip, Divider, Tab, Tabs, Typography, useTheme } from "@mui/material";
import { TransactionDetail } from "@shared/dtos/transaction.dto";
import { pluginRegistry } from "src/plugins/PluginRegistry";
import { PhoenixPlugin } from "src/plugins/types";
import { ApiConnector } from "src/commons/connector/ApiConnector";

const KNOWN_LABELS: Record<number, { name: string; standard?: string }> = {
  20: { name: "Transaction Message", standard: "CIP-20" },
  61: { name: "Reference Input" },
  100: { name: "Reference Token Metadata", standard: "CIP-68" },
  222: { name: "Fungible Token", standard: "CIP-68" },
  333: { name: "Rich Fungible Token", standard: "CIP-68" },
  444: { name: "NFT Token", standard: "CIP-68" },
  674: { name: "Transaction Message", standard: "CIP-20" },
  721: { name: "NFT Metadata", standard: "CIP-25" },
  1447: { name: "Financial Report", standard: "CF-Reeve" },
  1904: { name: "Bolnisi Provenance" },
  6040: { name: "Governance Metadata" }
};

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

type JsonTokenType = "key" | "string" | "number" | "boolean" | "null" | "punct" | "ws";

function tokenizeJson(json: string): { text: string; type: JsonTokenType }[] {
  // Groups: 1=key-string, 2=string-value, 3=boolean, 4=null, 5=number, 6=punct, 7=whitespace
  const re = /("(?:[^"\\]|\\.)*")(?=\s*:)|("(?:[^"\\]|\\.)*")|(true|false)|(null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([:,{}\[\]])|(\s+)/g;
  const tokens: { text: string; type: JsonTokenType }[] = [];
  let pos = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(json)) !== null) {
    if (m.index > pos) tokens.push({ text: json.slice(pos, m.index), type: "ws" });
    if (m[1]) tokens.push({ text: m[1], type: "key" });
    else if (m[2]) tokens.push({ text: m[2], type: "string" });
    else if (m[3]) tokens.push({ text: m[3], type: "boolean" });
    else if (m[4]) tokens.push({ text: m[4], type: "null" });
    else if (m[5]) tokens.push({ text: m[5], type: "number" });
    else if (m[6]) tokens.push({ text: m[6], type: "punct" });
    else if (m[7]) tokens.push({ text: m[7], type: "ws" });
    pos = m.index + m[0].length;
  }
  if (pos < json.length) tokens.push({ text: json.slice(pos), type: "ws" });
  return tokens;
}

const RawView: React.FC<{ value: string }> = ({ value }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const tokens = useMemo(() => {
    let p = value;
    try { p = JSON.stringify(JSON.parse(value), null, 2); } catch { /* keep raw */ }
    try { return tokenizeJson(p); } catch { return [{ text: p, type: "ws" as JsonTokenType }]; }
  }, [value]);

  const TOKEN_COLOR: Record<JsonTokenType, string> = {
    key: theme.palette.primary.main,
    string: isDark ? "#7ec87e" : "#2e7d32",
    number: isDark ? "#ffb74d" : "#e65100",
    boolean: isDark ? "#64b5f6" : "#1565c0",
    null: isDark ? "#ef9a9a" : "#c62828",
    punct: theme.palette.text.disabled,
    ws: "inherit"
  };

  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.5,
        bgcolor: isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.035)",
        borderRadius: 1,
        fontSize: "0.75rem",
        lineHeight: 1.6,
        overflow: "auto",
        maxHeight: 480,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        fontFamily: "monospace",
        textAlign: "left"
      }}
    >
      {tokens.map((tok, i) => (
        <span key={i} style={{ color: TOKEN_COLOR[tok.type] }}>{tok.text}</span>
      ))}
    </Box>
  );
};

// Built-in CIP-20 message viewer (used when no plugin declares label 674/20)
const CIP20View: React.FC<{ parsed: unknown }> = ({ parsed }) => {
  if (!parsed || typeof parsed !== "object") return null;
  const msgs = (parsed as Record<string, unknown>)["msg"];
  if (!Array.isArray(msgs)) return null;
  return (
    <Box p={1.5} sx={{ bgcolor: "action.hover", borderRadius: 1 }}>
      {msgs.map((line: unknown, i: number) => (
        <Typography key={i} variant="body2">
          {String(line)}
        </Typography>
      ))}
    </Box>
  );
};

interface LabelSectionProps {
  label: number;
  rawValue: string;
  txData: TransactionDetail;
  plugins: PhoenixPlugin[];
  apiConnector: ApiConnector;
  network: string;
}

const LabelSection: React.FC<LabelSectionProps> = ({
  label,
  rawValue,
  txData,
  plugins,
  apiConnector,
  network
}) => {
  const theme = useTheme();
  const labelInfo = KNOWN_LABELS[label];
  const isCIP20 = label === 674 || label === 20;
  const parsed = tryParse(rawValue);
  const [activeView, setActiveView] = useState(0);

  // Build view list: plugin views first, then Raw JSON always last
  const views: { label: string; content: React.ReactNode }[] = plugins.map((plugin) => ({
    label: plugin.manifest.name,
    content: <plugin.Component context={{ data: txData, network, apiConnector }} />
  }));

  // Built-in CIP-20 view when no plugin handles it
  if (plugins.length === 0 && isCIP20) {
    views.push({ label: "Decoded", content: <CIP20View parsed={parsed} /> });
  }

  views.push({ label: "Raw JSON", content: <RawView value={rawValue} /> });

  const safeActive = Math.min(activeView, views.length - 1);

  return (
    <Box mb={2} p={2} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={1.5} flexWrap="wrap">
        <Typography variant="subtitle2" fontWeight="bold">
          Label {label}
        </Typography>
        {labelInfo && (
          <>
            <Typography variant="body2" color="text.secondary">
              — {labelInfo.name}
            </Typography>
            {labelInfo.standard && (
              <Chip label={labelInfo.standard} size="small" color="primary" variant="outlined" />
            )}
          </>
        )}
      </Box>

      <Divider sx={{ mb: 1.5 }} />

      {/* View tabs (only rendered when there are multiple choices) */}
      {views.length > 1 && (
        <Tabs
          value={safeActive}
          onChange={(_e, val) => setActiveView(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 1.5,
            minHeight: 36,
            "& .MuiTab-root": { minHeight: 36, py: 0.5, textTransform: "none", fontSize: "0.875rem" },
            "& .MuiTabs-indicator": { backgroundColor: theme.palette.primary.main }
          }}
        >
          {views.map((v, i) => (
            <Tab key={i} label={v.label} />
          ))}
        </Tabs>
      )}

      {views[safeActive]?.content}
    </Box>
  );
};

interface MetadataDecoderProps {
  txData?: TransactionDetail | null;
}

const MetadataDecoder: React.FC<MetadataDecoderProps> = ({ txData }) => {
  const data = txData?.metadata;
  const apiConnector = ApiConnector.getApiConnector();
  const network = process.env.REACT_APP_NETWORK || "mainnet";

  if (!data || data.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" p={2}>
        No metadata
      </Typography>
    );
  }

  return (
    <Box>
      {data.map((item, idx) => {
        const label = Number(item.label);
        const plugins = pluginRegistry.getPluginsForMetadataLabel(label);
        return (
          <LabelSection
            key={idx}
            label={label}
            rawValue={item.value}
            txData={txData!}
            plugins={plugins}
            apiConnector={apiConnector}
            network={network}
          />
        );
      })}
    </Box>
  );
};

export default MetadataDecoder;
