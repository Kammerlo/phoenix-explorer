import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme
} from "@mui/material";
import { MdInfoOutline, MdGridView, MdTableRows } from "react-icons/md";
import { ApiConnector } from "src/commons/connector/ApiConnector";

// Impact severity: how significant a change to this parameter would be
type Impact = "critical" | "high" | "medium" | "low";

interface ParamMeta {
  key: keyof TProtocolParam;
  label: string;
  description: string;
  impact: Impact;
  impactDetail: string;
  unit?: string;
  category: string;
}

const IMPACT_COLOR: Record<Impact, string> = {
  critical: "#d32f2f",
  high:     "#f57c00",
  medium:   "#1976d2",
  low:      "#388e3c"
};

const IMPACT_LABEL: Record<Impact, string> = {
  critical: "Critical",
  high:     "High",
  medium:   "Medium",
  low:      "Low"
};

const ALL_PARAMS: ParamMeta[] = [
  // ── Fee Parameters ─────────────────────────────────────────────────────
  {
    key: "minFeeA", category: "Fee Parameters", impact: "high",
    label: "Min Fee A",
    unit: "lovelace/byte",
    description: "The per-byte coefficient in the minimum transaction fee formula: fee ≥ minFeeA × size + minFeeB.",
    impactDetail: "Increasing minFeeA raises fees for larger transactions (smart contract calls, multi-asset transfers). Decreasing it lowers fees but may allow spam attacks."
  },
  {
    key: "minFeeB", category: "Fee Parameters", impact: "medium",
    label: "Min Fee B",
    unit: "lovelace",
    description: "The fixed base component of the minimum transaction fee.",
    impactDetail: "A higher base fee discourages trivially small transactions. A lower base fee improves accessibility for micro-payments."
  },
  // ── Block & TX Limits ──────────────────────────────────────────────────
  {
    key: "maxBlockSize", category: "Block Limits", impact: "critical",
    label: "Max Block Size",
    unit: "bytes",
    description: "Maximum total size of a block body in bytes.",
    impactDetail: "Raising this increases throughput but requires all nodes to process and store larger blocks, risking decentralization by excluding low-bandwidth participants."
  },
  {
    key: "maxBHSize", category: "Block Limits", impact: "low",
    label: "Max Block Header Size",
    unit: "bytes",
    description: "Maximum size of a block header.",
    impactDetail: "Headers carry metadata (slot, VRF proof, signatures). Changing this has minimal user impact but affects relay bandwidth."
  },
  {
    key: "maxBBSize", category: "Block Limits", impact: "critical",
    label: "Max Block Body Size",
    unit: "bytes",
    description: "Maximum size of the block body (transactions). Usually identical to maxBlockSize.",
    impactDetail: "Directly controls how many transactions fit per block. Larger values increase TPS but require more powerful node hardware."
  },
  {
    key: "maxTxSize", category: "Transaction Limits", impact: "high",
    label: "Max Transaction Size",
    unit: "bytes",
    description: "Maximum size of a single transaction.",
    impactDetail: "Limits the complexity of smart contracts and the number of inputs/outputs per transaction. Increasing this enables more sophisticated DApps but raises script execution overhead."
  },
  {
    key: "maxValSize", category: "Transaction Limits", impact: "medium",
    label: "Max Value Size",
    unit: "bytes",
    description: "Maximum serialized size of the value field (ADA + multi-assets) in a transaction output.",
    impactDetail: "Limits how many different native tokens can appear in a single UTxO. A higher value enables richer multi-asset outputs."
  },
  {
    key: "maxCollateralInputs", category: "Transaction Limits", impact: "medium",
    label: "Max Collateral Inputs",
    unit: "inputs",
    description: "Maximum number of UTxOs that can be used as collateral for a Plutus script execution.",
    impactDetail: "Affects how users provision collateral for DApp interactions. Too low a value makes it harder to supply sufficient collateral."
  },
  {
    key: "collateralPercent", category: "Transaction Limits", impact: "high",
    label: "Collateral Percentage",
    unit: "%",
    description: "The minimum collateral as a percentage of the script execution fee. If a script fails, this percentage of the execution fee is charged.",
    impactDetail: "Higher values provide more security guarantees but increase the economic risk for DApp users whose scripts may legitimately fail."
  },
  // ── Deposits ───────────────────────────────────────────────────────────
  {
    key: "keyDeposit", category: "Deposits", impact: "high",
    label: "Stake Key Deposit",
    unit: "lovelace",
    description: "ADA deposit required to register a stake key. Returned on deregistration.",
    impactDetail: "Increasing this discourages spam stake registrations but raises barriers for small ADA holders wanting to earn staking rewards."
  },
  {
    key: "poolDeposit", category: "Deposits", impact: "high",
    label: "Pool Deposit",
    unit: "lovelace",
    description: "ADA deposit required to register a stake pool. Returned on retirement.",
    impactDetail: "A higher pool deposit deters ephemeral pools and Sybil attacks but raises the barrier for new pool operators."
  },
  {
    key: "govActionDeposit", category: "Deposits", impact: "critical",
    label: "Governance Action Deposit",
    unit: "lovelace",
    description: "ADA deposit required to submit a governance action (Conway era).",
    impactDetail: "Balances open governance participation against spam governance proposals. Too high discourages community participation; too low enables governance spam."
  },
  {
    key: "drepDeposit", category: "Deposits", impact: "high",
    label: "DRep Deposit",
    unit: "lovelace",
    description: "ADA deposit required to register as a Delegated Representative (DRep).",
    impactDetail: "Ensures DReps have skin-in-the-game. Higher deposits reduce spam DRep registrations but limit participation from smaller ADA holders."
  },
  // ── Monetary Expansion ─────────────────────────────────────────────────
  {
    key: "rho", category: "Monetary Expansion", impact: "critical",
    label: "Monetary Expansion Rate (ρ)",
    description: "The fraction of remaining ADA reserves distributed as rewards each epoch.",
    impactDetail: "Higher rho increases staking rewards short-term but depletes reserves faster, reducing long-term sustainability. This directly affects inflation."
  },
  {
    key: "tau", category: "Monetary Expansion", impact: "high",
    label: "Treasury Growth Rate (τ)",
    description: "The fraction of epoch rewards allocated to the Cardano treasury.",
    impactDetail: "Higher tau grows the treasury (funding development) but reduces rewards distributed to stake pool operators and delegators."
  },
  {
    key: "a0", category: "Monetary Expansion", impact: "high",
    label: "Pool Influence (a0)",
    description: "Controls how much a pool operator's pledge affects reward calculations.",
    impactDetail: "Higher a0 rewards pools with higher pledge, incentivizing operators to lock more ADA. Lower values make pledge less relevant, reducing barriers for new pools."
  },
  {
    key: "minPoolCost", category: "Monetary Expansion", impact: "medium",
    label: "Min Pool Cost",
    unit: "lovelace",
    description: "The minimum fixed fee a pool operator can charge per epoch, regardless of pool size.",
    impactDetail: "Prevents a race-to-zero in pool fees. Reducing this may help small pools compete but could lead to unsustainable pool economics."
  },
  // ── Staking & Pools ────────────────────────────────────────────────────
  {
    key: "nOpt", category: "Staking & Pools", impact: "critical",
    label: "Desired Number of Pools (k)",
    description: "The target number of stake pools for reward optimization. Rewards are maximized when pools have (total stake / k) in delegations.",
    impactDetail: "Increasing k encourages more, smaller pools (better decentralization). Decreasing k concentrates stake in fewer, larger pools."
  },
  {
    key: "maxEpoch", category: "Staking & Pools", impact: "low",
    label: "Max Pool Retirement Epoch",
    unit: "epochs",
    description: "The maximum number of epochs in the future that a pool retirement can be scheduled.",
    impactDetail: "Limits how far ahead a pool can announce retirement, giving delegators a bounded notice period."
  },
  {
    key: "coinsPerUTxOByte", category: "Staking & Pools", impact: "high",
    label: "Coins Per UTxO Byte",
    unit: "lovelace/byte",
    description: "The minimum ADA that must be included in a UTxO per byte of its serialized size.",
    impactDetail: "Ensures UTxOs have sufficient ADA to be economically viable. Raising this increases the minimum ADA in outputs, impacting users holding many native tokens."
  },
  // ── Script Execution ───────────────────────────────────────────────────
  {
    key: "priceMem", category: "Script Execution", impact: "high",
    label: "Memory Execution Price",
    unit: "lovelace/unit",
    description: "Fee per unit of memory used during Plutus script execution.",
    impactDetail: "Higher values increase fees for memory-intensive smart contracts. Affects DApp economics and competitive positioning vs. other chains."
  },
  {
    key: "priceStep", category: "Script Execution", impact: "high",
    label: "CPU Step Execution Price",
    unit: "lovelace/unit",
    description: "Fee per CPU step used during Plutus script execution.",
    impactDetail: "Higher values increase fees for computation-intensive scripts. Lower values make complex DApps cheaper but may enable resource exhaustion."
  },
  {
    key: "maxTxExMem", category: "Script Execution", impact: "high",
    label: "Max Tx Execution Memory",
    unit: "units",
    description: "Maximum memory units a single transaction's scripts can consume.",
    impactDetail: "Limits per-transaction resource use. Increasing enables more complex DApps but raises potential for abuse."
  },
  {
    key: "maxTxExSteps", category: "Script Execution", impact: "high",
    label: "Max Tx Execution Steps",
    unit: "units",
    description: "Maximum CPU steps a single transaction's scripts can consume.",
    impactDetail: "Controls complexity ceiling for individual script executions per transaction."
  },
  {
    key: "maxBlockExMem", category: "Script Execution", impact: "critical",
    label: "Max Block Execution Memory",
    unit: "units",
    description: "Maximum total memory units for all scripts in a single block.",
    impactDetail: "Sets the block-level ceiling for smart contract execution. Too high risks validator nodes running out of memory mid-block."
  },
  {
    key: "maxBlockExSteps", category: "Script Execution", impact: "critical",
    label: "Max Block Execution Steps",
    unit: "units",
    description: "Maximum total CPU steps for all scripts in a single block.",
    impactDetail: "Controls total computation per block. Raising this enables more DApp transactions per block but increases block validation time."
  },
  // ── Protocol Version ───────────────────────────────────────────────────
  {
    key: "protocolMajor", category: "Protocol Version", impact: "critical",
    label: "Protocol Major Version",
    description: "The current major protocol version. Incrementing triggers a hard fork.",
    impactDetail: "A major version bump (hard fork) introduces backward-incompatible changes. This is the mechanism by which Cardano eras are introduced (e.g., Alonzo, Babbage, Conway)."
  },
  {
    key: "protocolMinor", category: "Protocol Version", impact: "low",
    label: "Protocol Minor Version",
    description: "The current minor protocol version. Incrementing is a soft fork.",
    impactDetail: "Minor version increments introduce backward-compatible changes and do not require all nodes to upgrade simultaneously."
  },
  // ── Governance ─────────────────────────────────────────────────────────
  {
    key: "govActionLifetime", category: "Governance", impact: "high",
    label: "Gov Action Lifetime",
    unit: "epochs",
    description: "How many epochs a governance action remains active before expiring if not ratified.",
    impactDetail: "Shorter lifetime means faster governance cycles but less time for community deliberation. Longer lifetime allows broader participation."
  },
  {
    key: "drepActivity", category: "Governance", impact: "high",
    label: "DRep Activity Window",
    unit: "epochs",
    description: "Number of epochs a DRep can be inactive before their voting power expires.",
    impactDetail: "Ensures DReps remain engaged. A shorter window enforces more frequent activity; a longer window is more lenient but may leave inactive DReps influencing outcomes."
  },
  {
    key: "ccMinSize", category: "Governance", impact: "high",
    label: "CC Min Size",
    description: "Minimum number of Constitutional Committee members required.",
    impactDetail: "Smaller CC is easier to coordinate but more susceptible to capture. Larger CC is more resilient but harder to achieve consensus."
  },
  {
    key: "ccMaxTermLength", category: "Governance", impact: "medium",
    label: "CC Max Term Length",
    unit: "epochs",
    description: "Maximum term length for a Constitutional Committee member.",
    impactDetail: "Shorter terms ensure regular turnover and fresh perspectives. Longer terms provide continuity and institutional knowledge."
  }
];

