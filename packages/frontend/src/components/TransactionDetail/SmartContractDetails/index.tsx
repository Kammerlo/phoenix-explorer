import React, { useMemo, useState } from "react";
import { Box, Collapse, Stack, Typography, alpha, useTheme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import {
  IoLockOpenOutline,
  IoColorWandOutline,
  IoRibbonOutline,
  IoTrendingUpOutline,
  IoMegaphoneOutline,
  IoDocumentTextOutline,
  IoFlashOutline,
  IoCodeSlashOutline,
  IoReceiptOutline,
  IoChevronDown,
  IoOpenOutline
} from "react-icons/io5";

import { SectionShell } from "src/components/ProtocolParameters/Common/SectionShell";
import { SectionHeader } from "src/components/ProtocolParameters/Common/SectionHeader";
import { ParamCard } from "src/components/ProtocolParameters/Common/ParamCard";
import { AccentRole, accentColor } from "src/components/ProtocolParameters/playground/liveContext";
import CompiledCodeDataCard from "src/components/Contracts/common/CompiledCodeDataCard";
import CopyButton from "src/components/commons/CopyButton";
import { decodePlutusData } from "src/commons/utils/plutusData";
import { decodeScript } from "src/commons/utils/uplc";
import { details } from "src/commons/routers";
import { IContractItemTx } from "@shared/dtos/transaction.dto";

import ScriptVerificationBadge from "./ScriptVerificationBadge";

interface PurposeMeta {
  title: string;
  intent: string;
  accent: AccentRole;
  Icon: React.ComponentType<{ size?: number | string }>;
}

const PURPOSE_META: Record<string, PurposeMeta> = {
  SPEND: { title: "Spending validator", intent: "Unlocked a UTxO at a script address.", accent: "warning", Icon: IoLockOpenOutline },
  MINT: { title: "Minting policy", intent: "Authorized minting / burning of tokens under this policy.", accent: "success", Icon: IoColorWandOutline },
  CERT: { title: "Certificate validator", intent: "Authorized a certificate action.", accent: "info", Icon: IoRibbonOutline },
  REWARD: { title: "Reward-withdrawal validator", intent: "Authorized a script reward withdrawal.", accent: "secondary", Icon: IoTrendingUpOutline },
  VOTING: { title: "Voting validator", intent: "Authorized a governance vote.", accent: "violet", Icon: IoMegaphoneOutline },
  PROPOSING: { title: "Proposal validator", intent: "Authorized a governance proposal.", accent: "primary", Icon: IoDocumentTextOutline }
};

const metaFor = (purpose: string): PurposeMeta => PURPOSE_META[purpose] || PURPOSE_META.SPEND;

// ── Simple monospace data block (hash) ────────────────────────────────────────

const BlockLabel: React.FC<{ label: string; children?: React.ReactNode; copy?: string }> = ({ label, children, copy }) => (
  <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5} gap={1}>
    <Box display="flex" alignItems="center" gap={0.75} minWidth={0}>
      <Typography
        variant="overline"
        sx={{ fontWeight: 700, fontSize: "0.62rem", letterSpacing: "0.06em", color: "text.secondary" }}
      >
        {label}
      </Typography>
      {children}
    </Box>
    {copy && <CopyButton text={copy} />}
  </Box>
);

const monoBoxSx = (accent: string, isDark: boolean) => ({
  fontFamily: "monospace",
  fontSize: "0.72rem",
  lineHeight: 1.5,
  wordBreak: "break-all" as const,
  maxHeight: 200,
  overflow: "auto",
  p: 1,
  borderRadius: 1,
  bgcolor: alpha(accent, isDark ? 0.06 : 0.04),
  border: `1px solid ${alpha(accent, 0.18)}`
});

const DataBlock: React.FC<{ label: string; value?: string; emptyText?: string; accent: string }> = ({
  label,
  value,
  emptyText,
  accent
}) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  return (
    <Box>
      <BlockLabel label={label} copy={value} />
      {value ? (
        <Box sx={monoBoxSx(accent, theme.isDark)}>{value}</Box>
      ) : (
        <Typography variant="body2" color="text.disabled" fontStyle="italic">
          {emptyText || "None"}
        </Typography>
      )}
    </Box>
  );
};

// ── CBOR viewer with a Raw ⇄ Decoded toggle (datum / redeemer) ─────────────────

