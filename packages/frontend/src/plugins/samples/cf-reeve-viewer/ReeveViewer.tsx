import React, { useMemo, useState } from "react";
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
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { PluginContext } from "../../types";

// ---------------------------------------------------------------------------
// Inline expand icon (avoids @mui/icons-material dependency)
// ---------------------------------------------------------------------------

const ExpandMoreIcon: React.FC = () => (
  <SvgIcon viewBox="0 0 24 24">
    <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
  </SvgIcon>
);

// ---------------------------------------------------------------------------
// Reeve type definitions
// ---------------------------------------------------------------------------

interface ReeveOrg {
  id?: string;
  name?: string;
  currency_id?: string;
  country_code?: string;
  tax_id_number?: string;
}

interface ReeveMetadata {
  creation_slot?: number;
  timestamp?: string;
  version?: string;
}

interface ReeveItemDocument {
  number?: string;
  currency?: {
    id?: string;
    cust_code?: string;
  };
}

interface ReeveItemEvent {
  code?: string;
  name?: string;
}

interface ReeveNamedCode {
  name?: string;
  cust_code?: string;
}

interface ReeveTransactionItem {
  id?: string;
  amount?: number;
  fx_rate?: number;
  document?: ReeveItemDocument;
  event?: ReeveItemEvent;
  project?: string | ReeveNamedCode;
  cost_center?: string | ReeveNamedCode;
}

interface ReeveTransaction {
  id?: string;
  number?: string;
  batch_id?: string;
  type?: string;
  date?: string;
  accounting_period?: string;
  items?: ReeveTransactionItem[];
}

interface ReeveReportData {
  [key: string]: number | string | ReeveReportData;
}

interface ReeveRoot {
  org?: ReeveOrg;
  metadata?: ReeveMetadata;
  type?: "INDIVIDUAL_TRANSACTIONS" | "REPORT" | string;
  data?: ReeveTransaction[] | ReeveReportData;
  interval?: string;
  year?: number | string;
  period?: number | string;
  subtype?: string;
}

// ---------------------------------------------------------------------------
// Helper: parse Reeve label 1447 from transaction metadata
// ---------------------------------------------------------------------------

function parseReeveMetadata(rawMetadata: unknown): ReeveRoot | null {
  if (!rawMetadata || !Array.isArray(rawMetadata)) return null;

  const metaArray = rawMetadata as { label: number; value: string }[];
  const entry = metaArray.find(
    (m) => m.label === 1447 || (m.label as unknown) === "1447"
  );
  if (!entry) return null;

  try {
    const parsed = JSON.parse(entry.value);
    // The value may be wrapped under key "1447" or directly be the root object
    const root: unknown =
      parsed?.["1447"] ?? parsed?.[1447] ?? parsed;
    if (root && typeof root === "object") {
      return root as ReeveRoot;
    }
  } catch {
    // malformed JSON — ignore
  }
  return null;
}

// ---------------------------------------------------------------------------
// Transaction type chip color map
// ---------------------------------------------------------------------------

