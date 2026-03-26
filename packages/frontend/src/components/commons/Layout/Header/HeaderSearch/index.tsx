import { Box, ClickAwayListener, Paper, Typography } from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

import { HeaderSearchIconComponent } from "src/commons/resources";
import CustomIcon from "src/components/commons/CustomIcon";

import { Form, StyledInput, SubmitButton } from "./style";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchSuggestion {
  category: string;
  label: string;
  sublabel?: string;
  path: string;
  icon: string;
  value: string;
}

// ─── Pattern detection ────────────────────────────────────────────────────────

function buildSuggestions(input: string): SearchSuggestion[] {
  const v = input.trim();
  if (!v || v.length < 2) return [];

  const results: SearchSuggestion[] = [];

  // 64-char hex → transaction hash
  if (/^[0-9a-f]{64}$/i.test(v)) {
    results.push({
      category: "Transaction",
      label: `${v.slice(0, 12)}…${v.slice(-8)}`,
      sublabel: "Transaction hash",
      path: `/transaction/${v}`,
      icon: "⇄",
      value: v,
    });
    return results;
  }

  // 56-char hex → block hash or policy ID
  if (/^[0-9a-f]{56}$/i.test(v)) {
    results.push({
      category: "Block",
      label: `${v.slice(0, 12)}…${v.slice(-8)}`,
      sublabel: "Block hash",
      path: `/block/${v}`,
      icon: "⬛",
      value: v,
    });
    results.push({
      category: "Policy",
      label: `${v.slice(0, 12)}…${v.slice(-8)}`,
      sublabel: "Policy ID",
      path: `/policy/${v}`,
      icon: "📜",
      value: v,
    });
    return results;
  }

  // Cardano address
  if (/^addr1[a-z0-9]+$/i.test(v)) {
    results.push({
      category: "Address",
      label: `${v.slice(0, 18)}…${v.slice(-6)}`,
      sublabel: "Cardano payment address",
      path: `/address/${v}`,
      icon: "👛",
      value: v,
    });
    return results;
  }

  // Stake address
  if (/^stake1[a-z0-9]+$/i.test(v)) {
    results.push({
      category: "Address",
      label: `${v.slice(0, 18)}…${v.slice(-6)}`,
      sublabel: "Stake address",
      path: `/address/${v}`,
      icon: "🔑",
      value: v,
    });
    return results;
  }

  // Pool ID
  if (/^pool1[a-z0-9]{50,}$/i.test(v)) {
    results.push({
      category: "Pool",
      label: `${v.slice(0, 18)}…${v.slice(-6)}`,
      sublabel: "Stake pool ID",
      path: `/pool/${v}`,
      icon: "🏊",
      value: v,
    });
    return results;
  }

  // DRep ID
  if (/^drep1[a-z0-9]+$/i.test(v)) {
    results.push({
      category: "DRep",
      label: `${v.slice(0, 18)}…${v.slice(-6)}`,
      sublabel: "Delegated representative",
      path: `/drep/${v}`,
      icon: "🗳️",
      value: v,
    });
    return results;
  }

  // Token fingerprint
  if (/^asset1[a-z0-9]+$/i.test(v)) {
    results.push({
      category: "Token",
      label: `${v.slice(0, 18)}…${v.slice(-6)}`,
      sublabel: "Native token fingerprint",
      path: `/token/${v}`,
      icon: "🪙",
      value: v,
    });
    return results;
  }

  // Pure number → block or epoch
  if (/^\d+$/.test(v)) {
    const num = parseInt(v, 10);
    results.push({
      category: "Block",
      label: `Block #${num.toLocaleString()}`,
      sublabel: "Navigate to block number",
      path: `/block/${v}`,
      icon: "⬛",
      value: v,
    });
    results.push({
      category: "Epoch",
      label: `Epoch #${num.toLocaleString()}`,
      sublabel: "Navigate to epoch",
      path: `/epoch/${v}`,
      icon: "🔄",
      value: v,
    });
    return results;
  }

  // Partial hex (8-63 chars) — likely a hash being typed
  if (/^[0-9a-f]+$/i.test(v) && v.length >= 8) {
    results.push({
      category: "Transaction",
      label: `${v}…`,
      sublabel: "Partial transaction hash — keep typing",
      path: `/transaction/${v}`,
      icon: "⇄",
      value: v,
    });
    results.push({
      category: "Block",
      label: `${v}…`,
      sublabel: "Partial block hash — keep typing",
      path: `/block/${v}`,
      icon: "⬛",
      value: v,
    });
  }

  return results;
}