const ModeToggle: React.FC<{ mode: "raw" | "decoded"; onChange: (m: "raw" | "decoded") => void; accent: string }> = ({
  mode,
  onChange,
  accent
}) => (
  <Box sx={{ display: "inline-flex", borderRadius: 1, overflow: "hidden", border: `1px solid ${alpha(accent, 0.35)}` }}>
    {(["raw", "decoded"] as const).map((m) => (
      <Box
        key={m}
        role="button"
        aria-pressed={mode === m}
        tabIndex={0}
        onClick={() => onChange(m)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onChange(m);
          }
        }}
        sx={{
          px: 0.9,
          py: 0.2,
          fontSize: "0.6rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          cursor: "pointer",
          userSelect: "none",
          color: mode === m ? "#fff" : accent,
          bgcolor: mode === m ? accent : "transparent"
        }}
      >
        {m}
      </Box>
    ))}
  </Box>
);

const CborViewer: React.FC<{ label: string; value?: string; emptyText?: string; accent: string }> = ({
  label,
  value,
  emptyText,
  accent
}) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const decoded = useMemo(() => decodePlutusData(value), [value]);
  // Default to the decoded (readable) view; fall back to raw when undecodable.
  const [mode, setMode] = useState<"raw" | "decoded">("decoded");

  if (!value) {
    return (
      <Box>
        <BlockLabel label={label} />
        <Typography variant="body2" color="text.disabled" fontStyle="italic">
          {emptyText || "None"}
        </Typography>
      </Box>
    );
  }

  const showDecoded = mode === "decoded" && !!decoded;
  const shown = showDecoded ? (decoded as string) : value;

  return (
    <Box>
      <BlockLabel label={label} copy={shown}>
        {decoded && <ModeToggle mode={mode} onChange={setMode} accent={accent} />}
      </BlockLabel>
      <Box component={showDecoded ? "pre" : "div"} sx={{ ...monoBoxSx(accent, theme.isDark), m: 0, whiteSpace: showDecoded ? "pre-wrap" : "normal" }}>
        {shown}
      </Box>
    </Box>
  );
};

// ── Datum / Redeemer panel ────────────────────────────────────────────────────

const DataPanel: React.FC<{
  Icon: React.ComponentType<{ size?: number | string }>;
  title: string;
  accent: string;
  children: React.ReactNode;
}> = ({ Icon, title, accent, children }) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  return (
    <Box
      sx={{
        flex: "1 1 280px",
        minWidth: { xs: "100%", sm: 280 },
        borderRadius: 1.5,
        p: 1.75,
        bgcolor: theme.isDark ? alpha(theme.palette.background.paper, 0.4) : alpha(theme.palette.background.paper, 0.7),
        border: `1px solid ${alpha(accent, theme.isDark ? 0.3 : 0.22)}`
      }}
    >
      <Box display="flex" alignItems="center" gap={0.75} mb={1.25} sx={{ color: accent }}>
        <Icon size={16} />
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: "text.primary" }}>
          {title}
        </Typography>
      </Box>
      {children}
    </Box>
  );
};

// ── User-friendly script summary ──────────────────────────────────────────────

const BUILTIN_LIMIT = 30;

interface UplcNode {
  text?: string;
  data?: UplcNode[];
}

