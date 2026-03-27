import { Box, CircularProgress, ClickAwayListener, Paper, Typography } from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

import { HeaderSearchIconComponent } from "src/commons/resources";
import CustomIcon from "src/components/commons/CustomIcon";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { SearchResult } from "@shared/dtos/seach.dto";

import { Form, StyledInput, SubmitButton } from "./style";

// ─── Suggestion shape ─────────────────────────────────────────────────────────

interface SearchSuggestion {
  category: string;
  icon: string;
  label: string;
  sublabel?: string;
  path: string;
}

// ─── Map API result → display suggestion ─────────────────────────────────────

const ICONS: Record<string, string> = {
  transaction: "⇄",
  block:       "⬛",
  epoch:       "🔄",
  address:     "👛",
  stake:       "🔑",
  pool:        "🏊",
  token:       "🪙",
  policy:      "📜",
  drep:        "🗳️",
  gov_action:  "⚖️",
};

const LABELS: Record<string, string> = {
  transaction: "Transaction",
  block:       "Block",
  epoch:       "Epoch",
  address:     "Address",
  stake:       "Stake",
  pool:        "Pool",
  token:       "Token",
  policy:      "Policy",
  drep:        "DRep",
  gov_action:  "Gov Action",
};

const CATEGORY_COLORS: Record<string, string> = {
  Transaction: "#3B82F6",
  Block:       "#8B5CF6",
  Epoch:       "#06B6D4",
  Address:     "#F59E0B",
  Stake:       "#EAB308",
  Pool:        "#6366F1",
  Token:       "#F97316",
  Policy:      "#A855F7",
  DRep:        "#10B981",
  "Gov Action": "#059669",
};

function trunc(s: string, head = 10, tail = 6): string {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function resultToSuggestion(r: SearchResult): SearchSuggestion {
  const icon = ICONS[r.type] ?? "?";
  const category = LABELS[r.type] ?? r.type;

  switch (r.type) {
    case "transaction":
      return { category, icon, label: trunc(r.id), sublabel: "Transaction hash", path: `/transaction/${r.id}` };
    case "block":
      return { category, icon, label: r.label ? `Block #${r.label}` : trunc(r.id), sublabel: "Block", path: `/block/${r.id}` };
    case "epoch":
      return { category, icon, label: `Epoch #${r.id}`, sublabel: "Epoch", path: `/epoch/${r.id}` };
    case "address":
      return { category, icon, label: trunc(r.id, 18, 6), sublabel: "Cardano payment address", path: `/address/${r.id}` };
    case "stake":
      return { category, icon, label: trunc(r.id, 18, 6), sublabel: "Stake address", path: `/stake-address/${r.id}` };
    case "pool":
      return { category, icon, label: r.label ? `${r.label} — ${trunc(r.id, 12, 6)}` : trunc(r.id, 18, 6), sublabel: "Stake pool", path: `/pool/${r.id}` };
    case "token":
      return { category, icon, label: r.label ? `${r.label} (${trunc(r.id, 10, 4)})` : trunc(r.id, 18, 6), sublabel: "Native token", path: `/token/${r.id}` };
    case "policy":
      return { category, icon, label: trunc(r.id), sublabel: "Policy ID / script hash", path: `/policy/${r.id}` };
    case "drep":
      return { category, icon, label: trunc(r.id, 18, 6), sublabel: "Delegated representative", path: `/drep/${r.id}` };
    case "gov_action":
      return { category, icon, label: `${trunc(r.id, 10, 4)}#${r.extraId}`, sublabel: "Governance action", path: `/governance-action/${r.id}/${r.extraId}` };
    default:
      return { category, icon, label: r.id, path: "/" };
  }
}

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
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Border color compatible with CustomPalette (theme.palette.divider not available)
  const borderColor = alpha(theme.palette.secondary.light, theme.isDark ? 0.15 : 0.2);

  // ── Trigger search after debounce ──────────────────────────────────────────
  useEffect(() => {
    const v = searchValue.trim();

    if (v.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    setOpen(true);
    setLoading(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const result = await ApiConnector.getApiConnector().search(v);
        setSuggestions((result.data ?? []).map(resultToSuggestion));
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  const navigateTo = useCallback(
    (path: string) => {
      navigate(path);
      setSearchValue("");
      setSuggestions([]);
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
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
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

  const noMatch = !loading && open && suggestions.length === 0 && searchValue.trim().length >= 2;
  const showDropdown = open && (loading || suggestions.length > 0 || noMatch);

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
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => {
              if (searchValue.trim().length >= 2) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("common.search.placeholder", "Search blocks, epochs, txs, addresses, tokens, pools, DReps…")}
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
              border: `1px solid ${borderColor}`,
              background: theme.palette.secondary[0],
            }}
          >
            {/* Loading state */}
            {loading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5 }}>
                <CircularProgress size={14} thickness={5} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem" }}>
                  Searching…
                </Typography>
              </Box>
            )}

            {/* No results */}
            {noMatch && (
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem" }}>
                  No results for &ldquo;{searchValue.trim()}&rdquo;
                </Typography>
              </Box>
            )}

            {/* Results */}
            {!loading && suggestions.map((s, i) => {
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
                      ? `1px solid ${alpha(theme.palette.secondary.light, 0.1)}`
                      : "none",
                  }}
                >
                  {/* Category badge */}
                  <Box sx={{ minWidth: 90, display: "flex", alignItems: "center" }}>
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
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                        {s.sublabel}
                      </Typography>
                    )}
                  </Box>

                  {/* Enter hint for single result */}
                  {i === 0 && suggestions.length === 1 && (
                    <Box sx={{ ml: "auto", fontSize: "0.65rem", color: "text.disabled", flexShrink: 0, pl: 1 }}>
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
