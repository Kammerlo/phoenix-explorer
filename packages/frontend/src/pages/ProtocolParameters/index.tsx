import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  Container,
  Divider,
  InputAdornment,
  LinearProgress,
  Paper,
  Skeleton,
  Slider,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme
} from "@mui/material";
import { MdGridView, MdTableRows } from "react-icons/md";
import { ApiConnector } from "src/commons/connector/ApiConnector";

// ── Constants ──────────────────────────────────────────────────────────────
const LOVELACE = 1_000_000;
const APPROX_RESERVES_ADA = 8_000_000_000;
const APPROX_TOTAL_STAKE_ADA = 26_000_000_000;
const EPOCHS_PER_YEAR = 73;
const EPOCH_DAYS = 5;

const n = (v: string | number | undefined | null): number => Number(v) || 0;

// ── Shared visual components ───────────────────────────────────────────────

const ParamCard: React.FC<{
  label: string;
  value: string | number | undefined | null;
  description: string;
  unit?: string;
  accent: string;
}> = ({ label, value, description, unit, accent }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        border: `1.5px solid ${accent}66`,
        borderRadius: 2,
        p: { xs: 1.5, sm: 2 },
        bgcolor: theme.palette.mode === "dark" ? `${accent}12` : `${accent}09`,
        flex: 1,
        minWidth: { xs: "100%", sm: 160 }
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
        <Typography
          variant="subtitle2"
          fontWeight="bold"
          sx={{ color: accent, fontFamily: "monospace", fontSize: "0.85rem" }}
        >
          {label}
        </Typography>
        <Box display="flex" alignItems="baseline" gap={0.5}>
          <Typography
            variant="body2"
            fontWeight="bold"
            sx={{ fontFamily: "monospace", color: accent }}
          >
            {value !== undefined && value !== null ? Number(value).toLocaleString() : "—"}
          </Typography>
          {unit && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
              {unit}
            </Typography>
          )}
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.4}>
        {description}
      </Typography>
    </Box>
  );
};

const Connector: React.FC<{ count: number }> = ({ count }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: count === 1 ? "center" : "space-around",
      height: 36,
      px: count === 1 ? 0 : count <= 2 ? "22%" : count === 3 ? "14%" : "8%"
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <Box
        key={i}
        sx={{ width: 0, borderLeft: "2px dashed", borderColor: "divider", height: "100%" }}
      />
    ))}
  </Box>
);

const ExampleBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      border: "1.5px dashed",
      borderColor: "primary.main",
      borderRadius: 2,
      p: { xs: 2, sm: 2.5 },
      pt: { xs: 3, sm: 3.5 },
      position: "relative"
    }}
  >
    <Chip
      label="Example"
      size="small"
      color="primary"
      sx={{
        position: "absolute",
        top: -12,
        left: 16,
        fontWeight: "bold",
        fontSize: "0.7rem",
        height: 22
      }}
    />
    {children}
  </Box>
);

const SectionHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <Box mb={2.5}>
    <Typography variant="h6" fontWeight="bold">
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {subtitle}
    </Typography>
  </Box>
);

// ── Fee Section ────────────────────────────────────────────────────────────
const FeeSection: React.FC<{ p: TProtocolParam }> = ({ p }) => {
  const [txBytes, setTxBytes] = useState(300);
  const A = n(p.minFeeA);
  const B = n(p.minFeeB);
  const feeL = Math.round(B + txBytes * A);
  const feeADA = (feeL / LOVELACE).toFixed(6);

  return (
    <Box>
      <SectionHeader
        title="Transaction Fees"
        subtitle="Every Cardano transaction must pay a minimum fee calculated from its size in bytes."
      />
      <Box display="flex" gap={2} flexWrap="wrap">
        <ParamCard
          label="minFeeA"
          value={A}
          unit="lovelace/byte"
          description="Per-byte coefficient — the fee grows with transaction size"
          accent="#4caf50"
        />
        <ParamCard
          label="minFeeB"
          value={B}
          unit="lovelace"
          description="Fixed base fee charged regardless of transaction size"
          accent="#2196f3"
        />
      </Box>
      <Connector count={2} />
      <ExampleBox>
        <Box display="flex" gap={3} flexWrap="wrap" alignItems="center">
          <Box minWidth={160}>
            <Typography variant="caption" color="text.secondary">
              Transaction size (Tx Bytes)
            </Typography>
            <Box mt={0.5} mb={0.5}>
              <TextField
                type="number"
                size="small"
                value={txBytes}
                onChange={(e) =>
                  setTxBytes(Math.max(100, Math.min(16384, Number(e.target.value) || 300)))
                }
                sx={{ width: 110 }}
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">B</InputAdornment> }
                }}
              />
            </Box>
            <Typography variant="h5" fontWeight="bold" color="#4caf50">
              {txBytes.toLocaleString()} bytes
            </Typography>
          </Box>
          <Box flex={1} minWidth={240} textAlign="center">
            <Typography variant="body1" sx={{ fontFamily: "monospace", mb: 0.5 }}>
              <Box component="span" color="#2196f3" fontWeight="bold">
                minFeeB
              </Box>
              {" + Tx bytes × "}
              <Box component="span" color="#4caf50" fontWeight="bold">
                minFeeA
              </Box>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              {B.toLocaleString()} lovelace + {txBytes.toLocaleString()} bytes × {A} lovelace ={" "}
              <strong>{feeL.toLocaleString()} lovelace</strong>
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="#f57c00">
              → {feeADA} ADA
            </Typography>
          </Box>
        </Box>
      </ExampleBox>
    </Box>
  );
};

