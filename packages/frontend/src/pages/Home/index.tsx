import { useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Link as MuiLink,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  styled,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";

import useFetch from "src/commons/hooks/useFetch";
import { details, routers } from "src/commons/routers";
import { formatADA, getShortHash, numberWithCommas } from "src/commons/utils/helper";
import { Block } from "@shared/dtos/block.dto";
import { Transaction, TxTag } from "@shared/dtos/transaction.dto";
import { PoolOverview } from "@shared/dtos/pool.dto";
import { ApiReturnType } from "@shared/APIReturnType";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface DashboardStats {
  currentEpoch: {
    no: number;
    startTime: number | null;
    endTime: number | null;
    txCount: number;
    blkCount: number;
    outSum: string | null;
    fees: string | null;
    activeStake: string | null;
    progressPercent: number;
  };
  latestBlock: {
    height: number | null;
    hash: string;
    slot: number | null;
    epochNo: number | null;
    epochSlot: number | null;
    time: number;
    txCount: number;
    size: number;
  };
  supply: {
    circulating: string;
    total: string;
    max: string;
    locked: string;
  };
  stake: {
    live: string;
    active: string;
  };
}

// ---------------------------------------------------------------------------
// Tag config (matches TransactionLists/index.tsx)
// ---------------------------------------------------------------------------

const TX_TAG_META: Record<TxTag, { label: string; color: string }> = {
  transfer:   { label: "Transfer",   color: "#3B82F6" },
  token:      { label: "Token",      color: "#8B5CF6" },
  mint:       { label: "Mint",       color: "#F59E0B" },
  stake:      { label: "Stake",      color: "#06B6D4" },
  pool:       { label: "Pool",       color: "#6366F1" },
  script:     { label: "Script",     color: "#F97316" },
  governance: { label: "Governance", color: "#A855F7" },
};

const TX_TAG_ORDER: TxTag[] = ["transfer", "script", "token", "mint", "stake", "pool", "governance"];

// ---------------------------------------------------------------------------
// Styled components — disclaimer
// ---------------------------------------------------------------------------

const HomeContainer = styled(Container)`
  padding-top: 30px;
  padding-bottom: 40px;
`;

const DisclaimerBox = styled(Alert)(({ theme }) => ({
  marginBottom: "24px",
  padding: "20px 24px",
  borderRadius: "12px",
  backgroundColor: theme.palette.secondary[0],
  border: `1px solid ${theme.palette.primary[200]}`,
  "& .MuiAlert-icon": {
    color: theme.palette.primary.main,
  },
}));

const DisclaimerTitle = styled(AlertTitle)(({ theme }) => ({
  color: theme.palette.secondary.main,
  fontWeight: "bold",
  fontSize: "1.1rem",
  marginBottom: "12px",
}));

const DisclaimerText = styled(Typography)(({ theme }) => ({
  color: theme.palette.secondary.light,
  lineHeight: 1.6,
  marginBottom: "10px",
  "&:last-child": {
    marginBottom: 0,
  },
}));

const StyledLink = styled(MuiLink)(({ theme }) => ({
  color: theme.palette.primary.main,
  textDecoration: "none",
  fontWeight: "bold",
  "&:hover": {
    textDecoration: "underline",
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lovelaceToADA(lovelace: string | null | undefined): string {
  if (!lovelace) return "0";
  const ada = parseFloat(lovelace) / 1_000_000;
  if (ada >= 1_000_000_000) return `${(ada / 1_000_000_000).toFixed(2)}B`;
  if (ada >= 1_000_000) return `${(ada / 1_000_000).toFixed(2)}M`;
  if (ada >= 1_000) return `${(ada / 1_000).toFixed(2)}K`;
  return ada.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function supplyPercent(circulating: string, max: string): number {
  if (!circulating || !max || parseFloat(max) === 0) return 0;
  return Math.round((parseFloat(circulating) / parseFloat(max)) * 100);
}

function formatTimeRemaining(endTime: number | null): string {
  if (!endTime) return "—";
  const now = Math.floor(Date.now() / 1000);
  const diff = endTime - now;
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return "—";
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

interface StatCardProps {
  title: string;
  loading: boolean;
  children: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, loading, children }) => {
  const theme = useTheme();
  return (
    <Paper
      elevation={2}
      sx={{
        p: 2.5,
        borderRadius: 3,
        height: "100%",
        background: theme.palette.secondary[0],
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: theme.palette.text.secondary, fontWeight: 600, letterSpacing: 1 }}
      >
        {title}
      </Typography>
      <Box mt={1}>
        {loading ? (
          <>
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="50%" />
          </>
        ) : (
          children
        )}
      </Box>
    </Paper>
  );
};

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
  title: string;
  viewAllPath: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, viewAllPath }) => {
  const theme = useTheme();
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
      <Typography variant="h6" fontWeight={600} color={theme.palette.text.primary}>
        {title}
      </Typography>
      <Link to={viewAllPath} style={{ textDecoration: "none" }}>
        <Typography
          variant="body2"
          sx={{ color: theme.palette.primary.main, fontWeight: 500, "&:hover": { textDecoration: "underline" } }}
        >
          View All
        </Typography>
      </Link>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// TableSkeleton
// ---------------------------------------------------------------------------

const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 8, cols = 4 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: cols }).map((__, j) => (
          <TableCell key={j}>
            <Skeleton variant="text" />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

const Home: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(
    () => localStorage.getItem("bannerDismissed") !== "true"
  );
  const dismissBanner = () => {
    localStorage.setItem("bannerDismissed", "true");
    setShowBanner(false);
  };

  useEffect(() => {
    document.title = t("head.page.dashboard");
  }, [t]);

  const { data: statsData, loading: statsLoading } = useFetch<DashboardStats>("dashboard/stats");
  const { data: blocksData, loading: blocksLoading } = useFetch<ApiReturnType<Block[]>>("blocks?size=8");
  const { data: txsData, loading: txsLoading } = useFetch<ApiReturnType<Transaction[]>>("transactions?size=8");
  const { data: poolsData, loading: poolsLoading } = useFetch<ApiReturnType<PoolOverview[]>>("pools?size=5");

  const blocks = blocksData?.data ?? [];
  const txs = txsData?.data ?? [];
  const pools = poolsData?.data ?? [];

  const cellSx = {
    py: 1,
    borderBottom: `1px solid ${theme.palette.divider}`,
    fontSize: "0.82rem",
  };

  const headCellSx = {
    ...cellSx,
    fontWeight: 700,
    color: theme.palette.text.secondary,
    background: theme.palette.secondary[0],
  };

  return (
    <HomeContainer data-testid="home-container">
      {/* Disclaimer */}
      {showBanner && (
      <DisclaimerBox severity="info" action={
        <IconButton size="small" onClick={dismissBanner} aria-label="Dismiss banner" sx={{ color: "inherit" }}>
          ✕
        </IconButton>
      }>
        <DisclaimerTitle>🚧 Community Project - Development Continues 🚧</DisclaimerTitle>
        <DisclaimerText>
          I'm still committed to pushing this project forward, but{" "}
          <strong>progress will be slower than anticipated</strong> due to the lack of funding. Unfortunately, my
          application to{" "}
          <StyledLink
            href="https://projectcatalyst.io/funds/14/cardano-open-developers/phoenix-explorer-reviving-an-open-source-explorer"
            target="_blank"
          >
            Project Catalyst Fund 14
          </StyledLink>{" "}
          was not successful, which means development will continue at a reduced pace as this remains a volunteer effort.
        </DisclaimerText>
        <DisclaimerText>
          Despite these constraints, my goal remains the same: to build this explorer{" "}
          <strong>for the community and as open source</strong> so it can be reused by everyone. It's unfortunate that
          this valuable piece of software was about to be discontinued, which is why I decided to pick it up and continue
          its development.
        </DisclaimerText>
        <DisclaimerText>
          There's still a lot of work to do, and you may encounter bugs along the way. Development will progress as time
          permits. You can follow the current progress and contribute on{" "}
          <StyledLink href="https://github.com/Kammerlo/phoenix-explorer" target="_blank">
            GitHub
          </StyledLink>{" "}
          where the project is actively maintained. Any contributions, whether code, feedback, or support, are greatly
          appreciated!
        </DisclaimerText>
        <DisclaimerText>
          <strong>Thank you for your patience and continued support! 🙏</strong>
        </DisclaimerText>
      </DisclaimerBox>
      )}

      {/* Stats Row */}
      <Grid container spacing={2} mb={3}>
        {/* Current Epoch */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Current Epoch" loading={statsLoading}>
            <Box display="flex" alignItems="baseline" gap={1}>
              <Typography variant="h4" fontWeight={700} color={theme.palette.primary.main}>
                {statsData?.currentEpoch.no ?? "—"}
              </Typography>
              <Chip
                label={`${statsData?.currentEpoch.progressPercent ?? 0}%`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
            <Box mt={1} mb={0.5}>
              <LinearProgress
                variant="determinate"
                value={statsData?.currentEpoch.progressPercent ?? 0}
                sx={{ borderRadius: 2, height: 6 }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {formatTimeRemaining(statsData?.currentEpoch.endTime ?? null)}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Txs: {numberWithCommas(statsData?.currentEpoch.txCount ?? 0, 0)}
            </Typography>
          </StatCard>
        </Grid>

        {/* Latest Block */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Latest Block" loading={statsLoading}>
            <Link to={details.block(statsData?.latestBlock.height ?? "")} style={{ textDecoration: "none" }}>
              <Typography variant="h4" fontWeight={700} color={theme.palette.primary.main}>
                {statsData?.latestBlock.height != null
                  ? numberWithCommas(statsData.latestBlock.height, 0)
                  : "—"}
              </Typography>
            </Link>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Epoch {statsData?.latestBlock.epochNo ?? "—"} / Slot {statsData?.latestBlock.epochSlot ?? "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Txs: {statsData?.latestBlock.txCount ?? "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Size: {formatBytes(statsData?.latestBlock.size)}
            </Typography>
          </StatCard>
        </Grid>

        {/* Circulating Supply */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Circulating Supply" loading={statsLoading}>
            <Typography variant="h4" fontWeight={700} color={theme.palette.primary.main}>
              {lovelaceToADA(statsData?.supply.circulating)} ₳
            </Typography>
            {statsData && (
              <>
                <Box mt={1} mb={0.5}>
                  <LinearProgress
                    variant="determinate"
                    value={supplyPercent(statsData.supply.circulating, statsData.supply.max)}
                    sx={{ borderRadius: 2, height: 6 }}
                    color="secondary"
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {supplyPercent(statsData.supply.circulating, statsData.supply.max)}% of max supply (
                  {lovelaceToADA(statsData.supply.max)} ₳)
                </Typography>
              </>
            )}
          </StatCard>
        </Grid>

        {/* Active Stake */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Active Stake" loading={statsLoading}>
            <Typography variant="h4" fontWeight={700} color={theme.palette.primary.main}>
              {lovelaceToADA(statsData?.stake.active)} ₳
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Live: {lovelaceToADA(statsData?.stake.live)} ₳
            </Typography>
            {statsData && (
              <Typography variant="caption" color="text.secondary">
                {Math.round(
                  (parseFloat(statsData.stake.active || "0") /
                    parseFloat(statsData.supply.circulating || "1")) *
                    100
                )}
                % of circulating supply staked
              </Typography>
            )}
          </StatCard>
        </Grid>
      </Grid>

      {/* Latest Blocks & Latest Transactions */}
      <Grid container spacing={2} mb={3}>
        {/* Latest Blocks */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={2}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              border: `1px solid ${theme.palette.divider}`,
              background: theme.palette.secondary[0],
            }}
          >
            <Box px={2.5} pt={2.5} pb={1}>
              <SectionHeader title="Latest Blocks" viewAllPath={routers.BLOCK_LIST} />
            </Box>
            <Divider />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headCellSx}>Block</TableCell>
                    <TableCell sx={headCellSx}>Time</TableCell>
                    <TableCell sx={headCellSx} align="right">
                      Txs
                    </TableCell>
                    <TableCell sx={headCellSx} align="right">
                      Size
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {blocksLoading ? (
                    <TableSkeleton rows={8} cols={4} />
                  ) : (
                    blocks.map((block) => (
                      <TableRow
                        key={block.hash}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => navigate(details.block(block.blockNo))}
                      >
                        <TableCell sx={cellSx}>
                          <Link
                            to={details.block(block.blockNo)}
                            style={{ color: theme.palette.primary.main, textDecoration: "none", fontWeight: 600 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {numberWithCommas(block.blockNo, 0)}
                          </Link>
                        </TableCell>
                        <TableCell sx={cellSx}>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(Number(block.time) * 1000), { addSuffix: true })}
                          </Typography>
                        </TableCell>
                        <TableCell sx={cellSx} align="right">
                          {block.txCount}
                        </TableCell>
                        <TableCell sx={cellSx} align="right">
                          {formatBytes(block.size)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Latest Transactions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={2}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              border: `1px solid ${theme.palette.divider}`,
              background: theme.palette.secondary[0],
            }}
          >
            <Box px={2.5} pt={2.5} pb={1}>
              <SectionHeader title="Latest Transactions" viewAllPath={routers.TRANSACTION_LIST} />
            </Box>
            <Divider />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headCellSx}>Hash</TableCell>
                    <TableCell sx={headCellSx}>Block</TableCell>
                    <TableCell sx={headCellSx}>Type</TableCell>
                    <TableCell sx={headCellSx} align="right">Output (₳)</TableCell>
                    <TableCell sx={headCellSx} align="right">Fee (₳)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {txsLoading ? (
                    <TableSkeleton rows={8} cols={5} />
                  ) : (
                    txs.map((tx) => {
                      const tags = tx.tags?.length ? TX_TAG_ORDER.filter((t) => tx.tags!.includes(t)) : ["transfer" as TxTag];
                      return (
                        <TableRow
                          key={tx.hash}
                          hover
                          sx={{ cursor: "pointer" }}
                          onClick={() => navigate(details.transaction(tx.hash))}
                        >
                          <TableCell sx={cellSx}>
                            <Box>
                              <Link
                                to={details.transaction(tx.hash)}
                                style={{ color: theme.palette.primary.main, textDecoration: "none", fontFamily: "monospace", fontWeight: 600 }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {getShortHash(tx.hash, 8, 6)}
                              </Link>
                              <Typography variant="caption" display="block" color="text.secondary">
                                {formatDistanceToNow(new Date(Number(tx.time) * 1000), { addSuffix: true })}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={cellSx}>
                            <Link
                              to={details.block(tx.blockNo)}
                              style={{ color: theme.palette.primary.main, textDecoration: "none", fontWeight: 600 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {tx.blockNo?.toLocaleString()}
                            </Link>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Epoch {tx.epochNo}
                            </Typography>
                          </TableCell>
                          <TableCell sx={cellSx}>
                            <Box display="flex" flexWrap="wrap" gap={0.3}>
                              {tags.map((tag) => {
                                const meta = TX_TAG_META[tag];
                                return (
                                  <Box
                                    key={tag}
                                    sx={{
                                      display: "inline-block",
                                      fontSize: "0.6rem",
                                      fontWeight: 700,
                                      px: 0.7,
                                      py: 0.2,
                                      borderRadius: "4px",
                                      bgcolor: alpha(meta.color, 0.12),
                                      color: meta.color,
                                      border: `1px solid ${alpha(meta.color, 0.3)}`,
                                      letterSpacing: "0.03em",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {meta.label}
                                  </Box>
                                );
                              })}
                            </Box>
                          </TableCell>
                          <TableCell sx={cellSx} align="right">
                            {formatADA(tx.totalOutput)}
                          </TableCell>
                          <TableCell sx={cellSx} align="right">
                            {formatADA(tx.fee)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Top Pools */}
      <Paper
        elevation={2}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${theme.palette.divider}`,
          background: theme.palette.secondary[0],
        }}
      >
        <Box px={2.5} pt={2.5} pb={1}>
          <SectionHeader title="Top Pools" viewAllPath={routers.POOLS} />
        </Box>
        <Divider />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headCellSx}>Pool</TableCell>
                <TableCell sx={headCellSx} align="right">
                  Pool Size (₳)
                </TableCell>
                <TableCell sx={headCellSx} align="right">
                  Saturation
                </TableCell>
                <TableCell sx={headCellSx} align="right">
                  Lifetime Blocks
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {poolsLoading ? (
                <TableSkeleton rows={5} cols={4} />
              ) : (
                pools.map((pool) => (
                  <TableRow
                    key={pool.poolId}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => navigate(details.delegation(pool.poolId))}
                  >
                    <TableCell sx={cellSx}>
                      <Link
                        to={details.delegation(pool.poolId)}
                        style={{ color: theme.palette.primary.main, textDecoration: "none", fontWeight: 600 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {pool.poolName && pool.poolName !== "Unknown Pool"
                          ? pool.poolName
                          : getShortHash(pool.poolId, 10, 8)}
                      </Link>
                      {pool.tickerName && pool.tickerName !== "N/A" && (
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ ml: 0.5, color: theme.palette.text.secondary }}
                        >
                          [{pool.tickerName}]
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={cellSx} align="right">
                      {formatADA(pool.poolSize)}
                    </TableCell>
                    <TableCell sx={cellSx} align="right">
                      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                        <Box sx={{ width: 60 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, (pool.saturation ?? 0) * 100)}
                            sx={{ borderRadius: 2, height: 5 }}
                            color={
                              (pool.saturation ?? 0) > 0.95
                                ? "error"
                                : (pool.saturation ?? 0) > 0.7
                                ? "warning"
                                : "success"
                            }
                          />
                        </Box>
                        <Typography variant="caption">
                          {((pool.saturation ?? 0) * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={cellSx} align="right">
                      {numberWithCommas(pool.lifetimeBlock, 0)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </HomeContainer>
  );
};

export default Home;
