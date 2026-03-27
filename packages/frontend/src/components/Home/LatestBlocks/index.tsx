import { Box, Divider, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Typography } from "@mui/material";

import SectionHeader from "src/components/commons/SectionHeader";
import { details, routers } from "src/commons/routers";
import { formatBytes, numberWithCommas } from "src/commons/utils/helper";
import { Block } from "@shared/dtos/block.dto";

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

// ─── LatestBlocks ─────────────────────────────────────────────────────────────

interface Props {
  blocks: Block[];
  loading: boolean;
  rows?: number;
}

const LatestBlocks: React.FC<Props> = ({ blocks, loading, rows = 8 }) => {
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
        <SectionHeader title="Latest Blocks" viewAllPath={routers.BLOCK_LIST} />
      </Box>
      <Divider />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headCellSx}>Block</TableCell>
              <TableCell sx={headCellSx}>Time</TableCell>
              <TableCell sx={headCellSx} align="right">Txs</TableCell>
              <TableCell sx={headCellSx} align="right">Size</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonRows rows={rows} cols={4} />
            ) : (
              blocks.map((block) => (
                <TableRow key={block.hash} hover sx={{ cursor: "pointer" }} onClick={() => navigate(details.block(block.blockNo))}>
                  <TableCell sx={cellSx}>
                    <Link to={details.block(block.blockNo)} style={{ color: theme.palette.primary.main, textDecoration: "none", fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>
                      {numberWithCommas(block.blockNo, 0)}
                    </Link>
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(Number(block.time) * 1000), { addSuffix: true })}
                    </Typography>
                  </TableCell>
                  <TableCell sx={cellSx} align="right">{block.txCount}</TableCell>
                  <TableCell sx={cellSx} align="right">{formatBytes(block.size)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default LatestBlocks;