// ── Block Capacity Section ─────────────────────────────────────────────────
const BlockCapacitySection: React.FC<{ p: TProtocolParam }> = ({ p }) => {
  const [avgTxSize, setAvgTxSize] = useState(400);
  const maxBlock = n(p.maxBBSize) || n(p.maxBlockSize);
  const maxTx = n(p.maxTxSize);
  const txPerBlock = maxBlock > 0 ? Math.floor(maxBlock / avgTxSize) : 0;
  const blockFillPct = Math.min(100, (avgTxSize * txPerBlock) / maxBlock) * 100;
  const tps = (txPerBlock / 20).toFixed(1);

  return (
    <Box>
      <SectionHeader
        title="Block Capacity"
        subtitle="Block size limits control how many transactions fit per block and the overall network throughput."
      />
      <Box display="flex" gap={2} flexWrap="wrap">
        <ParamCard
          label="maxBlockSize"
          value={maxBlock}
          unit="bytes"
          description="Maximum total size of a block body — sets the throughput ceiling"
          accent="#9c27b0"
        />
        <ParamCard
          label="maxTxSize"
          value={maxTx}
          unit="bytes"
          description="Maximum size of a single transaction — limits smart contract complexity"
          accent="#ff9800"
        />
      </Box>
      <Connector count={2} />
      <ExampleBox>
        <Box display="flex" gap={3} flexWrap="wrap" alignItems="center">
          <Box minWidth={160}>
            <Typography variant="caption" color="text.secondary">
              Average Tx size
            </Typography>
            <Box mt={0.5} mb={0.5}>
              <TextField
                type="number"
                size="small"
                value={avgTxSize}
                onChange={(e) =>
                  setAvgTxSize(
                    Math.max(100, Math.min(maxTx || 16384, Number(e.target.value) || 400))
                  )
                }
                sx={{ width: 110 }}
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">B</InputAdornment> }
                }}
              />
            </Box>
            <Typography variant="h5" fontWeight="bold" color="#9c27b0">
              {avgTxSize} bytes
            </Typography>
          </Box>
          <Box flex={1} minWidth={220}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Transactions per block:{" "}
              <Box component="strong" sx={{ color: "#9c27b0" }}>
                {txPerBlock.toLocaleString()}
              </Box>
            </Typography>
            <LinearProgress
              variant="determinate"
              value={blockFillPct}
              sx={{
                height: 14,
                borderRadius: 1,
                my: 1,
                bgcolor: "#9c27b022",
                "& .MuiLinearProgress-bar": { bgcolor: "#9c27b0" }
              }}
            />
            <Box display="flex" justifyContent="space-between" mb={1.5}>
              <Typography variant="caption" color="text.secondary">
                Block fill: {blockFillPct.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(maxBlock / 1024).toFixed(1)} KB total
              </Typography>
            </Box>
            <Typography variant="h6" fontWeight="bold" color="#f57c00">
              → ~{tps} TPS
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Based on ~20s average block time
            </Typography>
          </Box>
        </Box>
      </ExampleBox>
    </Box>
  );
};

