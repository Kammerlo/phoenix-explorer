import { useCallback, useEffect, useState } from "react";
import { Box, Paper, Skeleton, ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
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
  /** How many recent blocks to fetch */
  fetchSize: number;
  /** How many blocks per aggregation bucket (1 = per-block) */
  groupSize: number;
}

// Range controls aggregation granularity over the most-recent N blocks.
// Time-based filtering is intentionally avoided: it produces empty results
// when fetchSize covers less time than the selected range (which is always
// true on any network — 500 blocks ≈ 2.8 h, not 7 days).
const RANGES: Record<RangeKey, RangeCfg> = {
  "1D": { label: "Day",   fetchSize: 100, groupSize: 1  },
  "1W": { label: "Week",  fetchSize: 200, groupSize: 5  },
  "1M": { label: "Month", fetchSize: 400, groupSize: 20 },
  "1Y": { label: "Year",  fetchSize: 600, groupSize: 50 },
};

interface ChartDatum {
  label: string;
  txs: number;
  fill: number;      // average fill % (0–100)
  blockNo?: number;  // set only for per-block view (1D)
}

function blockLabel(blocks: Block[], groupSize: number, groupIndex: number): string {
  const first = blocks[groupIndex * groupSize];
  const last  = blocks[Math.min((groupIndex + 1) * groupSize - 1, blocks.length - 1)];
  if (!first) return "";
  if (groupSize === 1) return `#${first.blockNo}`;
  return `#${first.blockNo}–${last.blockNo}`;
}

// ─── ActivityChart ────────────────────────────────────────────────────────────

const ActivityChart: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeKey>("1D");
  const [chartData, setChartData] = useState<ChartDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockCount, setBlockCount] = useState(0);

  const fetchChartData = useCallback(async (selectedRange: RangeKey) => {
    setLoading(true);
    try {
      const cfg = RANGES[selectedRange];
      const res = await ApiConnector.getApiConnector().getBlocksPage({
        page: "1",
        size: String(cfg.fetchSize),
        skipMeta: "true",
      });
      const blocks: Block[] = (res.data ?? []).slice().reverse(); // oldest → newest
      setBlockCount(blocks.length);

      if (cfg.groupSize === 1) {
        // Per-block view
        setChartData(
          blocks.map((b) => ({
            label: `#${b.blockNo}`,
            txs: b.txCount ?? 0,
            fill: b.size != null ? Math.round((b.size / BLOCK_MAX_SIZE) * 100) : 0,
            blockNo: b.blockNo,
          }))
        );
      } else {
        // Aggregated view — group into buckets of groupSize blocks
        const groups: ChartDatum[] = [];
        for (let i = 0; i < blocks.length; i += cfg.groupSize) {
          const slice = blocks.slice(i, i + cfg.groupSize);
          const txs  = slice.reduce((sum, b) => sum + (b.txCount ?? 0), 0);
          const fills = slice.filter((b) => b.size != null).map((b) => Math.round(((b.size ?? 0) / BLOCK_MAX_SIZE) * 100));
          const fill  = fills.length > 0 ? Math.round(fills.reduce((a, v) => a + v, 0) / fills.length) : 0;
          const first = slice[0];
          const last  = slice[slice.length - 1];
          groups.push({
            label: `#${first.blockNo}–${last.blockNo}`,
            txs,
            fill,
          });
        }
        setChartData(groups);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChartData(range);
  }, [range, fetchChartData]);

  const handleRangeChange = (_: React.MouseEvent, v: string | null) => {
    if (v) setRange(v as RangeKey);
  };

  const handleChartClick = (data: any) => {
    if (range === "1D" && data?.activePayload?.[0]?.payload?.blockNo) {
      navigate(details.block(data.activePayload[0].payload.blockNo));
    }
  };

  const xAxisInterval = chartData.length > 16 ? Math.floor(chartData.length / 8) : "preserveStartEnd";
  const borderColor = theme.isDark
    ? alpha(theme.palette.secondary.light, 0.1)
    : theme.palette.primary[200] || "#e0e0e0";

  const fillLineColor = theme.palette.warning?.main ?? "#F59E0B";
  const txBarColor    = theme.palette.primary.main;

  const subtitle = !loading && blockCount > 0
    ? `Last ${blockCount} blocks${RANGES[range].groupSize > 1 ? `, grouped by ${RANGES[range].groupSize}` : ""}`
    : undefined;

  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${borderColor}`, background: theme.palette.secondary[0], mb: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={600}>Network Activity</Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          )}
        </Box>
        <ToggleButtonGroup
          value={range}
          exclusive
          size="small"
          onChange={handleRangeChange}
          sx={{ "& .MuiToggleButton-root": { px: 1.5, py: 0.4, fontSize: "0.72rem", fontWeight: 600 } }}
        >
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <ToggleButton key={k} value={k}>{RANGES[k].label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Chart */}
      {loading ? (
        <Skeleton variant="rounded" height={200} />
      ) : chartData.length === 0 ? (
        <Box display="flex" alignItems="center" justifyContent="center" height={200}>
          <Typography variant="body2" color="text.secondary">No data available</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart
            data={chartData}
            margin={{ top: 4, right: 48, left: -12, bottom: 0 }}
            onClick={handleChartClick}
            style={{ cursor: range === "1D" ? "pointer" : "default" }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={alpha(borderColor, 0.7)}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: theme.palette.text.secondary as string }}
              axisLine={false}
              tickLine={false}
              interval={xAxisInterval as any}
            />
            {/* Left axis — transaction count */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: theme.palette.text.secondary as string }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={38}
            />
            {/* Right axis — fill percentage */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: theme.palette.text.secondary as string }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              width={38}
            />
            <RechartsTooltip
              contentStyle={{
                background: theme.palette.secondary[0],
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) =>
                name === "Block Fill %" ? [`${value}%`, name] : [value.toLocaleString(), name]
              }
            />
            <Legend wrapperStyle={{ fontSize: "0.72rem", paddingTop: 8 }} iconSize={10} />

            {/* Transactions — bars on left axis */}
            <Bar
              yAxisId="left"
              dataKey="txs"
              name="Transactions"
              fill={txBarColor}
              fillOpacity={0.85}
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
              minPointSize={2}
            />

            {/* Block fill % — line on right axis */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="fill"
              name="Block Fill %"
              stroke={fillLineColor}
              strokeWidth={2}
              dot={chartData.length <= 60 ? { r: 2.5, fill: fillLineColor, strokeWidth: 0 } : false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
};

export default ActivityChart;
