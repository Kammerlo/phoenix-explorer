import { Box, Chip, Grid, LinearProgress, Typography, useTheme } from "@mui/material";
import { Link } from "react-router-dom";

import StatCard from "src/components/commons/StatCard";
import { details } from "src/commons/routers";
import { formatBytes, numberWithCommas } from "src/commons/utils/helper";
import { DashboardStats } from "@shared/dtos/dashboard.dto";

export type { DashboardStats };

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function lovelaceToADA(lovelace: string | null | undefined): string {
  if (!lovelace) return "0";
  const ada = parseFloat(lovelace) / 1_000_000;
  if (ada >= 1_000_000_000) return `${(ada / 1_000_000_000).toFixed(2)}B`;
  if (ada >= 1_000_000)     return `${(ada / 1_000_000).toFixed(2)}M`;
  if (ada >= 1_000)         return `${(ada / 1_000).toFixed(2)}K`;
  return ada.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function supplyPercent(circulating: string, max: string): number {
  if (!circulating || !max || parseFloat(max) === 0) return 0;
  return Math.round((parseFloat(circulating) / parseFloat(max)) * 100);
}

export function formatTimeRemaining(endTime: number | null): string {
  if (!endTime) return "—";
  const now = Math.floor(Date.now() / 1000);
  const diff = endTime - now;
  if (diff <= 0) return "Ended";
  const days  = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins  = Math.floor((diff % 3600) / 60);
  if (days > 0)  return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

// ─── DashboardStats grid ──────────────────────────────────────────────────────

interface Props {
  statsData: DashboardStats | null;
  loading: boolean;
}

const DashboardStatsGrid: React.FC<Props> = ({ statsData, loading }) => {
  const theme = useTheme();

  return (
    <Grid container spacing={2} mb={3}>
      {/* Current Epoch */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard title="Current Epoch" loading={loading}>
          <Box display="flex" alignItems="baseline" gap={1}>
            <Link to={details.epoch(statsData?.currentEpoch.no ?? "")} style={{ textDecoration: "none" }}>
              <Typography variant="h4" fontWeight={700} color={theme.palette.primary.main}>
                {statsData?.currentEpoch.no ?? "—"}
              </Typography>
            </Link>
            <Chip label={`${statsData?.currentEpoch.progressPercent ?? 0}%`} size="small" color="primary" variant="outlined" />
          </Box>
          <Box mt={1} mb={0.5}>
            <LinearProgress variant="determinate" value={statsData?.currentEpoch.progressPercent ?? 0} sx={{ borderRadius: 2, height: 6 }} />
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
        <StatCard title="Latest Block" loading={loading}>
          <Link to={details.block(statsData?.latestBlock.height ?? "")} style={{ textDecoration: "none" }}>
            <Typography variant="h4" fontWeight={700} color={theme.palette.primary.main}>
              {statsData?.latestBlock.height != null ? numberWithCommas(statsData.latestBlock.height, 0) : "—"}
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
        <StatCard title="Circulating Supply" loading={loading}>
          <Typography variant="h4" fontWeight={700} color={theme.palette.primary.main}>
            {lovelaceToADA(statsData?.supply.circulating)} ₳
          </Typography>
          {statsData && (
            <>
              <Box mt={1} mb={0.5}>
                <LinearProgress variant="determinate" value={supplyPercent(statsData.supply.circulating, statsData.supply.max)} sx={{ borderRadius: 2, height: 6 }} color="secondary" />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {supplyPercent(statsData.supply.circulating, statsData.supply.max)}% of max supply ({lovelaceToADA(statsData.supply.max)} ₳)
              </Typography>
            </>
          )}
        </StatCard>
      </Grid>

      {/* Active Stake */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard title="Active Stake" loading={loading}>
          <Typography variant="h4" fontWeight={700} color={theme.palette.primary.main}>
            {lovelaceToADA(statsData?.stake.active)} ₳
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Live: {lovelaceToADA(statsData?.stake.live)} ₳
          </Typography>
          {statsData && (
            <Typography variant="caption" color="text.secondary">
              {Math.round((parseFloat(statsData.stake.active || "0") / parseFloat(statsData.supply.circulating || "1")) * 100)}% of circulating supply staked
            </Typography>
          )}
        </StatCard>
      </Grid>
    </Grid>
  );
};

export default DashboardStatsGrid;