// ── Deposits Section ───────────────────────────────────────────────────────
const DepositsSection: React.FC<{ p: TProtocolParam }> = ({ p }) => {
  const deposits = [
    {
      label: "keyDeposit",
      value: n(p.keyDeposit),
      desc: "Register a stake key — returned on deregistration",
      accent: "#2196f3"
    },
    {
      label: "poolDeposit",
      value: n(p.poolDeposit),
      desc: "Register a stake pool — returned on retirement",
      accent: "#9c27b0"
    },
    {
      label: "govActionDeposit",
      value: n(p.govActionDeposit),
      desc: "Submit a governance action — returned if ratified or expired",
      accent: "#f44336"
    },
    {
      label: "drepDeposit",
      value: n(p.drepDeposit),
      desc: "Register as a DRep — returned on deregistration",
      accent: "#ff9800"
    }
  ];

  return (
    <Box>
      <SectionHeader
        title="Participation Deposits"
        subtitle="Refundable ADA deposits required to participate in the Cardano ecosystem. They prevent spam and ensure participants have skin in the game."
      />
      <Box display="flex" gap={2} flexWrap="wrap">
        {deposits.map((d) => (
          <ParamCard
            key={d.label}
            label={d.label}
            value={d.value}
            unit="lovelace"
            description={d.desc}
            accent={d.accent}
          />
        ))}
      </Box>
      <Connector count={4} />
      <ExampleBox>
        <Typography variant="body2" color="text.secondary" mb={2}>
          All deposits are locked ADA returned when the participant exits. They are not fees — no
          ADA is burned.
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          {deposits.map((d) => (
            <Box
              key={d.label}
              sx={{
                flex: 1,
                minWidth: 110,
                textAlign: "center",
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: d.accent + "11",
                border: `1px solid ${d.accent}33`
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block">
                {d.label}
              </Typography>
              <Typography variant="h6" fontWeight="bold" sx={{ color: d.accent }}>
                {(d.value / LOVELACE).toLocaleString(undefined, { maximumFractionDigits: 0 })} ADA
              </Typography>
            </Box>
          ))}
        </Box>
      </ExampleBox>
    </Box>
  );
};

// ── Rewards Section ────────────────────────────────────────────────────────
const RewardsSection: React.FC<{ p: TProtocolParam }> = ({ p }) => {
  const rho = n(p.rho);
  const tau = n(p.tau);
  const [reserves, setReserves] = useState(APPROX_RESERVES_ADA);

  const epochRewards = reserves * rho;
  const toTreasury = epochRewards * tau;
  const toPools = epochRewards * (1 - tau);
  const annualToPools = toPools * EPOCHS_PER_YEAR;
  const estimatedAPY =
    APPROX_TOTAL_STAKE_ADA > 0 ? (annualToPools / APPROX_TOTAL_STAKE_ADA) * 100 : 0;

  const fmtADA = (v: number) =>
    v.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " ADA";

  return (
    <Box>
      <SectionHeader
        title="Rewards & Treasury"
        subtitle="Each epoch, a fraction (ρ) of remaining reserves is minted as rewards. The treasury takes τ of that; the rest goes to pools and delegators."
      />
      <Box display="flex" gap={2} flexWrap="wrap">
        <ParamCard
          label="rho (ρ)"
          value={rho}
          description="Monetary expansion rate — fraction of reserves distributed as rewards each epoch"
          accent="#4caf50"
        />
        <ParamCard
          label="tau (τ)"
          value={tau}
          description="Treasury growth rate — fraction of epoch rewards going to the treasury"
          accent="#f44336"
        />
      </Box>
      <Connector count={2} />
      <ExampleBox>
        <Box display="flex" gap={3} flexWrap="wrap" alignItems="flex-start">
          <Box minWidth={190}>
            <Typography variant="caption" color="text.secondary">
              Reserves (ADA)
            </Typography>
            <Box mt={0.5} mb={1}>
              <TextField
                type="number"
                size="small"
                value={reserves}
                onChange={(e) =>
                  setReserves(
                    Math.max(1e6, Math.min(APPROX_RESERVES_ADA * 2, Number(e.target.value) || APPROX_RESERVES_ADA))
                  )
                }
                sx={{ width: 160 }}
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">ADA</InputAdornment> }
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Epoch Rewards = Reserves × ρ
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="#4caf50" mt={0.25}>
              = {fmtADA(epochRewards)}
            </Typography>
          </Box>
          <Box flex={1} minWidth={240}>
            <Box mb={1}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" sx={{ color: "#f44336" }}>
                  → Treasury ({(tau * 100).toFixed(2)}%)
                </Typography>
                <Typography variant="caption" fontWeight="bold" color="#f44336">
                  {fmtADA(toTreasury)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={tau * 100}
                sx={{
                  height: 10,
                  borderRadius: 1,
                  bgcolor: "#f4433622",
                  "& .MuiLinearProgress-bar": { bgcolor: "#f44336" }
                }}
              />
            </Box>
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" sx={{ color: "#4caf50" }}>
                  → Pools & Delegators ({((1 - tau) * 100).toFixed(2)}%)
                </Typography>
                <Typography variant="caption" fontWeight="bold" color="#4caf50">
                  {fmtADA(toPools)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(1 - tau) * 100}
                sx={{
                  height: 10,
                  borderRadius: 1,
                  bgcolor: "#4caf5022",
                  "& .MuiLinearProgress-bar": { bgcolor: "#4caf50" }
                }}
              />
            </Box>
            <Typography variant="h6" fontWeight="bold" color="#f57c00">
              → Est. staking APY ≈ {estimatedAPY.toFixed(2)}%
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Based on ~{(APPROX_TOTAL_STAKE_ADA / 1e9).toFixed(0)}B ADA active stake
            </Typography>
          </Box>
        </Box>
      </ExampleBox>
    </Box>
  );
};

// ── Pool Mechanics Section ─────────────────────────────────────────────────
const PoolMechanicsSection: React.FC<{ p: TProtocolParam }> = ({ p }) => {
  const k = n(p.nOpt);
  const a0 = n(p.a0);
  const minCost = n(p.minPoolCost);
  const [poolStake, setPoolStake] = useState(60_000_000);
  const [pledge, setPledge] = useState(500_000);

  const satPoint = k > 0 ? APPROX_TOTAL_STAKE_ADA / k : 0;
  const satPct = satPoint > 0 ? Math.min(100, (poolStake / satPoint) * 100) : 0;
  const pledgeBonusPct = satPoint > 0 ? (a0 * (pledge / satPoint) * 100).toFixed(4) : "0";

  return (
    <Box>
      <SectionHeader
        title="Pool Mechanics"
        subtitle="k controls how many pools are incentivized. Pools over the saturation point receive reduced rewards, decentralizing stake across more pools."
      />
      <Box display="flex" gap={2} flexWrap="wrap">
        <ParamCard
          label="k (nOpt)"
          value={k}
          description="Target number of stake pools — saturation point = totalStake / k"
          accent="#9c27b0"
        />
        <ParamCard
          label="a0"
          value={a0}
          description="Pledge influence factor — higher pledge yields a proportional rewards bonus"
          accent="#ff9800"
        />
        <ParamCard
          label="minPoolCost"
          value={minCost}
          unit="lovelace"
          description="Minimum fixed fee a pool may charge per epoch"
          accent="#2196f3"
        />
      </Box>
      <Connector count={3} />
      <ExampleBox>
        <Box display="flex" gap={3} flexWrap="wrap">
          <Box minWidth={180}>
            <Typography variant="caption" color="text.secondary">
              Pool stake (ADA)
            </Typography>
            <Box mt={0.5} mb={1}>
              <TextField
                type="number"
                size="small"
                value={poolStake}
                onChange={(e) => setPoolStake(Math.max(0, Number(e.target.value) || 0))}
                sx={{ width: 150 }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Pool pledge (ADA)
            </Typography>
            <Box mt={0.5}>
              <TextField
                type="number"
                size="small"
                value={pledge}
                onChange={(e) => setPledge(Math.max(0, Number(e.target.value) || 0))}
                sx={{ width: 150 }}
              />
            </Box>
          </Box>
          <Box flex={1} minWidth={220}>
            <Typography variant="caption" color="text.secondary">
              Saturation point: {satPoint.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
              ADA
            </Typography>
            <LinearProgress
              variant="determinate"
              value={satPct}
              sx={{
                height: 14,
                borderRadius: 1,
                my: 1,
                bgcolor: "#9c27b022",
                "& .MuiLinearProgress-bar": {
                  bgcolor: satPct >= 100 ? "#f44336" : satPct > 80 ? "#ff9800" : "#9c27b0"
                }
              }}
            />
            <Box display="flex" justifyContent="space-between" mb={1.5}>
              <Typography variant="caption" color="text.secondary">
                Pool filled: {satPct.toFixed(1)}%
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: satPct >= 100 ? "#f44336" : "text.secondary" }}
              >
                {satPct >= 100 ? "Over-saturated — rewards reduced!" : "Within saturation limit"}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Pledge influence bonus:{" "}
              <Box component="strong" sx={{ color: "#ff9800" }}>
                +{pledgeBonusPct}%
              </Box>{" "}
              on rewards
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Minimum pool cost:{" "}
              <Box component="strong" sx={{ color: "#2196f3" }}>
                {(minCost / LOVELACE).toFixed(0)} ADA / epoch
              </Box>
            </Typography>
          </Box>
        </Box>
      </ExampleBox>
    </Box>
  );
};

// ── Script Execution Section ───────────────────────────────────────────────
const ScriptSection: React.FC<{ p: TProtocolParam }> = ({ p }) => {
  const priceMem = n(p.priceMem);
  const priceStep = n(p.priceStep);
  const maxTxMem = n(p.maxTxExMem);
  const maxTxSteps = n(p.maxTxExSteps);
  const [mem, setMem] = useState(500_000);
  const [steps, setSteps] = useState(200_000_000);

  const scriptFeeL = Math.round(mem * priceMem + steps * priceStep);
  const scriptFeeADA = (scriptFeeL / LOVELACE).toFixed(6);
  const memPct = maxTxMem > 0 ? Math.min(100, (mem / maxTxMem) * 100) : 0;
  const stepPct = maxTxSteps > 0 ? Math.min(100, (steps / maxTxSteps) * 100) : 0;

  return (
    <Box>
      <SectionHeader
        title="Plutus Script Execution"
        subtitle="Smart contract scripts consume memory and CPU on-chain. The cost is set by priceMem and priceStep, subject to per-transaction limits."
      />
      <Box display="flex" gap={2} flexWrap="wrap">
        <ParamCard
          label="priceMem"
          value={priceMem}
          unit="lovelace/unit"
          description="Cost per memory unit consumed by a Plutus script"
          accent="#4caf50"
        />
        <ParamCard
          label="priceStep"
          value={priceStep}
          unit="lovelace/unit"
          description="Cost per CPU step consumed by a Plutus script"
          accent="#2196f3"
        />
        <ParamCard
          label="maxTxExMem"
          value={maxTxMem}
          unit="units"
          description="Maximum memory units allowed per transaction"
          accent="#9c27b0"
        />
        <ParamCard
          label="maxTxExSteps"
          value={maxTxSteps}
          unit="units"
          description="Maximum CPU steps allowed per transaction"
          accent="#ff9800"
        />
      </Box>
      <Connector count={4} />
      <ExampleBox>
        <Box display="flex" gap={3} flexWrap="wrap">
          <Box minWidth={220}>
            <Typography variant="caption" color="text.secondary">
              Memory units used
            </Typography>
            <Slider
              value={mem}
              min={0}
              max={maxTxMem || 14_000_000}
              step={10_000}
              onChange={(_, v) => setMem(v as number)}
              sx={{ color: "#4caf50", mt: 1, mb: 0.5 }}
            />
            <Typography variant="caption" color="#4caf50">
              {mem.toLocaleString()} / {maxTxMem.toLocaleString()}
            </Typography>
            <Box mt={1.5}>
              <Typography variant="caption" color="text.secondary">
                CPU steps used
              </Typography>
              <Slider
                value={steps}
                min={0}
                max={maxTxSteps || 10_000_000_000}
                step={1_000_000}
                onChange={(_, v) => setSteps(v as number)}
                sx={{ color: "#2196f3", mt: 1, mb: 0.5 }}
              />
              <Typography variant="caption" color="#2196f3">
                {steps.toLocaleString()} / {maxTxSteps.toLocaleString()}
              </Typography>
            </Box>
          </Box>
          <Box flex={1} minWidth={220}>
            <Typography variant="body2" sx={{ fontFamily: "monospace", mb: 0.5 }}>
              <Box component="span" color="#4caf50">
                mem
              </Box>
              {" × "}
              <Box component="span" color="#4caf50">
                priceMem
              </Box>
              {" + "}
              <Box component="span" color="#2196f3">
                steps
              </Box>
              {" × "}
              <Box component="span" color="#2196f3">
                priceStep
              </Box>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              {mem.toLocaleString()} × {priceMem} + {steps.toLocaleString()} × {priceStep}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              = {scriptFeeL.toLocaleString()} lovelace
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="#f57c00" mb={1.5}>
              → {scriptFeeADA} ADA script fee
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>
              Mem budget used:
            </Typography>
            <LinearProgress
              variant="determinate"
              value={memPct}
              sx={{
                height: 8,
                borderRadius: 1,
                mb: 1,
                bgcolor: "#4caf5022",
                "& .MuiLinearProgress-bar": { bgcolor: "#4caf50" }
              }}
            />
            <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>
              CPU budget used:
            </Typography>
            <LinearProgress
              variant="determinate"
              value={stepPct}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: "#2196f322",
                "& .MuiLinearProgress-bar": { bgcolor: "#2196f3" }
              }}
            />
          </Box>
        </Box>
      </ExampleBox>
    </Box>
  );
};

// ── Governance Section ─────────────────────────────────────────────────────
const GovernanceSection: React.FC<{ p: TProtocolParam }> = ({ p }) => {
  const govLifetime = n(p.govActionLifetime);
  const drepActivity = n(p.drepActivity);
  const ccMinSize = n(p.ccMinSize);
  const ccMaxTerm = n(p.ccMaxTermLength);
  const [epochsInput, setEpochsInput] = useState(govLifetime || 6);

  const days = epochsInput * EPOCH_DAYS;
  const months = (days / 30.4375).toFixed(1);
  const years = (days / 365.25).toFixed(2);

  return (
    <Box>
      <SectionHeader
        title="Governance Timelines"
        subtitle="Conway-era governance is epoch-gated. Understanding how epochs map to real time is key to participating effectively."
      />
      <Box display="flex" gap={2} flexWrap="wrap">
        <ParamCard
          label="govActionLifetime"
          value={govLifetime}
          unit="epochs"
          description="How long a governance proposal remains open before expiring"
          accent="#f44336"
        />
        <ParamCard
          label="drepActivity"
          value={drepActivity}
          unit="epochs"
          description="Epochs a DRep can be inactive before their voting power expires"
          accent="#ff9800"
        />
        <ParamCard
          label="ccMinSize"
          value={ccMinSize}
          description="Minimum number of Constitutional Committee members required"
          accent="#9c27b0"
        />
        <ParamCard
          label="ccMaxTermLength"
          value={ccMaxTerm}
          unit="epochs"
          description="Maximum term length for a Constitutional Committee member"
          accent="#2196f3"
        />
      </Box>
      <Connector count={4} />
      <ExampleBox>
        <Box display="flex" gap={3} flexWrap="wrap">
          <Box minWidth={160}>
            <Typography variant="caption" color="text.secondary">
              Epoch count
            </Typography>
            <Box mt={0.5} mb={0.5}>
              <TextField
                type="number"
                size="small"
                value={epochsInput}
                onChange={(e) => setEpochsInput(Math.max(1, Number(e.target.value) || 1))}
                sx={{ width: 100 }}
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">ep</InputAdornment> }
                }}
              />
            </Box>
            <Typography variant="h5" fontWeight="bold" color="#f44336">
              {epochsInput} epochs
            </Typography>
          </Box>
          <Box flex={1} minWidth={220}>
            <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
              {[
                { label: "Days", value: String(days), color: "#f44336" },
                { label: "Months", value: months, color: "#ff9800" },
                { label: "Years", value: years, color: "#9c27b0" }
              ].map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    flex: 1,
                    minWidth: 80,
                    textAlign: "center",
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: item.color + "11",
                    border: `1px solid ${item.color}33`
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block">
                    {item.label}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{ color: item.color }}>
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Proposal lifetime:{" "}
              <strong>
                {govLifetime} epochs = {govLifetime * EPOCH_DAYS} days
              </strong>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              DRep inactivity window:{" "}
              <strong>
                {drepActivity} epochs = {drepActivity * EPOCH_DAYS} days
              </strong>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Max CC term:{" "}
              <strong>
                {ccMaxTerm} epochs ≈ {((ccMaxTerm * EPOCH_DAYS) / 365.25).toFixed(1)} years
              </strong>
            </Typography>
          </Box>
        </Box>
      </ExampleBox>
    </Box>
  );
};

