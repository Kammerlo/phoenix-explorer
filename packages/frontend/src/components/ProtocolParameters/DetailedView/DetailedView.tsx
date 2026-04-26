import {
  Box,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
  useTheme
} from "@mui/material";

// @ts-ignore — TProtocolParam is a global declaration
import { TProtocolParam } from "src/types/protocol";

const LOVELACE = 1_000_000;

interface ParamMeta {
  key: keyof TProtocolParam;
  label: string;
  description: string;
  unit?: string;
  category: string;
  /** When true, render the ADA equivalent below the lovelace value. */
  lovelace?: boolean;
}

const ALL_PARAMS: ParamMeta[] = [
  // Fees
  { key: "minFeeA",           category: "Transaction Fees",      label: "minFeeA",              unit: "lovelace/byte",  description: "Per-byte coefficient: fee = minFeeB + size × minFeeA" },
  { key: "minFeeB",           category: "Transaction Fees",      label: "minFeeB",              unit: "lovelace",       description: "Fixed base fee charged on every transaction", lovelace: true },
  // Block limits
  { key: "maxBlockSize",      category: "Block Capacity",        label: "maxBlockSize",         unit: "bytes",          description: "Maximum total block body size" },
  { key: "maxBBSize",         category: "Block Capacity",        label: "maxBBSize",            unit: "bytes",          description: "Maximum block body size (transactions only)" },
  { key: "maxBHSize",         category: "Block Capacity",        label: "maxBHSize",            unit: "bytes",          description: "Maximum block header size" },
  { key: "maxTxSize",         category: "Block Capacity",        label: "maxTxSize",            unit: "bytes",          description: "Maximum size of a single transaction" },
  // Tx limits
  { key: "maxValSize",        category: "Transaction Limits",    label: "maxValSize",           unit: "bytes",          description: "Maximum serialized size of the value field (ADA + multi-assets) in a UTxO" },
  { key: "maxCollateralInputs", category: "Transaction Limits",  label: "maxCollateralInputs",  unit: "inputs",         description: "Maximum number of UTxOs usable as collateral" },
  { key: "collateralPercent", category: "Transaction Limits",    label: "collateralPercent",    unit: "%",              description: "Minimum collateral as a percentage of the script execution fee" },
  // Deposits
  { key: "keyDeposit",        category: "Deposits",              label: "keyDeposit",           unit: "lovelace",       description: "Refundable deposit to register a stake key", lovelace: true },
  { key: "poolDeposit",       category: "Deposits",              label: "poolDeposit",          unit: "lovelace",       description: "Refundable deposit to register a stake pool", lovelace: true },
  { key: "govActionDeposit",  category: "Deposits",              label: "govActionDeposit",     unit: "lovelace",       description: "Refundable deposit to submit a governance action", lovelace: true },
  { key: "drepDeposit",       category: "Deposits",              label: "drepDeposit",          unit: "lovelace",       description: "Refundable deposit to register as a DRep", lovelace: true },
  // Monetary expansion
  { key: "rho",               category: "Rewards & Treasury",    label: "rho (ρ)",                                      description: "Monetary expansion rate — fraction of reserves distributed each epoch" },
  { key: "tau",               category: "Rewards & Treasury",    label: "tau (τ)",                                      description: "Treasury growth rate — fraction of epoch rewards sent to the treasury" },
  { key: "minPoolCost",       category: "Rewards & Treasury",    label: "minPoolCost",          unit: "lovelace",       description: "Minimum fixed fee a pool may charge per epoch", lovelace: true },
  // Staking
  { key: "nOpt",              category: "Pool Mechanics",        label: "k (nOpt)",                                     description: "Target number of stake pools — saturation point = totalStake / k" },
  { key: "a0",                category: "Pool Mechanics",        label: "a0",                                           description: "Pledge influence factor on pool rewards" },
  { key: "maxEpoch",          category: "Pool Mechanics",        label: "maxEpoch",             unit: "epochs",         description: "Maximum epochs in advance a pool retirement can be scheduled" },
  { key: "coinsPerUTxOByte",  category: "Pool Mechanics",        label: "coinsPerUTxOByte",     unit: "lovelace/byte",  description: "Minimum ADA per byte of UTxO serialized size" },
  // Script execution
  { key: "priceMem",          category: "Script Execution",      label: "priceMem",             unit: "lovelace/unit",  description: "Cost per memory unit consumed by a Plutus script" },
  { key: "priceStep",         category: "Script Execution",      label: "priceStep",            unit: "lovelace/unit",  description: "Cost per CPU step consumed by a Plutus script" },
  { key: "maxTxExMem",        category: "Script Execution",      label: "maxTxExMem",           unit: "mem units",      description: "Maximum memory units allowed per transaction" },
  { key: "maxTxExSteps",      category: "Script Execution",      label: "maxTxExSteps",         unit: "CPU steps",      description: "Maximum CPU steps allowed per transaction" },
  { key: "maxBlockExMem",     category: "Script Execution",      label: "maxBlockExMem",        unit: "mem units",      description: "Maximum total memory units for all scripts in a block" },
  { key: "maxBlockExSteps",   category: "Script Execution",      label: "maxBlockExSteps",      unit: "CPU steps",      description: "Maximum total CPU steps for all scripts in a block" },
  // Protocol version
  { key: "protocolMajor",     category: "Protocol Version",      label: "protocolMajor",                                description: "Current major protocol version — incrementing triggers a hard fork" },
  { key: "protocolMinor",     category: "Protocol Version",      label: "protocolMinor",                                description: "Current minor protocol version — incrementing is a soft fork" },
  // Governance
  { key: "govActionLifetime", category: "Governance",            label: "govActionLifetime",    unit: "epochs",         description: "How long a governance action remains open before expiring" },
  { key: "drepActivity",      category: "Governance",            label: "drepActivity",         unit: "epochs",         description: "Epochs a DRep can be inactive before their voting power expires" },
  { key: "ccMinSize",         category: "Governance",            label: "ccMinSize",                                    description: "Minimum number of Constitutional Committee members required" },
  { key: "ccMaxTermLength",   category: "Governance",            label: "ccMaxTermLength",      unit: "epochs",         description: "Maximum term length for a Constitutional Committee member" }
];