const TX_TYPE_COLORS: Record<
  string,
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
> = {
  Journal: "primary",
  VendorBill: "warning",
  VendorPayment: "error",
  CustomerInvoice: "success",
  CustomerPayment: "info",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const OrgHeader: React.FC<{ org: ReeveOrg; version?: string }> = ({
  org,
  version,
}) => {
  const theme = useTheme();
  return (
    <Box
      mb={2}
      p={2}
      sx={{
        bgcolor: "action.hover",
        borderRadius: 2,
        borderLeft: `3px solid ${theme.palette.primary.main}`,
      }}
    >
      <Box
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
        mb={1}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          {org.name ?? "Unknown Organisation"}
        </Typography>
        {version && (
          <Typography variant="caption" color="text.secondary" sx={{ pt: 0.3 }}>
            v{version}
          </Typography>
        )}
      </Box>
      <Box display="flex" gap={1} flexWrap="wrap">
        {org.country_code && (
          <Chip
            label={`Country: ${org.country_code}`}
            size="small"
            variant="outlined"
          />
        )}
        {org.currency_id && (
          <Chip
            label={`Currency: ${org.currency_id}`}
            size="small"
            variant="outlined"
          />
        )}
        {org.tax_id_number && (
          <Chip
            label={`Tax ID: ${org.tax_id_number}`}
            size="small"
            variant="outlined"
          />
        )}
        {org.id && (
          <Chip
            label={`Org ID: ${org.id}`}
              size="small"
              variant="outlined"
              sx={{ fontFamily: "monospace", fontSize: "0.68rem" }}
            />
          )}
        </Box>
      </Box>
  );
};

const ItemsTable: React.FC<{ items: ReeveTransactionItem[] }> = ({ items }) => {
  const theme = useTheme();
  if (items.length === 0) return null;
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ mt: 1, borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}
    >
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: "action.hover" }}>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>Amount</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>FX Rate</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>Currency</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>Document #</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>Event</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>Project</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>Cost Centre</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow
              key={item.id ?? idx}
              sx={{ "&:last-child td": { borderBottom: 0 } }}
            >
              <TableCell sx={{ fontFamily: "monospace" }}>
                {item.amount !== undefined
                  ? Number(item.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })
                  : "—"}
              </TableCell>
              <TableCell sx={{ fontFamily: "monospace" }}>
                {item.fx_rate !== undefined ? item.fx_rate : "—"}
              </TableCell>
              <TableCell>
                {item.document?.currency?.id ??
                  item.document?.currency?.cust_code ??
                  "—"}
              </TableCell>
              <TableCell>{item.document?.number ?? "—"}</TableCell>
              <TableCell>
                {item.event?.code
                  ? `${item.event.code}${item.event.name ? ` – ${item.event.name}` : ""}`
                  : (item.event?.name ?? "—")}
              </TableCell>
              <TableCell>
                {item.project == null ? "—"
                  : typeof item.project === "string" ? item.project
                  : (item.project.name ?? item.project.cust_code ?? "—")}
              </TableCell>
              <TableCell>
                {item.cost_center == null ? "—"
                  : typeof item.cost_center === "string" ? item.cost_center
                  : (item.cost_center.name ?? item.cost_center.cust_code ?? "—")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const TransactionAccordion: React.FC<{
  tx: ReeveTransaction;
  index: number;
}> = ({ tx, index }) => {
  const [expanded, setExpanded] = useState(false);
  const chipColor = TX_TYPE_COLORS[tx.type ?? ""] ?? "default";

  const theme = useTheme();
  return (
    <Accordion
      expanded={expanded}
      onChange={(_: React.SyntheticEvent, isExpanded: boolean) =>
        setExpanded(isExpanded)
      }
      elevation={0}
      disableGutters
      sx={{
        mb: 0.5,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        "&:before": { display: "none" },
        "&.Mui-expanded": { mb: 0.5 },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box
          display="flex"
          alignItems="center"
          gap={1.5}
          flexWrap="wrap"
          width="100%"
          pr={1}
        >
          <Typography
            variant="body2"
            sx={{ fontFamily: "monospace", minWidth: 80, fontWeight: 600 }}
          >
            #{tx.number ?? String(index + 1)}
          </Typography>
          {tx.type && (
            <Chip
              label={tx.type}
              size="small"
              color={chipColor}
              sx={{ fontWeight: 500 }}
            />
          )}
          {tx.date && (
            <Typography variant="body2" color="text.secondary">
              {tx.date}
            </Typography>
          )}
          {tx.accounting_period && (
            <Chip
              label={`Period: ${tx.accounting_period}`}
              size="small"
              variant="outlined"
            />
          )}
          {tx.batch_id && (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ ml: "auto" }}
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
          <Typography variant="body2" color="text.secondary">
            No line items.
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

// ---------------------------------------------------------------------------
// Recursive report data renderer
// ---------------------------------------------------------------------------

const ReportDataNode: React.FC<{
  data: ReeveReportData;
  depth?: number;
}> = ({ data, depth = 0 }) => {
  const theme = useTheme();
  const entries = Object.entries(data);

  return (
    <Box ml={depth > 0 ? 2 : 0}>
      {entries.map(([key, value]) => {
        if (value !== null && typeof value === "object") {
          return (
            <Box key={key} mb={0.5}>
              <Typography
                variant="body2"
                fontWeight={600}
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontSize: "0.72rem",
                  mt: depth === 0 ? 1.5 : 0.5,
                  borderBottom:
                    depth === 0
                      ? `1px solid ${theme.palette.border.main}`
                      : "none",
                  pb: depth === 0 ? 0.25 : 0,
                }}
              >
                {key}
              </Typography>
              <ReportDataNode
                data={value as ReeveReportData}
                depth={depth + 1}
              />
            </Box>
          );
        }
        return (
          <Box
            key={key}
            display="flex"
            alignItems="baseline"
            gap={1}
            py={0.25}
            sx={{
              borderBottom: `1px solid ${theme.palette.border.main}`,
              "&:last-child": { borderBottom: "none" },
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ minWidth: 200, flexShrink: 0 }}
            >
              {key}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: typeof value === "number" ? "monospace" : "inherit",
                fontWeight: typeof value === "number" ? 500 : 400,
              }}
            >
              {String(value)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

const ReportView: React.FC<{ reeve: ReeveRoot }> = ({ reeve }) => {
  const theme = useTheme();
  return (
    <Box>
      <Box
        display="flex"
        gap={1}
        flexWrap="wrap"
        mb={2}
        p={1.5}
        sx={{
          backgroundColor: theme.palette.secondary[900],
          borderRadius: 1,
        }}
      >
        {reeve.subtype && (
          <Chip label={reeve.subtype} size="small" color="secondary" />
        )}
        {reeve.interval && (
          <Chip
            label={`Interval: ${reeve.interval}`}
            size="small"
            variant="outlined"
          />
        )}
        {reeve.year !== undefined && (
          <Chip
            label={`Year: ${reeve.year}`}
            size="small"
            variant="outlined"
          />
        )}
        {reeve.period !== undefined && (
          <Chip
            label={`Period: ${reeve.period}`}
            size="small"
            variant="outlined"
          />
        )}
      </Box>
      {reeve.data &&
      typeof reeve.data === "object" &&
      !Array.isArray(reeve.data) ? (
        <ReportDataNode data={reeve.data as ReeveReportData} />
      ) : (
        <Typography variant="body2" color="text.secondary">
          No report data available.
        </Typography>
      )}
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ReeveViewer: React.FC<{ context: PluginContext }> = ({ context }) => {
  const reeve = useMemo(() => {
    const data = context.data as Record<string, unknown> | null;
    if (!data) return null;
    return parseReeveMetadata(data.metadata);
  }, [context.data]);

  if (!reeve) return null;

  const isIndividualTx = reeve.type === "INDIVIDUAL_TRANSACTIONS";
  const isReport = reeve.type === "REPORT";
  const transactions: ReeveTransaction[] =
    isIndividualTx && Array.isArray(reeve.data)
      ? (reeve.data as ReeveTransaction[])
      : [];

  return (
    <Box>
      {/* Organisation header */}
      {reeve.org && (
        <OrgHeader org={reeve.org} version={reeve.metadata?.version} />
      )}

      {/* Record type badge + timestamp */}
      {reeve.type && (
        <Box mb={2}>
          <Chip
            label={`Type: ${reeve.type}`}
            color={isIndividualTx ? "primary" : isReport ? "secondary" : "default"}
            size="small"
          />
          {reeve.metadata?.timestamp && (
            <Typography variant="caption" color="text.secondary" ml={1}>
              {reeve.metadata.timestamp}
            </Typography>
          )}
        </Box>
      )}

      {/* INDIVIDUAL_TRANSACTIONS */}
      {isIndividualTx && (
        <Box>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Transactions ({transactions.length})
          </Typography>
          {transactions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No transactions found.
            </Typography>
          ) : (
            transactions.map((tx, idx) => (
              <TransactionAccordion key={tx.id ?? idx} tx={tx} index={idx} />
            ))
          )}
        </Box>
      )}

      {/* REPORT */}
      {isReport && <ReportView reeve={reeve} />}

      {/* Unknown type fallback */}
      {!isIndividualTx && !isReport && reeve.type && (
        <Typography variant="body2" color="text.secondary">
          Unsupported Reeve record type: {reeve.type}
        </Typography>
      )}
    </Box>
  );
};

export default ReeveViewer;