// ── Network / UTxO Section ─────────────────────────────────────────────────
const NetworkSection: React.FC<{ p: TProtocolParam }> = ({ p }) => {
  const coinsPerByte = n(p.coinsPerUTxOByte);
  const maxTxSize = n(p.maxTxSize);
  const maxBHSize = n(p.maxBHSize);
  const [outputSize, setOutputSize] = useState(60);

  const minADAL = coinsPerByte * outputSize;
  const minADA = (minADAL / LOVELACE).toFixed(6);

  return (
    <Box>
      <SectionHeader
        title="Network & UTxO"
        subtitle="coinsPerUTxOByte sets the minimum ADA every UTxO must carry. This prevents the ledger from being bloated with dust outputs."
      />
      <Box display="flex" gap={2} flexWrap="wrap">
        <ParamCard
          label="coinsPerUTxOByte"
          value={coinsPerByte}
          unit="lovelace/byte"
          description="Minimum ADA per byte of UTxO serialized size"
          accent="#4caf50"
        />
        <ParamCard
          label="maxTxSize"
          value={maxTxSize}
          unit="bytes"
          description="Maximum size of a single transaction"
          accent="#9c27b0"
        />
        <ParamCard
          label="maxBHSize"
          value={maxBHSize}
          unit="bytes"
          description="Maximum block header size — affects relay node bandwidth"
          accent="#2196f3"
        />
      </Box>
      <Connector count={3} />
      <ExampleBox>
        <Box display="flex" gap={3} flexWrap="wrap" alignItems="center">
          <Box minWidth={180}>
            <Typography variant="caption" color="text.secondary">
              UTxO output size (bytes)
            </Typography>
            <Box mt={0.5} mb={0.5}>
              <TextField
                type="number"
                size="small"
                value={outputSize}
                onChange={(e) =>
                  setOutputSize(Math.max(28, Math.min(1000, Number(e.target.value) || 60)))
                }
                sx={{ width: 110 }}
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">B</InputAdornment> }
                }}
              />
            </Box>
            <Typography variant="h5" fontWeight="bold" color="#4caf50">
              {outputSize} bytes
            </Typography>
          </Box>
          <Box flex={1} minWidth={240} textAlign="center">
            <Typography variant="body1" sx={{ fontFamily: "monospace", mb: 0.5 }}>
              <Box component="span" color="#4caf50" fontWeight="bold">
                coinsPerUTxOByte
              </Box>
              {" × output bytes"}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              {coinsPerByte} × {outputSize} = {minADAL.toLocaleString()} lovelace
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="#f57c00">
              → min {minADA} ADA in this output
            </Typography>
          </Box>
        </Box>
      </ExampleBox>
    </Box>
  );
};