const ScriptSummary: React.FC<{ scriptBytes: string; accent: AccentRole }> = ({ scriptBytes, accent }) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const accentCss = accentColor(accent, theme);
  const program = useMemo(() => decodeScript(scriptBytes), [scriptBytes]);
  const sizeBytes = Math.floor(scriptBytes.replace(/^0x/, "").length / 2);

  const info = useMemo(() => {
    if (!program) return null;
    const builtins = new Set<string>();
    let nodes = 0;
    const walk = (arr?: UplcNode[]) => {
      arr?.forEach((n) => {
        nodes++;
        if (typeof n.text === "string" && n.text.startsWith("builtin ")) builtins.add(n.text.slice("builtin ".length));
        walk(n.data);
      });
    };
    walk(program.program?.data as UplcNode[] | undefined);
    return {
      version: `${program.version.major}.${program.version.minor}.${program.version.patch}`,
      builtins: Array.from(builtins).sort(),
      nodes
    };
  }, [program]);

  return (
    <Box>
      <Box display="flex" flexWrap="wrap" gap={1.5} mb={info && info.builtins.length > 0 ? 1.5 : 0}>
        <ParamCard label="UPLC VERSION" value={info?.version ?? "—"} description="Untyped Plutus Core language version of the compiled script." accent={accent} />
        <ParamCard label="COMPILED SIZE" value={sizeBytes} unit="bytes" description="On-chain size of the compiled script." accent={accent} />
        {info && (
          <ParamCard label="OPERATIONS" value={info.builtins.length} unit="builtins" description="Distinct on-chain operations (builtins) the script calls." accent={accent} />
        )}
      </Box>
      {info && info.builtins.length > 0 && (
        <Box>
          <Typography variant="overline" sx={{ fontWeight: 700, fontSize: "0.6rem", letterSpacing: "0.06em", color: "text.secondary" }}>
            Operations used
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.6} mt={0.5}>
            {info.builtins.slice(0, BUILTIN_LIMIT).map((b) => (
              <Box
                key={b}
                sx={{
                  px: 0.8,
                  py: 0.2,
                  borderRadius: 999,
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  fontFamily: "monospace",
                  color: accentCss,
                  bgcolor: alpha(accentCss, theme.isDark ? 0.12 : 0.08),
                  border: `1px solid ${alpha(accentCss, 0.25)}`
                }}
              >
                {b}
              </Box>
            ))}
            {info.builtins.length > BUILTIN_LIMIT && (
              <Box sx={{ px: 0.8, py: 0.2, fontSize: "0.62rem", color: "text.secondary" }}>+{info.builtins.length - BUILTIN_LIMIT} more</Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

// ── Raw low-level UPLC, collapsed by default ──────────────────────────────────

const AdvancedUplc: React.FC<{ value: string; accentCss: string }> = ({ value, accentCss }) => {
  const [open, setOpen] = useState(false);
  return (
    <Box mt={1.75}>
      <Box
        role="button"
        aria-expanded={open}
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: accentCss, userSelect: "none" }}
      >
        <IoChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
        {open ? "Hide low-level UPLC" : "Show low-level UPLC"}
      </Box>
      <Collapse in={open}>
        <Box mt={1}>
          <CompiledCodeDataCard title="Compiled code (UPLC)" value={value} />
        </Box>
      </Collapse>
    </Box>
  );
};

// ── One validator section ─────────────────────────────────────────────────────

const ContractSection: React.FC<{ item: IContractItemTx; index: number }> = ({ item, index }) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const meta = metaFor(item.purpose);
  const accentCss = accentColor(meta.accent, theme);

  const datumBytes = item.datumBytesOut || item.datumBytesIn;
  const datumHash = item.datumHashOut || item.datumHashIn;

  return (
    <SectionShell id={`contract-${index}`} accent={meta.accent}>
      <Box display="flex" flexWrap="wrap" alignItems="flex-start" justifyContent="space-between" gap={1.5}>
        <Box flex="1 1 320px" minWidth={0}>
          <SectionHeader Icon={meta.Icon} title={meta.title} intent={meta.intent} accent={meta.accent} />
        </Box>
        <Box pt={0.5}>
          <ScriptVerificationBadge scriptHash={item.scriptHash} />
        </Box>
      </Box>

      {/* Execution cost */}
      <Box display="flex" flexWrap="wrap" gap={1.5} mb={2.5}>
        <ParamCard label="CPU" value={item.redeemerSteps} unit="steps" description="Execution steps metered for this validator." accent={meta.accent} />
        <ParamCard label="MEMORY" value={item.redeemerMem} unit="units" description="Memory metered for this validator." accent={meta.accent} />
      </Box>

      {/* Datum + redeemer — toggle each CBOR between Raw and Decoded */}
      <Box display="flex" flexWrap="wrap" gap={1.5} mb={2.5}>
        <DataPanel Icon={IoDocumentTextOutline} title="Datum" accent={accentCss}>
          <Stack spacing={1.25}>
            <DataBlock label="Hash" value={datumHash} emptyText="No datum." accent={accentCss} />
            {datumBytes && <CborViewer label="Value" value={datumBytes} accent={accentCss} />}
          </Stack>
        </DataPanel>
        <DataPanel Icon={IoFlashOutline} title="Redeemer" accent={accentCss}>
          <CborViewer label="Value" value={item.redeemerBytes} emptyText="No redeemer recorded for this provider." accent={accentCss} />
        </DataPanel>
      </Box>

      {/* Reference inputs (CIP-31/33) — click through to the producing transaction */}
      {item.referenceInputs && item.referenceInputs.length > 0 && (
        <Box mb={2.5}>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, letterSpacing: "0.08em", color: "text.secondary", display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}
          >
            <IoReceiptOutline size={14} /> Reference inputs ({item.referenceInputs.length})
          </Typography>
          <Stack spacing={1}>
            {item.referenceInputs.map((ref, i) => (
              <Box
                key={`${ref.txHash}-${ref.index}-${i}`}
                component={RouterLink}
                to={details.transaction(ref.txHash)}
                title="Open the transaction that produced this reference UTxO"
                sx={{
                  display: "block",
                  p: 1.25,
                  borderRadius: 1.5,
                  border: `1px solid ${alpha(accentCss, 0.18)}`,
                  textDecoration: "none",
                  fontSize: "0.72rem",
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                  transition: "border-color .2s, background-color .2s",
                  "&:hover": { borderColor: alpha(accentCss, 0.5), bgcolor: alpha(accentCss, theme.isDark ? 0.06 : 0.04) }
                }}
              >
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Typography variant="caption" sx={{ fontFamily: "inherit", color: "primary.main", fontWeight: 600 }}>
                    {ref.txHash}#{ref.index}
                  </Typography>
                  <IoOpenOutline size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
                </Box>
                {ref.scriptHash && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: "inherit", mt: 0.5 }}>
                    reference script: {ref.scriptHash}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Script — user-friendly summary first, raw low-level UPLC behind an expander */}
      <Typography
        variant="overline"
        sx={{ fontWeight: 700, letterSpacing: "0.08em", color: "text.secondary", display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}
      >
        <IoCodeSlashOutline size={14} /> Script
      </Typography>
      <Box mb={1.5}>
        <DataBlock label="Hash" value={item.scriptHash} accent={accentCss} />
      </Box>
      {item.scriptBytes ? (
        <>
          <ScriptSummary scriptBytes={item.scriptBytes} accent={meta.accent} />
          <AdvancedUplc value={item.scriptBytes} accentCss={accentCss} />
        </>
      ) : (
        <Typography variant="body2" color="text.disabled" fontStyle="italic">
          Script bytecode isn&apos;t available from the current provider.
        </Typography>
      )}
    </SectionShell>
  );
};

// ── Validator selector pill (when >1) ─────────────────────────────────────────

const SelectorPill: React.FC<{ item: IContractItemTx; active: boolean; onClick: () => void }> = ({ item, active, onClick }) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };
  const meta = metaFor(item.purpose);
  const accentCss = accentColor(meta.accent, theme);
  const hashShort = item.scriptHash ? `${item.scriptHash.slice(0, 6)}…` : "";
  return (
    <Box
      role="tab"
      aria-selected={active}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.6,
        px: 1.25,
        py: 0.6,
        borderRadius: 999,
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontSize: "0.74rem",
        fontWeight: 700,
        color: active ? "#fff" : accentCss,
        bgcolor: active ? accentCss : alpha(accentCss, theme.isDark ? 0.12 : 0.08),
        border: `1px solid ${alpha(accentCss, active ? 0.9 : 0.3)}`,
        transition: "background-color .2s, border-color .2s"
      }}
    >
      <meta.Icon size={13} />
      {meta.title.replace(" validator", "").replace(" policy", "")}
      {hashShort && (
        <Box component="span" sx={{ fontWeight: 500, opacity: 0.85, fontFamily: "monospace" }}>
          {hashShort}
        </Box>
      )}
    </Box>
  );
};

// ── Public component ──────────────────────────────────────────────────────────

export interface SmartContractDetailsProps {
  data?: IContractItemTx[];
}

const SmartContractDetails: React.FC<SmartContractDetailsProps> = ({ data }) => {
  const [active, setActive] = useState(0);

  if (!data || data.length === 0) return null;

  const safeActive = Math.min(active, data.length - 1);
  const multiple = data.length > 1;

  return (
    <Box sx={{ textAlign: "left" }}>
      <Typography variant="h6" fontWeight={700} mb={multiple ? 1.5 : 2}>
        Smart contracts ({data.length})
      </Typography>

      {multiple && (
        <Box
          role="tablist"
          aria-label="Validators in this transaction"
          display="flex"
          gap={1}
          mb={2}
          sx={{ overflowX: "auto", pb: 1, "&::-webkit-scrollbar": { height: 6 } }}
        >
          {data.map((item, i) => (
            <SelectorPill key={`${item.scriptHash}-${i}`} item={item} active={i === safeActive} onClick={() => setActive(i)} />
          ))}
        </Box>
      )}

      <ContractSection item={data[safeActive]} index={safeActive} />
    </Box>
  );
};

export default SmartContractDetails;
