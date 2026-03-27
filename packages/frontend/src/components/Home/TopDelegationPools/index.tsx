import { Box, Divider, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link, useNavigate } from "react-router-dom";

import SectionHeader from "src/components/commons/SectionHeader";
import { details, routers } from "src/commons/routers";
import { formatADA, getShortHash, numberWithCommas } from "src/commons/utils/helper";
import { PoolOverview } from "@shared/dtos/pool.dto";

// ─── Skeleton rows ────────────────────────────────────────────────────────────

const SkeletonRows: React.FC<{ rows: number; cols: number }> = ({ rows, cols }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: cols }).map((__, j) => (
          <TableCell key={j}>
            <Box sx={{ height: 14, borderRadius: 1, bgcolor: "action.hover", width: `${50 + Math.random() * 40}%` }} />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

// ─── TopDelegationPools ───────────────────────────────────────────────────────

interface Props {
  pools: PoolOverview[];
  loading: boolean;
  rows?: number;
}

const TopDelegationPools: React.FC<Props> = ({ pools, loading, rows = 5 }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const cellSx = {
    py: 1,
    borderBottom: `1px solid ${theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e0e0e0"}`,
    fontSize: "0.82rem",
  };
  const headCellSx = { ...cellSx, fontWeight: 700, color: theme.palette.text.secondary, background: theme.palette.secondary[0] };

  return (
    <Paper elevation={0} sx={{ borderRadius: 3, overflow: "hidden", border: `1px solid ${theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e0e0e0"}`, background: theme.palette.secondary[0] }}>
      <Box px={2.5} pt={2.5} pb={1}>
        <SectionHeader title="Top Pools" viewAllPath={routers.POOLS} />
      </Box>
      <Divider />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headCellSx}>Pool</TableCell>
              <TableCell sx={headCellSx} align="right">Pool Size (₳)</TableCell>
              <TableCell sx={headCellSx} align="right">Saturation</TableCell>
              <TableCell sx={headCellSx} align="right">Lifetime Blocks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonRows rows={rows} cols={4} />
            ) : (
              pools.map((pool) => (
                <TableRow key={pool.poolId} hover sx={{ cursor: "pointer" }} onClick={() => navigate(details.delegation(pool.poolId))}>
                  <TableCell sx={cellSx}>
                    <Link to={details.delegation(pool.poolId)} style={{ color: theme.palette.primary.main, textDecoration: "none", fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>
                      {pool.poolName && pool.poolName !== "Unknown Pool" ? pool.poolName : getShortHash(pool.poolId, 10, 8)}
                    </Link>
                    {pool.tickerName && pool.tickerName !== "N/A" && (
                      <Typography component="span" variant="caption" sx={{ ml: 0.5, color: theme.palette.text.secondary }}>
                        [{pool.tickerName}]
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={cellSx} align="right">{formatADA(pool.poolSize)}</TableCell>
                  <TableCell sx={cellSx} align="right">
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                      <Box sx={{ width: 60 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, (pool.saturation ?? 0) * 100)}
                          sx={{ borderRadius: 2, height: 5 }}
                          color={(pool.saturation ?? 0) > 0.95 ? "error" : (pool.saturation ?? 0) > 0.7 ? "warning" : "success"}
                        />
                      </Box>
                      <Typography variant="caption">{((pool.saturation ?? 0) * 100).toFixed(1)}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={cellSx} align="right">{numberWithCommas(pool.lifetimeBlock, 0)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default TopDelegationPools;