// ── Parameter metadata for detail view ────────────────────────────────────
interface ParamMeta {
  key: keyof TProtocolParam;
  label: string;
  description: string;
  unit?: string;
  category: string;
  lovelace?: boolean; // convert to ADA in detail view
}

const ALL_PARAMS: ParamMeta[] = [
  // Fees
  { key: "minFeeA",           category: "Transaction Fees",   label: "minFeeA",              unit: "lovelace/byte",  description: "Per-byte coefficient in the minimum fee formula: fee ≥ minFeeB + size × minFeeA" },
  { key: "minFeeB",           category: "Transaction Fees",   label: "minFeeB",              unit: "lovelace",       description: "Fixed base fee charged regardless of transaction size", lovelace: true },
  // Block limits
  { key: "maxBlockSize",      category: "Block Capacity",     label: "maxBlockSize",         unit: "bytes",          description: "Maximum total block body size" },
  { key: "maxBBSize",         category: "Block Capacity",     label: "maxBBSize",            unit: "bytes",          description: "Maximum block body size (transactions only)" },
  { key: "maxBHSize",         category: "Block Capacity",     label: "maxBHSize",            unit: "bytes",          description: "Maximum block header size" },
  { key: "maxTxSize",         category: "Block Capacity",     label: "maxTxSize",            unit: "bytes",          description: "Maximum size of a single transaction" },
  // Tx limits
  { key: "maxValSize",        category: "Transaction Limits", label: "maxValSize",           unit: "bytes",          description: "Maximum serialized size of the value field (ADA + multi-assets) in a UTxO" },
  { key: "maxCollateralInputs", category: "Transaction Limits", label: "maxCollateralInputs", unit: "inputs",        description: "Maximum number of UTxOs usable as collateral" },
  { key: "collateralPercent", category: "Transaction Limits", label: "collateralPercent",    unit: "%",              description: "Minimum collateral as a percentage of the script execution fee" },
  // Deposits
  { key: "keyDeposit",        category: "Deposits",           label: "keyDeposit",           unit: "lovelace",       description: "Refundable deposit to register a stake key", lovelace: true },
  { key: "poolDeposit",       category: "Deposits",           label: "poolDeposit",          unit: "lovelace",       description: "Refundable deposit to register a stake pool", lovelace: true },
  { key: "govActionDeposit",  category: "Deposits",           label: "govActionDeposit",     unit: "lovelace",       description: "Refundable deposit to submit a governance action", lovelace: true },
  { key: "drepDeposit",       category: "Deposits",           label: "drepDeposit",          unit: "lovelace",       description: "Refundable deposit to register as a DRep", lovelace: true },
  // Monetary expansion
  { key: "rho",               category: "Rewards & Treasury", label: "rho (ρ)",                                      description: "Monetary expansion rate — fraction of reserves distributed each epoch" },
  { key: "tau",               category: "Rewards & Treasury", label: "tau (τ)",                                      description: "Treasury growth rate — fraction of epoch rewards sent to the treasury" },
  { key: "minPoolCost",       category: "Rewards & Treasury", label: "minPoolCost",          unit: "lovelace",       description: "Minimum fixed fee a pool operator can charge per epoch", lovelace: true },
  // Staking
  { key: "nOpt",              category: "Pool Mechanics",     label: "k (nOpt)",                                     description: "Target number of stake pools — saturation point = totalStake / k" },
  { key: "a0",                category: "Pool Mechanics",     label: "a0",                                           description: "Pledge influence factor on pool rewards" },
  { key: "maxEpoch",          category: "Pool Mechanics",     label: "maxEpoch",             unit: "epochs",         description: "Maximum epochs in advance a pool retirement can be scheduled" },
  { key: "coinsPerUTxOByte",  category: "Pool Mechanics",     label: "coinsPerUTxOByte",     unit: "lovelace/byte",  description: "Minimum ADA per byte of UTxO serialized size" },
  // Script execution
  { key: "priceMem",          category: "Script Execution",   label: "priceMem",             unit: "lovelace/unit",  description: "Cost per memory unit consumed by a Plutus script" },
  { key: "priceStep",         category: "Script Execution",   label: "priceStep",            unit: "lovelace/unit",  description: "Cost per CPU step consumed by a Plutus script" },
  { key: "maxTxExMem",        category: "Script Execution",   label: "maxTxExMem",           unit: "mem units",      description: "Maximum memory units allowed per transaction" },
  { key: "maxTxExSteps",      category: "Script Execution",   label: "maxTxExSteps",         unit: "CPU steps",      description: "Maximum CPU steps allowed per transaction" },
  { key: "maxBlockExMem",     category: "Script Execution",   label: "maxBlockExMem",        unit: "mem units",      description: "Maximum total memory units for all scripts in a block" },
  { key: "maxBlockExSteps",   category: "Script Execution",   label: "maxBlockExSteps",      unit: "CPU steps",      description: "Maximum total CPU steps for all scripts in a block" },
  // Protocol version
  { key: "protocolMajor",     category: "Protocol Version",   label: "protocolMajor",                               description: "Current major protocol version — incrementing triggers a hard fork" },
  { key: "protocolMinor",     category: "Protocol Version",   label: "protocolMinor",                               description: "Current minor protocol version — incrementing is a soft fork" },
  // Governance
  { key: "govActionLifetime", category: "Governance",         label: "govActionLifetime",    unit: "epochs",         description: "How long a governance action remains open before expiring" },
  { key: "drepActivity",      category: "Governance",         label: "drepActivity",         unit: "epochs",         description: "Epochs a DRep can be inactive before their voting power expires" },
  { key: "ccMinSize",         category: "Governance",         label: "ccMinSize",                                    description: "Minimum number of Constitutional Committee members required" },
  { key: "ccMaxTermLength",   category: "Governance",         label: "ccMaxTermLength",      unit: "epochs",         description: "Maximum term length for a Constitutional Committee member" },
];

