import React, { useEffect, useState } from "react";
import {
  Box,
  Chip,
  Container,
  Divider,
  LinearProgress,
  Paper,
  Skeleton,
  Tooltip,
  Typography,
  useTheme
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams, Link } from "react-router-dom";
import { HiArrowLongLeft } from "react-icons/hi2";
import { IoCheckmarkCircle, IoWarning, IoGlobeOutline } from "react-icons/io5";
import { MdContentCopy } from "react-icons/md";

import { details } from "src/commons/routers";
import { formatADA, formatADAFull, formatPercent, formatDateTimeLocal } from "src/commons/utils/helper";
import ADAicon from "src/components/commons/ADAIcon";
import FormNowMessage from "src/components/commons/FormNowMessage";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { ApiReturnType } from "@shared/APIReturnType";
import { PoolDetail, POOL_STATUS } from "@shared/dtos/pool.dto";
import { Block } from "@shared/dtos/block.dto";
import BlockListComponent from "src/components/BlockListComponent";
import PluginSlotRenderer from "src/plugins/PluginSlotRenderer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

function truncateMiddle(str: string, start = 12, end = 8): string {
  if (!str || str.length <= start + end + 3) return str;
  return `${str.slice(0, start)}…${str.slice(-end)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: POOL_STATUS | undefined }) {
  if (!status) return null;
  const meta =
    status === POOL_STATUS.ACTIVE   ? { label: "Active",   color: "success" as const } :
    status === POOL_STATUS.RETIRING ? { label: "Retiring", color: "warning" as const } :
    status === POOL_STATUS.RETIRED  ? { label: "Retired",  color: "error"   as const } :
    null;
  if (!meta) return null;
  return (
    <Chip
      label={meta.label}
      color={meta.color}
      size="small"
      sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700, "& .MuiChip-label": { px: 1 } }}
    />
  );
}

interface CopyableIdProps {
  label: string;
  value: string | undefined;
  linkTo?: string;
}

function CopyableId({ label, value, linkTo }: CopyableIdProps) {
  const theme = useTheme();
  if (!value) return null;
  return (
    <Box display="flex" alignItems="flex-start" gap={1} mb={0.75} flexWrap="wrap">
      <Box sx={{ fontSize: "0.78rem", color: "secondary.light", minWidth: 60, mt: "1px", flexShrink: 0 }}>
        {label}:
      </Box>
      <Box display="flex" alignItems="center" gap={0.5} sx={{ wordBreak: "break-all", flex: 1 }}>
        {linkTo ? (
          <Box
            component={Link}
            to={linkTo}
            sx={{ fontSize: "0.78rem", color: "primary.main", textDecoration: "none", fontFamily: "monospace", "&:hover": { textDecoration: "underline" } }}
          >
            {truncateMiddle(value, 16, 8)}
          </Box>
        ) : (
          <Box sx={{ fontSize: "0.78rem", color: "text.primary", fontFamily: "monospace" }}>
            {truncateMiddle(value, 16, 8)}
          </Box>
        )}
        <Tooltip title="Copy">
          <Box
            component="span"
            onClick={() => copyToClipboard(value)}
            sx={{ cursor: "pointer", color: "secondary.light", display: "flex", "&:hover": { color: "primary.main" }, flexShrink: 0 }}
          >
            <MdContentCopy size={13} />
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}

interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  accent?: boolean;
  tooltip?: React.ReactNode;
}

function StatCard({ label, value, accent, tooltip }: StatCardProps) {
  const theme = useTheme();
  const labelEl = (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        ...(tooltip ? { cursor: "help", borderBottom: "1px dashed", borderColor: "secondary.light", display: "inline-block", lineHeight: 1.4 } : {})
      }}
    >
      {label}
    </Typography>
  );
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${
          accent
            ? alpha(theme.palette.primary.main, 0.25)
            : theme.isDark
            ? alpha(theme.palette.secondary.light, 0.1)
            : theme.palette.primary[200] || "#e8edf2"
        }`,
        bgcolor: accent
          ? alpha(theme.palette.primary.main, theme.isDark ? 0.07 : 0.03)
          : "background.paper",
        display: "flex",
        flexDirection: "column",
        gap: 0.5
      }}
    >
      {tooltip ? (
        <Tooltip arrow placement="top" title={tooltip}>{labelEl}</Tooltip>
      ) : labelEl}
      <Box sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary" }}>
        {value}
      </Box>
    </Paper>
  );
}

// ─── Saturation visualization ─────────────────────────────────────────────────