const CATEGORIES = Array.from(new Set(ALL_PARAMS.map((p) => p.category)));

interface Props {
  params: TProtocolParam;
}

export const DetailedView = ({ params }: Props) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { isDark: boolean };

  const formatValue = (meta: ParamMeta): string => {
    const raw = params[meta.key];
    if (raw === undefined || raw === null || raw === "") return "—";
    if (typeof raw === "object") return JSON.stringify(raw);
    const n = Number(raw);
    if (!Number.isNaN(n)) return n.toLocaleString();
    return String(raw);
  };

  const formatAda = (meta: ParamMeta): string | null => {
    if (!meta.lovelace) return null;
    const raw = params[meta.key];
    if (raw === undefined || raw === null || raw === "") return null;
    const n = Number(raw);
    if (Number.isNaN(n)) return null;
    return `${(n / LOVELACE).toLocaleString(undefined, { maximumFractionDigits: 6 })} ADA`;
  };

  return (
    <Box>
      {CATEGORIES.map((category) => {
        const rows = ALL_PARAMS.filter(
          (p) => p.category === category && params[p.key] !== undefined && params[p.key] !== null
        );
        if (rows.length === 0) return null;
        return (
          <Box key={category} mb={4}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ color: theme.palette.primary.main, mb: 1 }}
            >
              {category}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.04) }}>
                    <TableCell sx={{ fontWeight: 700, width: 200 }}>Parameter</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 120 }}>Unit</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, width: 180 }}>
                      Value
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((meta) => {
                    const ada = formatAda(meta);
                    return (
                      <TableRow key={meta.key} hover>
                        <TableCell
                          sx={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            color: theme.palette.primary.main
                          }}
                        >
                          {meta.label}
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
                          {meta.description}
                        </TableCell>
                        <TableCell sx={{ color: "text.disabled", fontSize: "0.75rem" }}>
                          {meta.unit ?? "—"}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}
                          >
                            {formatValue(meta)}
                          </Typography>
                          {ada && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {ada}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
      })}
    </Box>
  );
};