const DETAIL_CATEGORIES = Array.from(new Set(ALL_PARAMS.map((p) => p.category)));

// ── Detailed view ──────────────────────────────────────────────────────────
const DetailedView: React.FC<{ params: TProtocolParam }> = ({ params }) => {
  const theme = useTheme();

  const formatValue = (meta: ParamMeta): string => {
    const raw = params[meta.key];
    if (raw === undefined || raw === null || raw === "") return "—";
    if (typeof raw === "object") return JSON.stringify(raw);
    const num = Number(raw);
    if (!isNaN(num)) return num.toLocaleString();
    return String(raw);
  };

  const formatADA = (meta: ParamMeta): string | null => {
    if (!meta.lovelace) return null;
    const raw = params[meta.key];
    if (raw === undefined || raw === null || raw === "") return null;
    const lovelace = Number(raw);
    if (isNaN(lovelace)) return null;
    return (lovelace / LOVELACE).toLocaleString(undefined, { maximumFractionDigits: 6 }) + " ADA";
  };

  return (
    <Box>
      {DETAIL_CATEGORIES.map((category) => {
        const categoryParams = ALL_PARAMS.filter(
          (p) => p.category === category && params[p.key] !== undefined && params[p.key] !== null
        );
        if (categoryParams.length === 0) return null;
        return (
          <Box key={category} mb={4}>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              color="primary"
              mb={1}
            >
              {category}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: "bold", width: 200 }}>Parameter</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: "bold", width: 100 }}>Unit</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", width: 160 }}>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categoryParams.map((meta) => {
                    const ada = formatADA(meta);
                    return (
                      <TableRow key={meta.key} hover>
                        <TableCell sx={{ fontFamily: "monospace", fontWeight: "bold", fontSize: "0.8rem", color: theme.palette.primary.main }}>
                          {meta.label}
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
                          {meta.description}
                        </TableCell>
                        <TableCell sx={{ color: "text.disabled", fontSize: "0.75rem" }}>
                          {meta.unit ?? "—"}
                        </TableCell>
                        <TableCell align="right">
                          <Box>
                            <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: "monospace" }}>
                              {formatValue(meta)}
                            </Typography>
                            {ada && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {ada}
                              </Typography>
                            )}
                          </Box>
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