function SaturationCard({ saturation }: { saturation: number | null | undefined }) {
  const theme = useTheme();
  // saturation from Blockfrost is a 0–1 fraction (e.g. 0.85 = 85%)
  const pct = Math.min(100, (saturation ?? 0) * 100);
  const isOver = (saturation ?? 0) > 1;
  const barColor = isOver ? theme.palette.error[700] : theme.palette.success.main;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${alpha(barColor, 0.3)}`,
        bgcolor: alpha(barColor, theme.isDark ? 0.05 : 0.03)
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Saturation
      </Typography>
      <Box display="flex" alignItems="baseline" justifyContent="space-between" mt={0.5} mb={1}>
        <Box sx={{ fontWeight: 800, fontSize: "1.1rem", color: isOver ? "error.main" : "text.primary" }}>
          {saturation != null ? formatPercent(saturation) : "—"}
        </Box>
        {isOver && (
          <Chip label="Over-saturated" color="error" size="small" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 700 }} />
        )}
      </Box>
      <Box
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : alpha(theme.palette.secondary.light, 0.15),
          overflow: "hidden"
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 4,
            background: `linear-gradient(90deg, ${alpha(barColor, 0.7)}, ${barColor})`,
            transition: "width 0.4s ease"
          }}
        />
      </Box>
    </Paper>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PoolDetailSkeleton() {
  return (
    <Container sx={{ pt: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="text" width={60} />
      </Box>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 3, border: "1px solid", borderColor: "divider" }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Skeleton variant="rounded" width={56} height={56} />
          <Box flex={1}>
            <Skeleton variant="text" width="40%" height={32} />
            <Skeleton variant="text" width="20%" height={20} />
          </Box>
        </Box>
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="50%" />
      </Paper>
      <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(180px, 1fr))" gap={2} mb={3}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={90} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    </Container>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const DelegationDetail: React.FC = () => {
  const { poolId } = useParams<{ poolId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const [poolData, setPoolData] = useState<ApiReturnType<PoolDetail>>();
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [blocksData, setBlocksData] = useState<ApiReturnType<Block[]>>();
  const [blocksLoading, setBlocksLoading] = useState(true);
  const apiConnector = ApiConnector.getApiConnector();
  const network = process.env.REACT_APP_NETWORK || "mainnet";

  const fetchBlocks = (pageInfo: { page: number; size?: number }) => {
    setBlocksLoading(true);
    // page arg is already 1-based (from BlockListComponent's PaginationCustom)
    apiConnector.getPoolBlocks(poolId!, { page: pageInfo.page, size: pageInfo.size ?? 20 } as any).then((res) => {
      setBlocksData(res);
      setBlocksLoading(false);
    });
  };

  useEffect(() => {
    document.title = `Pool ${poolId} | Phoenix Explorer`;
    window.scrollTo(0, 0);
    setLoading(true);
    setLogoError(false);
    apiConnector.getPoolDetail(poolId!).then((response) => {
      setPoolData(response);
      setLoading(false);
    });
    fetchBlocks({ page: 1 });
  }, [poolId]);

  if (loading) return <PoolDetailSkeleton />;

  const data = poolData?.data;
  if (!data) return null;

  const pledgeMet = (data.pledge ?? 0) <= (data.totalBalanceOfPoolOwners ?? 0);

  return (
    <Container sx={{ pt: 3, pb: 6 }}>
      {/* Back button */}
      <Box
        display="inline-flex"
        alignItems="center"
        gap={0.75}
        mb={2.5}
        sx={{ cursor: "pointer", color: "secondary.light", "&:hover": { color: "text.primary" }, fontSize: "0.85rem" }}
        onClick={() => navigate(-1)}
      >
        <HiArrowLongLeft size={18} />
        Back
      </Box>

      {/* ── Header card ─────────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          mb: 3,
          border: `1px solid ${theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e8edf2"}`
        }}
      >
        {/* Pool name row */}
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            {data.logoUrl && !logoError && (
              <Box
                component="img"
                src={data.logoUrl}
                onError={() => setLogoError(true)}
                sx={{
                  width: 52,
                  height: 52,
                  objectFit: "contain",
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.primary[200] || "#e8edf2"}`,
                  bgcolor: "white",
                  flexShrink: 0
                }}
              />
            )}
            <Box>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="h5" fontWeight={800} color="text.primary" lineHeight={1.2}>
                  {data.poolName || "Unknown Pool"}
                </Typography>
                {data.tickerName && (
                  <Chip
                    label={data.tickerName}
                    size="small"
                    sx={{
                      height: 22,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      fontSize: "0.72rem",
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                      color: "primary.main",
                      border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.3)}`
                    }}
                  />
                )}
                <StatusBadge status={data.poolStatus} />
              </Box>
              {data.createDate && (
                <Box sx={{ fontSize: "0.75rem", color: "secondary.light", mt: 0.4 }}>
                  Created: <DatetimeTypeTooltip><span>{formatDateTimeLocal(data.createDate)}</span></DatetimeTypeTooltip>
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ fontSize: "0.78rem", color: "secondary.light" }}>
            <FormNowMessage time={poolData?.lastUpdated} />
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* IDs */}
        <CopyableId label="Pool ID" value={data.poolView} linkTo={details.delegation(data.poolView)} />
        {data.hashView && <CopyableId label="Pool Hash" value={data.hashView} />}

        {/* Homepage */}
        {data.homepage && (
          <Box display="flex" alignItems="center" gap={1} mb={0.75}>
            <IoGlobeOutline size={14} color={theme.palette.secondary.light as string} />
            <Box
              component="a"
              href={data.homepage}
              target="_blank"
              rel="noreferrer"
              sx={{ fontSize: "0.82rem", color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
            >
              {data.homepage}
            </Box>
          </Box>
        )}

        {/* Description */}
        {data.description && (
          <Box
            sx={{
              mt: 1.5,
              px: 2,
              py: 1.25,
              borderRadius: 2,
              bgcolor: theme.isDark ? alpha(theme.palette.secondary.light, 0.05) : alpha(theme.palette.secondary.light, 0.06),
              fontSize: "0.82rem",
              color: "text.secondary",
              lineHeight: 1.6
            }}
          >
            {data.description}
          </Box>
        )}
      </Paper>

      {/* ── Stats grid ──────────────────────────────────────────────────── */}

      {/* Row 1: Key figures */}
      <Box
        display="grid"
        sx={{
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 2,
          mb: 2
        }}
      >
        {/* Saturation — wider */}
        <Box sx={{ gridColumn: "span 2", "@media (max-width: 500px)": { gridColumn: "span 1" } }}>
          <SaturationCard saturation={data.saturation} />
        </Box>

        <StatCard
          label={<>Pool Size (<ADAicon />)</>}
          tooltip="Live stake delegated to the pool right now (sum of stake-key balances)."
          value={
            data.poolSize != null
              ? <Box display="inline-flex" alignItems="center" gap={0.4}>{formatADA(data.poolSize)}<ADAicon /></Box>
              : "—"
          }
          accent
        />

        <StatCard
          label="Delegators"
          tooltip="Number of stake addresses currently delegating to this pool. Includes all-time delegators reported by the indexer; some may have undelegated."
          value={data.delegators != null ? data.delegators.toLocaleString() : "—"}
        />

        <StatCard
          label="Fixed Cost (₳)"
          tooltip="Fixed ADA cost per epoch the pool deducts from rewards before splitting between operator and delegators."
          value={
            <Box display="inline-flex" alignItems="center" gap={0.4}>{formatADA(data.cost)}<ADAicon /></Box>
          }
        />

        <StatCard
          label="Margin"
          tooltip="Operator's variable fee — percentage of remaining rewards taken after the fixed cost."
          value={formatPercent(data.margin)}
        />

        <StatCard
          label={
            <Box display="inline-flex" alignItems="center" gap={0.5}>
              Declared Pledge
              <Tooltip
                title={
                  <Box sx={{ p: 0.5 }}>
                    <Box sx={{ fontSize: "0.72rem", color: "secondary.light" }}>Actual balance of owners</Box>
                    <Box sx={{ fontWeight: 700 }}>
                      {data.totalBalanceOfPoolOwners != null
                        ? <>{formatADAFull(data.totalBalanceOfPoolOwners)} ₳</>
                        : "N/A"}
                    </Box>
                  </Box>
                }
              >
                <Box component="span" sx={{ display: "inline-flex", cursor: "help" }}>
                  {pledgeMet
                    ? <IoCheckmarkCircle size={14} color={theme.palette.success.main} />
                    : <IoWarning size={14} color={theme.palette.warning.main} />}
                </Box>
              </Tooltip>
            </Box>
          }
          value={<Box display="inline-flex" alignItems="center" gap={0.4}>{formatADA(data.pledge)}<ADAicon /></Box>}
        />

        {data.livePledge !== undefined && (
          <StatCard
            label="Live Pledge (₳)"
            tooltip="Current observable balance of the pool's owner addresses (live snapshot, may differ slightly from active-epoch pledge)."
            value={<Box display="inline-flex" alignItems="center" gap={0.4}>{formatADA(data.livePledge)}<ADAicon /></Box>}
          />
        )}

        <StatCard
          label="Epoch Blocks"
          value={data.epochBlock?.toLocaleString() ?? "—"}
        />

        <StatCard
          label="Lifetime Blocks"
          value={data.lifetimeBlock?.toLocaleString() ?? "—"}
        />

        {data.ros != null && data.ros > 0 && (
          <StatCard
            label="Return on Stake"
            value={formatPercent(data.ros / 100)}
          />
        )}
      </Box>

      {/* ── Accounts ────────────────────────────────────────────────────── */}
      {((data.rewardAccounts?.length ?? 0) > 0 || (data.ownerAccounts?.length ?? 0) > 0) && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            mb: 3,
            border: `1px solid ${theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e8edf2"}`
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5} sx={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.72rem" }}>
            Accounts
          </Typography>
          <Box display="grid" sx={{ gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            {data.rewardAccounts?.length > 0 && (
              <Box>
                <Box sx={{ fontSize: "0.75rem", color: "secondary.light", fontWeight: 600, mb: 0.75 }}>
                  Reward Account{data.rewardAccounts.length > 1 ? "s" : ""}
                </Box>
                {data.rewardAccounts.map((acc, i) => (
                  <Box key={i} display="flex" alignItems="center" gap={0.5} mb={0.5} minWidth={0}>
                    <Box
                      component={Link}
                      to={details.stake(acc)}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: "0.75rem",
                        fontFamily: "monospace",
                        color: "primary.main",
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {acc}
                    </Box>
                    <Box
                      component="button"
                      onClick={() => copyToClipboard(acc)}
                      title="Copy"
                      sx={{
                        cursor: "pointer", border: "none", background: "transparent",
                        color: "secondary.light", display: "inline-flex", alignItems: "center",
                        p: 0.5, "&:hover": { color: "primary.main" }
                      }}
                    >
                      <MdContentCopy size={13} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {data.ownerAccounts?.length > 0 && (
              <Box>
                <Box sx={{ fontSize: "0.75rem", color: "secondary.light", fontWeight: 600, mb: 0.75 }}>
                  Owner Account{data.ownerAccounts.length > 1 ? "s" : ""}
                </Box>
                {data.ownerAccounts.map((acc, i) => (
                  <Box key={i} display="flex" alignItems="center" gap={0.5} mb={0.5} minWidth={0}>
                    <Box
                      component={Link}
                      to={details.stake(acc)}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: "0.75rem",
                        fontFamily: "monospace",
                        color: "primary.main",
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {acc}
                    </Box>
                    <Box
                      component="button"
                      onClick={() => copyToClipboard(acc)}
                      title="Copy"
                      sx={{
                        cursor: "pointer", border: "none", background: "transparent",
                        color: "secondary.light", display: "inline-flex", alignItems: "center",
                        p: 0.5, "&:hover": { color: "primary.main" }
                      }}
                    >
                      <MdContentCopy size={13} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* ── Relays ──────────────────────────────────────────────────────── */}
      {data.relays && data.relays.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            mb: 3,
            border: `1px solid ${theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e8edf2"}`
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5} sx={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.72rem" }}>
            Relays ({data.relays.length})
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {data.relays.map((relay, i) => {
              const host = relay.dns || relay.dnsSrv || relay.ipv4 || relay.ipv6 || "unknown";
              const label = relay.port ? `${host}:${relay.port}` : host;
              return (
                <Chip
                  key={i}
                  label={label}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
                />
              );
            })}
          </Box>
        </Paper>
      )}

      {/* ── Blocks minted by this pool ──────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          mb: 3,
          border: `1px solid ${theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e8edf2"}`,
          overflow: "hidden"
        }}
      >
        <Box px={{ xs: 2, sm: 2.5 }} pt={2.5} pb={1}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.72rem" }}>
            Blocks Minted
            {data.lifetimeBlock ? ` · ${data.lifetimeBlock.toLocaleString()} total` : ""}
          </Typography>
        </Box>
        <BlockListComponent
          fetchData={blocksData}
          loading={blocksLoading}
          updateData={fetchBlocks}
        />
      </Paper>

      {/* Plugin slot */}
      <PluginSlotRenderer slot="pool-detail" context={{ data, network, apiConnector }} />
    </Container>
  );
};

export default DelegationDetail;