// Group params by category
const CATEGORIES = Array.from(new Set(ALL_PARAMS.map((p) => p.category)));

const ProtocolParameters: React.FC = () => {
  const theme = useTheme();
  const [params, setParams] = useState<TProtocolParam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [expandedParam, setExpandedParam] = useState<string | null>(null);

  useEffect(() => {
    const apiConnector = ApiConnector.getApiConnector();
    apiConnector
      .getCurrentProtocolParameters()
      .then((result) => {
        if (result.data) setParams(result.data);
        else setError(result.error ?? "Failed to load protocol parameters");
      })
      .catch(() => setError("Failed to load protocol parameters"))
      .finally(() => setLoading(false));
  }, []);

  const getImpactChip = (impact: Impact) => (
    <Chip
      label={IMPACT_LABEL[impact]}
      size="small"
      sx={{
        bgcolor: IMPACT_COLOR[impact] + "22",
        color: IMPACT_COLOR[impact],
        border: `1px solid ${IMPACT_COLOR[impact]}44`,
        fontWeight: "bold",
        fontSize: "0.65rem",
        height: 20
      }}
    />
  );

  const formatValue = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return "—";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const visibleParams = ALL_PARAMS.filter((p) => {
    const v = params?.[p.key];
    return v !== undefined && v !== null && v !== "" && v !== 0 || v === 0;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto" }}>
      {/* Header */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2} mb={1}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Protocol Parameters
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Current Cardano network parameters — hover parameter names for impact analysis
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_e, v) => { if (v) setViewMode(v); }}
          size="small"
          sx={{ alignSelf: "center" }}
        >
          <ToggleButton value="cards" aria-label="card view">
            <MdGridView size={18} />
            <Box component="span" ml={0.5} sx={{ display: { xs: "none", sm: "inline" } }}>Cards</Box>
          </ToggleButton>
          <ToggleButton value="table" aria-label="table view">
            <MdTableRows size={18} />
            <Box component="span" ml={0.5} sx={{ display: { xs: "none", sm: "inline" } }}>Table</Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Impact legend */}
      <Box display="flex" gap={1} flexWrap="wrap" mb={3} mt={1}>
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>Impact of changing:</Typography>
        {(Object.keys(IMPACT_LABEL) as Impact[]).map((k) => (
          <Box key={k} display="flex" alignItems="center" gap={0.5}>
            {getImpactChip(k)}
          </Box>
        ))}
      </Box>

      {loading && <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>}
      {error && <Typography color="error" mt={4}>{error}</Typography>}

      {params && viewMode === "cards" && (
        <Grid container spacing={3}>
          {CATEGORIES.map((category) => {
            const categoryParams = visibleParams.filter((p) => p.category === category);
            if (categoryParams.length === 0) return null;
            return (
              <Grid size={{ xs: 12, md: 6 }} key={category}>
                <Card variant="outlined" sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" mb={1.5} color={theme.palette.primary.main}>
                      {category}
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    {categoryParams.map(({ key, label, description, impactDetail, impact, unit }) => {
                      const value = params[key];
                      const isExpanded = expandedParam === key;
                      return (
                        <Box key={key}>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            py={0.75}
                            sx={{
                              cursor: "pointer",
                              borderBottom: `1px solid ${theme.palette.divider}`,
                              "&:last-child": { borderBottom: 0 },
                              "&:hover": { bgcolor: "action.hover" },
                              borderRadius: 0.5,
                              px: 0.5
                            }}
                            onClick={() => setExpandedParam(isExpanded ? null : key)}
                          >
                            <Box display="flex" alignItems="center" gap={0.5} mr={1} minWidth={0}>
                              {getImpactChip(impact)}
                              <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5, minWidth: 0 }}>
                                {label}
                                {unit && <Box component="span" color="text.disabled"> ({unit})</Box>}
                              </Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={0.5} flexShrink={0}>
                              <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: "monospace" }}>
                                {formatValue(value)}
                              </Typography>
                              <Tooltip title={description} placement="top">
                                <Box component="span" sx={{ color: "text.disabled", display: "flex" }}>
                                  <MdInfoOutline size={14} />
                                </Box>
                              </Tooltip>
                            </Box>
                          </Box>

                          {/* Expanded impact detail */}
                          {isExpanded && (
                            <Box
                              px={1.5}
                              py={1}
                              mb={0.5}
                              sx={{
                                bgcolor: IMPACT_COLOR[impact] + "11",
                                borderLeft: `3px solid ${IMPACT_COLOR[impact]}`,
                                borderRadius: "0 4px 4px 0"
                              }}
                            >
                              <Typography variant="caption" fontWeight="bold" color={IMPACT_COLOR[impact]}>
                                Impact Analysis
                              </Typography>
                              <Typography variant="caption" display="block" color="text.secondary" mt={0.25}>
                                {impactDetail}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {params && viewMode === "table" && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell><strong>Category</strong></TableCell>
                <TableCell><strong>Parameter</strong></TableCell>
                <TableCell><strong>Unit</strong></TableCell>
                <TableCell align="right"><strong>Current Value</strong></TableCell>
                <TableCell><strong>Impact</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleParams.map(({ key, label, description, impactDetail, impact, unit, category }) => {
                const value = params[key];
                return (
                  <Tooltip
                    key={key}
                    title={
                      <Box maxWidth={320}>
                        <Typography variant="caption" fontWeight="bold">Impact Analysis</Typography>
                        <Typography variant="caption" display="block">{impactDetail}</Typography>
                      </Box>
                    }
                    placement="left"
                    arrow
                  >
                    <TableRow hover sx={{ cursor: "help" }}>
                      <TableCell sx={{ color: "text.secondary", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        {category}
                      </TableCell>
                      <TableCell sx={{ fontWeight: "medium", whiteSpace: "nowrap" }}>{label}</TableCell>
                      <TableCell sx={{ color: "text.disabled", fontSize: "0.75rem" }}>{unit ?? "—"}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: "monospace", fontWeight: "bold" }}>
                        {formatValue(value)}
                      </TableCell>
                      <TableCell>{getImpactChip(impact)}</TableCell>
                      <TableCell sx={{ color: "text.secondary", fontSize: "0.75rem", maxWidth: 300 }}>
                        {description}
                      </TableCell>
                    </TableRow>
                  </Tooltip>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ProtocolParameters;