// ── Tabs config ────────────────────────────────────────────────────────────
const TABS = [
  { label: "Transaction Fees", key: "fees" },
  { label: "Block Capacity", key: "block" },
  { label: "Deposits", key: "deposits" },
  { label: "Rewards & Treasury", key: "rewards" },
  { label: "Pool Mechanics", key: "pools" },
  { label: "Script Execution", key: "scripts" },
  { label: "Governance", key: "gov" },
  { label: "Network / UTxO", key: "network" }
];

// ── Main Page ──────────────────────────────────────────────────────────────
const ProtocolParameters: React.FC = () => {
  const [params, setParams] = useState<TProtocolParam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [viewMode, setViewMode] = useState<"visual" | "detail">("visual");

  useEffect(() => {
    document.title = "Protocol Parameters | Phoenix Explorer";
    ApiConnector.getApiConnector()
      .getCurrentProtocolParameters()
      .then((r) => {
        if (r.data) setParams(r.data);
        else setError(r.error ?? "Failed to load parameters");
      })
      .catch(() => setError("Failed to load protocol parameters"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container maxWidth="lg" sx={{ pt: 3, pb: 6 }}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" component="h1">
            Protocol Parameters
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Live Cardano network parameters with interactive simulations — explore how each parameter
            shapes the blockchain.
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => { if (v) setViewMode(v); }}
          size="small"
          sx={{ alignSelf: "center" }}
        >
          <ToggleButton value="visual" aria-label="visual view">
            <MdGridView size={18} />
            <Box component="span" ml={0.5} sx={{ display: { xs: "none", sm: "inline" } }}>Visual</Box>
          </ToggleButton>
          <ToggleButton value="detail" aria-label="detail view">
            <MdTableRows size={18} />
            <Box component="span" ml={0.5} sx={{ display: { xs: "none", sm: "inline" } }}>All Parameters</Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading && (
        <Box display="flex" flexDirection="column" gap={2}>
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={200} />
          <Skeleton variant="rounded" height={220} />
        </Box>
      )}

      {error && (
        <Typography color="error" mt={2}>
          {error}
        </Typography>
      )}

      {params && !loading && viewMode === "detail" && (
        <DetailedView params={params} />
      )}

      {params && !loading && viewMode === "visual" && (
        <>
          <Paper variant="outlined" sx={{ mb: 3 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: "divider" }}
            >
              {TABS.map((t, i) => (
                <Tab key={t.key} label={t.label} id={`pp-tab-${i}`} />
              ))}
            </Tabs>
          </Paper>

          <Box>
            {tab === 0 && <FeeSection p={params} />}
            {tab === 1 && <BlockCapacitySection p={params} />}
            {tab === 2 && <DepositsSection p={params} />}
            {tab === 3 && <RewardsSection p={params} />}
            {tab === 4 && <PoolMechanicsSection p={params} />}
            {tab === 5 && <ScriptSection p={params} />}
            {tab === 6 && <GovernanceSection p={params} />}
            {tab === 7 && <NetworkSection p={params} />}
          </Box>
        </>
      )}
    </Container>
  );
};

export default ProtocolParameters;
