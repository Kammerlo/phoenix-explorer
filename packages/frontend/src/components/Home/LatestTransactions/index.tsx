import { Box, Divider, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link, useNavigate } from "react-router-dom";

import SectionHeader from "src/components/commons/SectionHeader";
import { TxTagChip, TAG_ORDER } from "src/components/TransactionLists";
import { details, routers } from "src/commons/routers";
import { formatADA, getShortHash } from "src/commons/utils/helper";
import { Transaction, TxTag } from "@shared/dtos/transaction.dto";

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

// ─── LatestTransactions ───────────────────────────────────────────────────────

interface Props {
  txs: Transaction[];
  loading: boolean;
  rows?: number;
}

const LatestTransactions: React.FC<Props> = ({ txs, loading, rows = 8 }) => {
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
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonRows rows={rows} cols={4} />
            ) : (
              txs.map((tx) => {
                const tags = tx.tags?.length ? TAG_ORDER.filter((t) => tx.tags!.includes(t)) : ["transfer" as TxTag];
                return (
                  <TableRow key={tx.hash} hover sx={{ cursor: "pointer" }} onClick={() => navigate(details.transaction(tx.hash))}>
                    <TableCell sx={cellSx}>
                      <Link to={details.transaction(tx.hash)} style={{ color: theme.palette.primary.main, textDecoration: "none", fontFamily: "monospace", fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>
                        {getShortHash(tx.hash, 8, 6)}
                      </Link>
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Link to={details.block(tx.blockNo)} style={{ color: theme.palette.primary.main, textDecoration: "none", fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>
                        {tx.blockNo?.toLocaleString()}
                      </Link>
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <Box display="flex" flexWrap="wrap" gap={0.3}>
                        {tags.slice(0, 2).map((tag) => <TxTagChip key={tag} tag={tag} />)}
                      </Box>
                    </TableCell>
                    <TableCell sx={cellSx} align="right">{formatADA(tx.totalOutput)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default LatestTransactions;