// ─── Category color ───────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Transaction: "#3B82F6",
  Block:       "#8B5CF6",
  Epoch:       "#06B6D4",
  Address:     "#F59E0B",
  Pool:        "#6366F1",
  Token:       "#F97316",
  Policy:      "#A855F7",
  DRep:        "#10B981",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  home: boolean;
  callback?: () => void;
  setShowErrorMobile?: (show: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const HeaderSearch: React.FC<Props> = ({ home, callback }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = buildSuggestions(searchValue);

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchValue]);

  const navigateTo = useCallback(
    (path: string) => {
      navigate(path);
      setSearchValue("");
      setOpen(false);
      callback?.();
    },
    [navigate, callback]
  );

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      navigateTo(suggestions[activeIndex].path);
      return;
    }
    if (suggestions.length === 1) {
      navigateTo(suggestions[0].path);
      return;
    }
    if (suggestions.length > 1) {
      setOpen(true);
      return;
    }
    // No match — try as transaction hash fallback
    const v = searchValue.trim();
    if (v) navigateTo(`/transaction/${v}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showDropdown = open && suggestions.length > 0;

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative", width: "100%" }}>
        <Form home={+home} data-testid="header-search" onSubmit={submit}>
          <StyledInput
            inputRef={inputRef}
            data-testid="search-bar"
            home={home ? 1 : 0}
            required
            type="search"
            spellCheck={false}
            disableUnderline
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setOpen(e.target.value.trim().length >= 2);
            }}
            onFocus={() => {
              if (searchValue.trim().length >= 2) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("common.search.placeholder", "Search transactions, blocks, addresses, tokens…")}
          />
          <SubmitButton type="submit" home={home ? 1 : 0}>
            <CustomIcon
              icon={HeaderSearchIconComponent}
              stroke={theme.palette.secondary.light}
              fill={theme.palette.secondary[0]}
              height={home ? 24 : 20}
              width={home ? 24 : 20}
            />
          </SubmitButton>
        </Form>

        {showDropdown && (
          <Paper
            elevation={8}
            sx={{
              position: "absolute",
              top: home ? 62 : 46,
              left: 0,
              right: 0,
              zIndex: 1300,
              borderRadius: 2,
              overflow: "hidden",
              border: `1px solid ${theme.palette.divider}`,
              background: theme.palette.secondary[0],
            }}
          >
            {suggestions.map((s, i) => {
              const color = CATEGORY_COLORS[s.category] ?? theme.palette.primary.main;
              const isActive = i === activeIndex;
              return (
                <Box
                  key={`${s.category}-${i}`}
                  onClick={() => navigateTo(s.path)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1.25,
                    cursor: "pointer",
                    bgcolor: isActive
                      ? alpha(theme.palette.primary.main, 0.08)
                      : "transparent",
                    "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                    borderBottom: i < suggestions.length - 1
                      ? `1px solid ${alpha(theme.palette.divider, 0.6)}`
                      : "none",
                  }}
                >
                  {/* Category badge */}
                  <Box
                    sx={{
                      minWidth: 80,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                    }}
                  >
                    <Box
                      sx={{
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        px: 0.8,
                        py: 0.3,
                        borderRadius: "4px",
                        bgcolor: alpha(color, 0.12),
                        color,
                        border: `1px solid ${alpha(color, 0.3)}`,
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.icon} {s.category}
                    </Box>
                  </Box>

                  {/* Label + sublabel */}
                  <Box minWidth={0}>
                    <Typography
                      variant="body2"
                      fontFamily="monospace"
                      fontWeight={600}
                      color="text.primary"
                      sx={{ fontSize: "0.82rem", lineHeight: 1.3 }}
                      noWrap
                    >
                      {s.label}
                    </Typography>
                    {s.sublabel && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.7rem" }}
                      >
                        {s.sublabel}
                      </Typography>
                    )}
                  </Box>

                  {/* Enter hint for first item */}
                  {i === 0 && suggestions.length === 1 && (
                    <Box
                      sx={{
                        ml: "auto",
                        fontSize: "0.65rem",
                        color: "text.disabled",
                        flexShrink: 0,
                        pl: 1,
                      }}
                    >
                      ↵ Enter
                    </Box>
                  )}
                </Box>
              );
            })}
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default HeaderSearch;
