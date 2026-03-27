import { useCallback, useEffect, useState } from "react";
import { Box, Paper, Skeleton, ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BLOCK_MAX_SIZE } from "src/components/commons/BlockFillBar";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { Block } from "@shared/dtos/block.dto";
import { details } from "src/commons/routers";

// ─── Types ────────────────────────────────────────────────────────────────────

type RangeKey = "1D" | "1W" | "1M" | "1Y";

interface RangeCfg {
  label: string;
  rangeMs: number;
  bucketMs: number;
  fetchSize: number;
}

const RANGES: Record<RangeKey, RangeCfg> = {
  "1D": { label: "Day",   rangeMs: 86_400_000,       bucketMs: 0,               fetchSize: 100  },
  "1W": { label: "Week",  rangeMs: 7 * 86_400_000,   bucketMs: 86_400_000,      fetchSize: 500  },
  "1M": { label: "Month", rangeMs: 30 * 86_400_000,  bucketMs: 3 * 86_400_000,  fetchSize: 1000 },
  "1Y": { label: "Year",  rangeMs: 365 * 86_400_000, bucketMs: 30 * 86_400_000, fetchSize: 2000 },
};

interface ChartDatum {
  label: string;
  txs: number;
  fill: number;
  blockNo?: number;
}

function formatBucketLabel(ts: number, bucketMs: number): string {
  const d = new Date(ts);
  if (bucketMs >= 30 * 86_400_000) return d.toLocaleDateString(undefined, { month: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── ActivityChart ────────────────────────────────────────────────────────────

const ActivityChart: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeKey>("1D");
  const [chartData, setChartData] = useState<ChartDatum[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = RANGES[range];
      const res = await ApiConnector.getApiConnector().getBlocksPage({ page: "1", size: String(cfg.fetchSize) });
      const blocks: Block[] = res.data ?? [];
      const cutoff = Date.now() - cfg.rangeMs;
      const filtered = blocks.filter((b) => Number(b.time) * 1000 >= cutoff);

      if (cfg.bucketMs === 0) {
        setChartData(
          [...filtered]
            .sort((a, b) => a.blockNo - b.blockNo)
            .map((b) => ({
              label: `#${b.blockNo}`,
              txs: b.txCount,
              fill: Math.round(((b.size ?? 0) / BLOCK_MAX_SIZE) * 100),
              blockNo: b.blockNo,
            }))
        );
      } else {
        const buckets = new Map<number, { txs: number; fills: number[] }>();
        for (const b of filtered) {
          const key = Math.floor((Number(b.time) * 1000) / cfg.bucketMs) * cfg.bucketMs;
          const entry = buckets.get(key) ?? { txs: 0, fills: [] };
          entry.txs += b.txCount;
          entry.fills.push(Math.round(((b.size ?? 0) / BLOCK_MAX_SIZE) * 100));
          buckets.set(key, entry);
        }
        setChartData(
          Array.from(buckets.entries())
            .sort(([a], [b]) => a - b)
            .map(([ts, { txs, fills }]) => ({
              label: formatBucketLabel(ts, cfg.bucketMs),
              txs,
              fill: fills.length > 0 ? Math.round(fills.reduce((a, b) => a + b, 0) / fills.length) : 0,
            }))
        );
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchChartData(); }, [fetchChartData]);

  const handleChartClick = (data: any) => {
    if (range === "1D" && data?.activePayload?.[0]?.payload?.blockNo) {
      navigate(details.block(data.activePayload[0].payload.blockNo));
    }
  };

  const xAxisInterval = chartData.length > 20 ? Math.floor(chartData.length / 8) : "preserveStartEnd";
  const borderColor = theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e0e0e0";

  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${borderColor}`, background: theme.palette.secondary[0], mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h6" fontWeight={600}>Network Activity</Typography>
        <ToggleButtonGroup
          value={range} exclusive size="small"
          onChange={(_, v) => v && setRange(v as RangeKey)}
          sx={{ "& .MuiToggleButton-root": { px: 1.5, py: 0.4, fontSize: "0.72rem", fontWeight: 600 } }}
        >
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <ToggleButton key={k} value={k}>{RANGES[k].label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Skeleton variant="rounded" height={180} />
      ) : chartData.length === 0 ? (
        <Box display="flex" alignItems="center" justifyContent="center" height={180}>
          <Typography variant="body2" color="text.secondary">No data for this range</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart
            data={chartData}
            margin={{ top: 4, right: 44, left: -16, bottom: 0 }}
            onClick={handleChartClick}
            style={{ cursor: range === "1D" ? "pointer" : "default" }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={alpha(borderColor, 0.6)} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} interval={xAxisInterval as any} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} width={36} />
            <RechartsTooltip
              contentStyle={{ background: theme.palette.secondary[0], border: `1px solid ${borderColor}`, borderRadius: 8, fontSize: 12 }}
              formatter={(value: number, name: string) => name === "Block Fill %" ? [`${value}%`, name] : [value, name]}
            />
            <Legend wrapperStyle={{ fontSize: "0.72rem", paddingTop: 8 }} iconSize={10} />
            <Bar yAxisId="left" dataKey="txs" name="Transactions" fill={theme.palette.primary.main} radius={[3, 3, 0, 0]} maxBarSize={24} />
            <Bar yAxisId="right" dataKey="fill" name="Block Fill %" fill={alpha(theme.palette.warning?.main ?? "#F59E0B", 0.65)} radius={[3, 3, 0, 0]} maxBarSize={24} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
};

export default ActivityChart;
