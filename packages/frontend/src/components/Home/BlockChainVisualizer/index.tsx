import { useCallback, useEffect, useRef, useState, MouseEvent } from "react";
import { Box, Chip, Paper, Skeleton, Tooltip, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { IoCopyOutline, IoCheckmarkSharp } from "react-icons/io5";

import { BLOCK_MAX_SIZE } from "src/components/commons/BlockFillBar";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { Block } from "@shared/dtos/block.dto";
import { details, routers } from "src/commons/routers";
import { formatADA, getShortHash } from "src/commons/utils/helper";

const PAGE_SIZE = 20;

// ─── BlockChainCard ───────────────────────────────────────────────────────────

const BlockChainCard: React.FC<{ block: Block; isLatest?: boolean }> = ({ block, isLatest }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const fillPct = block.size != null ? Math.min(100, Math.round((block.size / BLOCK_MAX_SIZE) * 100)) : 0;
  const fillColor =
    fillPct >= 90 ? theme.palette.error.main :
    fillPct >= 70 ? theme.palette.warning.main :
    theme.palette.primary.main;

  const handleCopy = (e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(block.hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const cardBg    = theme.isDark ? "#1e2533" : "#ffffff";
  const border    = theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const labelCol  = theme.isDark ? "rgba(255,255,255,0.5)"  : "rgba(0,0,0,0.45)";
  const valueCol  = theme.isDark ? "#ffffff"                : "#111111";
  const accentCol = theme.palette.primary.main;
  const divCol    = theme.isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const successCol = theme.isDark ? "#4caf50" : "#2e7d32";

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: "Epoch",         value: String(block.epochNo) },
    { label: "Epoch slot",    value: block.epochSlotNo?.toLocaleString() ?? "—" },
    { label: "Absolute slot", value: block.slotNo?.toLocaleString() ?? "—" },
    { label: "Transactions",  value: String(block.txCount) },
    { label: "Size",          value: block.size != null ? `${block.size.toLocaleString()} B · ${fillPct}% full` : "—" },
    { label: "Total fees",    value: block.totalFees != null ? `${formatADA(block.totalFees)} ₳` : "—" },
    { label: "Total output",  value: block.totalOutput != null ? `${formatADA(block.totalOutput)} ₳` : "—" },
    ...(block.poolName || block.poolTicker
      ? [{ label: "Pool", value: block.poolName || block.poolTicker || "" }]
      : []),
    ...(block.confirmations != null
      ? [{ label: "Confirmations", value: `${block.confirmations.toLocaleString()} blocks` }]
      : []),
  ];

  const tooltipContent = (
    <Box sx={{ minWidth: 230, fontFamily: "inherit" }}>
      <Box sx={{
        px: 1.75, pt: 1.5, pb: 1,
        borderBottom: `1px solid ${divCol}`,
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <Box sx={{ fontWeight: 800, fontSize: "0.92rem", color: accentCol, fontFamily: "monospace", letterSpacing: "-0.01em" }}>
          Block #{block.blockNo?.toLocaleString()}
        </Box>
        {block.time && (
          <Box sx={{ fontSize: "0.67rem", color: labelCol, ml: 1.5, whiteSpace: "nowrap" }}>
            {formatDistanceToNow(new Date(Number(block.time) * 1000), { addSuffix: true })}
          </Box>
        )}
      </Box>

      <Box sx={{ px: 1.75, py: 1 }}>
        {/* Hash row with copy button */}
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 0.7 }}>
          <Box sx={{ fontSize: "0.72rem", color: labelCol, flexShrink: 0, lineHeight: 1.4 }}>Hash</Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Box component="span" sx={{ fontSize: "0.72rem", fontWeight: 600, color: valueCol, fontFamily: "monospace", lineHeight: 1.4 }}>
              {getShortHash(block.hash)}
            </Box>
            <Box
              component="button"
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy full hash"}
              sx={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 22, height: 22,
                border: `1px solid ${copied ? successCol : border}`,
                borderRadius: "5px",
                bgcolor: copied ? (theme.isDark ? "rgba(76,175,80,0.15)" : "rgba(46,125,50,0.08)") : "transparent",
                color: copied ? successCol : labelCol,
                cursor: "pointer", flexShrink: 0, padding: 0,
                transition: "color 0.15s, border-color 0.15s, background-color 0.15s",
                "&:hover": {
                  color: copied ? successCol : valueCol,
                  borderColor: copied ? successCol : valueCol,
                  bgcolor: theme.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                }
              }}
            >
              {copied ? <IoCheckmarkSharp size={12} /> : <IoCopyOutline size={12} />}
            </Box>
          </Box>
        </Box>

        {rows.map(({ label, value, mono }) => (
          <Box key={label} display="flex" justifyContent="space-between" alignItems="baseline" gap={2} sx={{ mb: 0.55 }}>
            <Box sx={{ fontSize: "0.72rem", color: labelCol, flexShrink: 0, lineHeight: 1.4 }}>{label}</Box>
            <Box sx={{ fontSize: "0.75rem", fontWeight: 600, color: valueCol, textAlign: "right", lineHeight: 1.4, fontFamily: mono ? "monospace" : "inherit" }}>
              {value}
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ px: 1.75, pb: 1.25, pt: 0.25, borderTop: `1px solid ${divCol}`, fontSize: "0.67rem", color: labelCol, textAlign: "center" }}>
        Click to open block detail
      </Box>
    </Box>
  );

  return (
    <Tooltip
      title={tooltipContent}
      arrow
      placement="top"
      enterDelay={200}
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: cardBg, border: `1px solid ${border}`, borderRadius: "10px",
            boxShadow: theme.isDark ? "0 8px 24px rgba(0,0,0,0.55)" : "0 8px 24px rgba(0,0,0,0.12)",
            p: 0, maxWidth: 300,
          }
        },
        arrow: { sx: { color: cardBg, "&::before": { border: `1px solid ${border}` } } }
      }}
    >
      <Paper
        elevation={0}
        onClick={() => navigate(details.block(block.blockNo))}
        sx={{
          width: 148, height: 130, flexShrink: 0, borderRadius: 2.5, overflow: "hidden", position: "relative",
          border: `1.5px solid ${isLatest ? theme.palette.primary.main : theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e0e0e0"}`,
          bgcolor: theme.palette.secondary[0], cursor: "pointer",
          transition: "border-color 0.15s, box-shadow 0.15s, transform 0.12s",
          "&:hover": { borderColor: theme.palette.primary.main, boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}`, transform: "translateY(-2px)" }
        }}
      >
        {/* Liquid fill */}
        <Box sx={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: `${fillPct}%`,
          bgcolor: alpha(fillColor, theme.isDark ? 0.18 : 0.12),
          transition: "height 0.6s ease",
          borderTop: `1.5px solid ${alpha(fillColor, 0.35)}`,
        }} />

        <Box sx={{ position: "relative", p: 1.5, height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.7}>
              <Box sx={{ fontWeight: 800, fontSize: "0.84rem", color: "primary.main", fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                #{block.blockNo?.toLocaleString()}
              </Box>
              {isLatest ? (
                <Box sx={{
                  width: 7, height: 7, borderRadius: "50%", bgcolor: "success.main",
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.success.main, 0.28)}`,
                  "@keyframes livePulse": {
                    "0%, 100%": { boxShadow: `0 0 0 3px ${alpha(theme.palette.success.main, 0.28)}` },
                    "50%":       { boxShadow: `0 0 0 5px ${alpha(theme.palette.success.main, 0.10)}` },
                  },
                  animation: "livePulse 2s ease-in-out infinite",
                }} />
              ) : (
                <Box sx={{
                  fontSize: "0.58rem", fontWeight: 700, color: fillColor,
                  bgcolor: alpha(fillColor, 0.15), px: 0.55, py: 0.1, borderRadius: "6px",
                  border: `1px solid ${alpha(fillColor, 0.3)}`
                }}>
                  {fillPct}%
                </Box>
              )}
            </Box>
            <Box sx={{ fontSize: "0.68rem", color: "text.secondary", mb: 0.3 }}>
              <Box component="span" sx={{ fontWeight: 700, color: "text.primary", fontSize: "0.78rem" }}>{block.txCount}</Box>
              {" txs"}
            </Box>
            {block.size != null && (
              <Box sx={{ fontSize: "0.64rem", color: "text.secondary", mb: 0.3 }}>
                {(block.size / 1024).toFixed(1)} KB
              </Box>
            )}
          </Box>
          <Box>
            <Box sx={{ fontSize: "0.63rem", color: "text.secondary", mb: 0.25 }}>
              {block.time ? formatDistanceToNow(new Date(Number(block.time) * 1000), { addSuffix: true }) : "—"}
            </Box>
            {(block.poolTicker || block.poolName) && (
              <Box sx={{ fontSize: "0.62rem", color: "primary.main", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {block.poolTicker ? `[${block.poolTicker}]` : (block.poolName ?? "").slice(0, 16)}
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </Tooltip>
  );
};

// ─── BlockChainConnector ──────────────────────────────────────────────────────

const BlockChainConnector: React.FC<{ gap: number }> = ({ gap }) => {
  const theme = useTheme();
  const lineColor = alpha(theme.palette.secondary.light, 0.22);
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center"
      sx={{ flexShrink: 0, width: gap > 0 ? 64 : 28, gap: 0.4 }}
    >
      {gap > 0 && (
        <Tooltip title={`${gap.toLocaleString()} block${gap === 1 ? "" : "s"} not shown in this view`} arrow placement="top">
          <Box sx={{
            fontSize: "0.57rem", fontWeight: 600, color: "secondary.light",
            bgcolor: alpha(theme.palette.secondary.light, 0.06),
            border: `1px dashed ${alpha(theme.palette.secondary.light, 0.2)}`,
            px: 0.65, py: 0.2, borderRadius: "8px", whiteSpace: "nowrap", cursor: "default"
          }}>
            +{gap.toLocaleString()}
          </Box>
        </Tooltip>
      )}
      <Box sx={{ width: "100%", height: "1.5px", bgcolor: lineColor, borderRadius: 1 }} />
    </Box>
  );
};

// ─── BlockChainVisualizer ─────────────────────────────────────────────────────

const BlockChainVisualizer: React.FC = () => {
  const theme = useTheme();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState(2);
  const [lastUpdated, setLastUpdated] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<() => void>(() => {});

  const doFetch = useCallback(() => {
    ApiConnector.getApiConnector()
      .getBlocksPage({ page: "1", size: String(PAGE_SIZE) })
      .then((res) => {
        const fresh = res.data ?? [];
        setLastUpdated(Date.now());
        setBlocks((prev) => {
          if (prev.length === 0) return fresh;
          const maxNo = prev[0].blockNo;
          const newOnes = fresh.filter((b) => b.blockNo > maxNo);
          return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    ApiConnector.getApiConnector()
      .getBlocksPage({ page: String(nextPage), size: String(PAGE_SIZE) })
      .then((res) => {
        const more = res.data ?? [];
        setBlocks((prev) => {
          const existing = new Set(prev.map((b) => b.blockNo));
          const unique = more.filter((b) => !existing.has(b.blockNo));
          return unique.length > 0 ? [...prev, ...unique] : prev;
        });
        setHasMore(more.length === PAGE_SIZE);
        setNextPage((p) => p + 1);
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  }, [loadingMore, hasMore, nextPage]);

  useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

  useEffect(() => {
    doFetch();
    const id = setInterval(doFetch, 30_000);
    return () => clearInterval(id);
  }, [doFetch]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 320) loadMoreRef.current();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loading]);

  const borderColor = theme.isDark
    ? alpha(theme.palette.secondary.light, 0.1)
    : theme.palette.primary[200] || "#e0e0e0";

  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, background: theme.palette.secondary[0], border: `1px solid ${borderColor}`, mb: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" fontWeight={600}>Block Chain</Typography>
          <Chip label="LIVE" size="small" color="success"
            sx={{ height: 18, fontSize: "0.57rem", fontWeight: 700, "& .MuiChip-label": { px: 0.7 } }}
          />
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          {!loading && lastUpdated > 0 && (
            <Typography variant="caption" color="text.secondary">
              Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </Typography>
          )}
          <Link to={routers.BLOCK_LIST} style={{ textDecoration: "none" }}>
            <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 500, "&:hover": { textDecoration: "underline" } }}>
              View All
            </Typography>
          </Link>
        </Box>
      </Box>

      {/* Legend */}
      <Box display="flex" alignItems="center" gap={2} mb={1.5}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.62rem" }}>Block fill:</Typography>
        {[
          { label: "< 70%",  color: theme.palette.primary.main,  tip: "Block is less than 70% full" },
          { label: "70–90%", color: theme.palette.warning.main,   tip: "Block is 70–90% full" },
          { label: "> 90%",  color: theme.palette.error.main,     tip: "Block is over 90% full" },
        ].map(({ label, color, tip }) => (
          <Tooltip key={label} title={tip} arrow placement="top">
            <Box display="flex" alignItems="center" gap={0.4} sx={{ cursor: "default" }}>
              <Box sx={{ width: 10, height: 10, bgcolor: alpha(color, 0.25), border: `1.5px solid ${alpha(color, 0.5)}`, borderRadius: "2px" }} />
              <Typography variant="caption" sx={{ fontSize: "0.62rem", color: "secondary.light" }}>{label}</Typography>
            </Box>
          </Tooltip>
        ))}
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.62rem", ml: "auto" }}>
          ← newer &nbsp;&nbsp; older →
        </Typography>
      </Box>

      {/* Chain */}
      {loading ? (
        <Box display="flex" alignItems="center">
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} display="flex" alignItems="center">
              <Skeleton variant="rounded" width={168} height={116} sx={{ flexShrink: 0, borderRadius: 2.5 }} />
              {i < 5 && <Box sx={{ width: 28, flexShrink: 0 }} />}
            </Box>
          ))}
        </Box>
      ) : (
        <Box
          ref={scrollRef}
          sx={{
            display: "flex", alignItems: "center", overflowX: "auto", pb: 0.5,
            "&::-webkit-scrollbar": { height: 4 },
            "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
            "&::-webkit-scrollbar-thumb": { bgcolor: alpha(theme.palette.secondary.light, 0.18), borderRadius: 2 }
          }}
        >
          {blocks.map((block, i) => (
            <Box key={block.hash} display="flex" alignItems="center">
              <BlockChainCard block={block} isLatest={i === 0} />
              {i < blocks.length - 1 && (
                <BlockChainConnector gap={block.blockNo - (blocks[i + 1]?.blockNo ?? block.blockNo) - 1} />
              )}
            </Box>
          ))}

          {blocks.length > 0 && (loadingMore || hasMore) && <BlockChainConnector gap={0} />}

          {loadingMore && (
            <Box sx={{
              width: 168, height: 116, flexShrink: 0, borderRadius: 2.5,
              border: `1px dashed ${alpha(theme.palette.secondary.light, 0.2)}`,
              bgcolor: alpha(theme.palette.secondary.light, 0.03),
              display: "flex", flexDirection: "column", justifyContent: "center", gap: 1, px: 2
            }}>
              <Skeleton variant="rounded" width="70%" height={10} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rounded" width="50%" height={8}  sx={{ borderRadius: 1 }} />
              <Skeleton variant="rounded" width="60%" height={8}  sx={{ borderRadius: 1 }} />
              <Skeleton variant="rounded" width="45%" height={8}  sx={{ borderRadius: 1 }} />
            </Box>
          )}

          {!loadingMore && !hasMore && blocks.length > 0 && (
            <Box sx={{ flexShrink: 0, px: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", whiteSpace: "nowrap" }}>
                End of chain
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default BlockChainVisualizer;
