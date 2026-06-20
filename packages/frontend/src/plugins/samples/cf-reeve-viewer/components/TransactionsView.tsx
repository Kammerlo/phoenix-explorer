import React, { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Paper,
  SvgIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import { Theme, alpha, useTheme } from "@mui/material/styles";
import { ReeveNamedCode, ReeveRoot, ReeveTransaction, ReeveTransactionItem } from "../types";
import { cleanCurrencyCode, formatFxRate, formatReportAmount } from "../format";
import { faintText, hairline, mutedText, strongText } from "../uiColors";

const ExpandMoreIcon: React.FC = () => (
  <SvgIcon viewBox="0 0 24 24">
    <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
  </SvgIcon>
);

// Only semantic colors whose filled chip stays legible (dark fill + white text)
// in BOTH light and dark modes. `primary` (light-blue) and `secondary` (near-white)
// are deliberately excluded — they render white-on-light in this theme's dark mode.
type ChipColor = "success" | "warning" | "error" | "info";

const TX_TYPE_COLORS: Record<string, ChipColor> = {
  Journal: "info",
  VendorBill: "warning",
  VendorPayment: "error",
  CustomerInvoice: "success",
  CustomerPayment: "info",
  BillCredit: "warning",
  CardCharge: "warning",
  CardRefund: "info",
  FxRevaluation: "info",
  Transfer: "info",
  ExpenseReport: "warning"
};

function namedCode(value?: string | ReeveNamedCode): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  return value.name ?? value.cust_code ?? value.code ?? "—";
}

function eventLabel(event?: ReeveTransactionItem["event"]): string {
  if (!event) return "—";
  if (event.code) return `${event.code}${event.name ? ` – ${event.name}` : ""}`;
  return event.name ?? "—";
}

const headCellSx = (theme: Theme) => ({
  fontWeight: 600,
  fontSize: "0.72rem",
  color: mutedText(theme),
  whiteSpace: "nowrap" as const
});

const ItemsTable: React.FC<{ items: ReeveTransactionItem[] }> = ({ items }) => {
  const theme = useTheme();
  if (items.length === 0) return null;
  const head = headCellSx(theme);
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        mt: 1,
        borderRadius: 1,
        border: `1px solid ${hairline(theme)}`,
        overflowX: "auto",
        bgcolor: "transparent",
        backgroundImage: "none"
      }}
    >
      <Table size="small" sx={{ "& .MuiTableBody-root .MuiTableCell-root": { color: strongText(theme) } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "action.hover" }}>
            <TableCell sx={{ ...head, textAlign: "right" }}>Amount</TableCell>
            <TableCell sx={head}>Currency</TableCell>
            <TableCell sx={head}>FX Rate</TableCell>
            <TableCell sx={head}>Document #</TableCell>
            <TableCell sx={head}>Event</TableCell>
            <TableCell sx={head}>Project</TableCell>
            <TableCell sx={head}>Cost Centre</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, idx) => {
            const currency = cleanCurrencyCode(item.document?.currency?.id ?? item.document?.currency?.cust_code);
            return (
              <TableRow key={item.id ?? idx} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                <TableCell sx={{ fontFamily: "monospace", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                  {item.amount !== undefined ? formatReportAmount(item.amount) : "—"}
                </TableCell>
                <TableCell>{currency || "—"}</TableCell>
                <TableCell sx={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
                  {formatFxRate(item.fx_rate)}
                </TableCell>
                <TableCell>{item.document?.number ?? "—"}</TableCell>
                <TableCell>{eventLabel(item.event)}</TableCell>
                <TableCell>{namedCode(item.project)}</TableCell>
                <TableCell>{namedCode(item.cost_center)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const TransactionAccordion: React.FC<{ tx: ReeveTransaction; index: number }> = ({ tx, index }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const chipColor = TX_TYPE_COLORS[tx.type ?? ""] ?? "info";

  return (
    <Accordion
      expanded={expanded}
      onChange={(_e, isExpanded) => setExpanded(isExpanded)}
      elevation={0}
      disableGutters
      sx={{
        mb: 0.5,
        border: `1px solid ${hairline(theme)}`,
        borderRadius: 1,
        bgcolor: "transparent",
        backgroundImage: "none",
        "&:before": { display: "none" },
        "&.Mui-expanded": { mb: 0.5 }
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap" width="100%" pr={1}>
          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, color: strongText(theme) }}>
            #{tx.number ?? String(index + 1)}
          </Typography>
          {tx.type && <Chip label={tx.type} size="small" color={chipColor} sx={{ fontWeight: 500 }} />}
          {tx.date && (
            <Typography variant="body2" sx={{ color: mutedText(theme) }}>
              {tx.date}
            </Typography>
          )}
          {tx.accounting_period && (
            <Chip
              label={`Period: ${tx.accounting_period}`}
              size="small"
              variant="outlined"
              sx={{ color: strongText(theme), borderColor: alpha(theme.palette.secondary.main, 0.3) }}
            />
          )}
          {tx.batch_id && (
            <Typography
              variant="caption"
              sx={{
                ml: "auto",
                color: faintText(theme),
                fontFamily: "monospace",
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
              title={tx.batch_id}
            >
              Batch: {tx.batch_id}
            </Typography>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0.5, pb: 1.5, px: 1.5 }}>
        {tx.items && tx.items.length > 0 ? (
          <ItemsTable items={tx.items} />
        ) : (
          <Typography variant="body2" sx={{ color: mutedText(theme) }}>
            No line items.
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

const TransactionsView: React.FC<{ root: ReeveRoot }> = ({ root }) => {
  const theme = useTheme();
  const transactions: ReeveTransaction[] = Array.isArray(root.data) ? (root.data as ReeveTransaction[]) : [];

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} mb={1} sx={{ color: strongText(theme) }}>
        Transactions ({transactions.length})
      </Typography>
      {transactions.length === 0 ? (
        <Typography variant="body2" sx={{ color: mutedText(theme) }}>
          No transactions found.
        </Typography>
      ) : (
        transactions.map((tx, idx) => <TransactionAccordion key={tx.id ?? idx} tx={tx} index={idx} />)
      )}
    </Box>
  );
};

export default TransactionsView;
