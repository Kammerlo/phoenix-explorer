import { Box, Chip, Grid, Paper, Typography, useTheme } from "@mui/material";
import BigNumber from "bignumber.js";
import { format } from "date-fns";
import { FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TooltipProps } from "recharts/types/component/Tooltip";

import { formatNumberDivByDecimals, formatPrice } from "src/commons/utils/helper";
import { TooltipBody } from "src/components/commons/Layout/styles";

import {
  BoxInfo,
  BoxInfoItem,
  BoxInfoItemRight,
  ChartBox,
  SkeletonUI,
  Tab,
  Tabs,
  Title,
  TooltipLabel,
  TooltipValue,
  ValueInfo,
  Wrapper,
} from "./styles";
import { ITokenOverview } from "@shared/dtos/token.dto";

interface ITokenAnalyticsProps {
  dataToken?: ITokenOverview | null;
  loading?: boolean;
}

type ChartMode = "supply" | "activity";

const safeFormat = (ms: number, fmt: string, fallback = "") => {
  try {
    const d = new Date(ms);
    return isNaN(d.getTime()) ? fallback : format(d, fmt);
  } catch {
    return fallback;
  }
};

const TokenAnalytics: FC<ITokenAnalyticsProps> = ({ dataToken, loading }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [chartMode, setChartMode] = useState<ChartMode>("supply");

  const decimals = dataToken?.metadata?.decimals || 0;

  const chartData = useMemo(
    () =>
      (dataToken?.analytics || [])
        .filter((item) => item.date && !isNaN(item.date))
        .map((item) => ({
          date: item.date * 1000,
          value: item.value || 0,
          mintAmount: item.mintAmount || 0,
          burnAmount: item.burnAmount || 0,
        })),
    [dataToken?.analytics]
  );

  const stats = useMemo(() => {
    const totalMinted = (dataToken?.analytics || []).reduce(
      (acc, item) => acc + (item.mintAmount || 0),
      0
    );
    const totalBurned = (dataToken?.analytics || []).reduce(
      (acc, item) => acc + (item.burnAmount || 0),
      0
    );
    const largestMint = Math.max(0, ...(dataToken?.analytics || []).map((i) => i.mintAmount || 0));
    const largestBurn = Math.max(0, ...(dataToken?.analytics || []).map((i) => i.burnAmount || 0));
    const values = (dataToken?.analytics || []).map((i) => i.value || 0);
    const maxSupply = BigNumber.max(0, ...values).toNumber();
    const minSupply = values.length > 0 ? BigNumber.min(maxSupply, ...values).toNumber() : 0;
    return { totalMinted, totalBurned, largestMint, largestBurn, maxSupply, minSupply };
  }, [dataToken?.analytics]);

  const formatPriceValue = (value: number) =>
    formatPrice(
      new BigNumber(value)
        .div(new BigNumber(10).exponentiatedBy(decimals))
        .toString()
    );

  const renderSupplyTooltip: TooltipProps<number, string>["content"] = (content) => (
    <TooltipBody fontSize="12px">
      <TooltipLabel>{safeFormat(content.label, "dd MMM yyyy HH:mm")}</TooltipLabel>
      <TooltipValue>
        {formatNumberDivByDecimals(content.payload?.[0]?.value, decimals) || 0}
      </TooltipValue>
    </TooltipBody>
  );

  const renderActivityTooltip: TooltipProps<number, string>["content"] = (content) => {
    const minted = content.payload?.find((p) => p.dataKey === "mintAmount")?.value || 0;
    const burned = content.payload?.find((p) => p.dataKey === "burnAmount")?.value || 0;
    return (
      <TooltipBody fontSize="12px">
        <TooltipLabel>{safeFormat(content.label, "dd MMM yyyy")}</TooltipLabel>
        {minted > 0 && (
          <Box display="flex" gap={1} alignItems="center">
            <Box
              sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: theme.palette.success.main }}
            />
            <TooltipValue sx={{ color: theme.palette.success.main }}>
              +{formatNumberDivByDecimals(minted, decimals)} minted
            </TooltipValue>
          </Box>
        )}
        {burned > 0 && (
          <Box display="flex" gap={1} alignItems="center">
            <Box
              sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: theme.palette.error.main }}
            />
            <TooltipValue sx={{ color: theme.palette.error.main }}>
              -{formatNumberDivByDecimals(burned, decimals)} burned
            </TooltipValue>
          </Box>
        )}
      </TooltipBody>
    );
  };

  const hasBurnData = stats.totalBurned > 0;

  return (
    <Paper sx={{ borderRadius: 2, p: 3, mt: 2 }} elevation={0} variant="outlined">
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h6" fontWeight={700}>
          {t("analytics")}
        </Typography>
        <Box display="flex" gap={1}>
          <Chip
            label="Supply"
            size="small"
            variant={chartMode === "supply" ? "filled" : "outlined"}
            color={chartMode === "supply" ? "primary" : "default"}
            onClick={() => setChartMode("supply")}
            sx={{ cursor: "pointer" }}
          />
          <Chip
            label="Mint & Burn"
            size="small"
            variant={chartMode === "activity" ? "filled" : "outlined"}
            color={chartMode === "activity" ? "primary" : "default"}
            onClick={() => setChartMode("activity")}
            sx={{ cursor: "pointer" }}
          />
        </Box>
      </Box>

      <Wrapper container columns={24} spacing="24px">
        {/* Chart area */}
        <Grid size={{ xs: 24, lg: 17 }}>
          <ChartBox>
            {loading || !dataToken?.analytics ? (
              <SkeletonUI variant="rectangular" style={{ height: "375px", display: "block" }} />
            ) : chartMode === "supply" ? (
              <ResponsiveContainer width="100%" height={380}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 14 }}>
                  <defs>
                    <linearGradient id="supplyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={theme.palette.primary.main}
                        stopOpacity={theme.isDark ? 0.6 : 0.25}
                      />
                      <stop
                        offset="100%"
                        stopColor={theme.palette.primary.main}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeWidth={0.33} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(tick) => safeFormat(tick, "MMM dd", "")}
                    tickLine={false}
                    tickMargin={5}
                    dx={-15}
                    color={theme.palette.secondary.light}
                  />
                  <YAxis
                    tickFormatter={formatPriceValue}
                    tickLine={false}
                    color={theme.palette.secondary.light}
                  />
                  <Tooltip content={renderSupplyTooltip} cursor={false} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Supply"
                    stroke={theme.palette.primary.main}
                    strokeWidth={2.5}
                    fill="url(#supplyGrad)"
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 14 }}>
                  <CartesianGrid vertical={false} strokeWidth={0.33} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(tick) => safeFormat(tick, "MMM dd", "")}
                    tickLine={false}
                    tickMargin={5}
                    dx={-15}
                    color={theme.palette.secondary.light}
                  />
                  <YAxis
                    tickFormatter={formatPriceValue}
                    tickLine={false}
                    color={theme.palette.secondary.light}
                  />
                  <Tooltip content={renderActivityTooltip} cursor={{ fill: "transparent" }} />
                  <Legend
                    formatter={(value) =>
                      value === "mintAmount" ? "Minted" : "Burned"
                    }
                  />
                  <Bar
                    dataKey="mintAmount"
                    name="mintAmount"
                    fill={theme.palette.success.main}
                    opacity={0.85}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={40}
                  />
                  {hasBurnData && (
                    <Bar
                      dataKey="burnAmount"
                      name="burnAmount"
                      fill={theme.palette.error.main}
                      opacity={0.85}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={40}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </ChartBox>
        </Grid>

        {/* Stats sidebar */}
        <Grid size={{ xs: 24, lg: 7 }}>
          <BoxInfo height="100%" space={0}>
            <Box flex={1}>
              <BoxInfoItemRight display="flex" justifyContent="center">
                <Box width="100%">
                  <Title sx={{ mb: 1, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Total Minted
                  </Title>
                  <ValueInfo>
                    {loading ? (
                      <SkeletonUI variant="rectangular" />
                    ) : (
                      <Typography
                        fontWeight={700}
                        sx={{ color: theme.palette.success.main, fontFamily: "monospace", fontSize: "1rem" }}
                      >
                        +{formatNumberDivByDecimals(stats.totalMinted, decimals)}
                      </Typography>
                    )}
                  </ValueInfo>
                </Box>
              </BoxInfoItemRight>
            </Box>

            {hasBurnData && (
              <Box flex={1}>
                <BoxInfoItem display="flex" justifyContent="center">
                  <Box width="100%">
                    <Title sx={{ mb: 1, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Total Burned
                    </Title>
                    <ValueInfo>
                      {loading ? (
                        <SkeletonUI variant="rectangular" />
                      ) : (
                        <Typography
                          fontWeight={700}
                          sx={{ color: theme.palette.error.main, fontFamily: "monospace", fontSize: "1rem" }}
                        >
                          -{formatNumberDivByDecimals(stats.totalBurned, decimals)}
                        </Typography>
                      )}
                    </ValueInfo>
                  </Box>
                </BoxInfoItem>
              </Box>
            )}

            <Box flex={1}>
              <BoxInfoItem display="flex" justifyContent="center">
                <Box width="100%">
                  <Title sx={{ mb: 1, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Peak Supply
                  </Title>
                  <ValueInfo>
                    {loading ? (
                      <SkeletonUI variant="rectangular" />
                    ) : (
                      formatNumberDivByDecimals(stats.maxSupply, decimals)
                    )}
                  </ValueInfo>
                </Box>
              </BoxInfoItem>
            </Box>

            {stats.largestMint > 0 && (
              <Box flex={1}>
                <BoxInfoItem display="flex" justifyContent="center">
                  <Box width="100%">
                    <Title sx={{ mb: 1, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Largest Single Mint
                    </Title>
                    <ValueInfo>
                      {loading ? (
                        <SkeletonUI variant="rectangular" />
                      ) : (
                        <Typography
                          fontWeight={600}
                          sx={{ fontFamily: "monospace", fontSize: "0.9rem" }}
                        >
                          {formatNumberDivByDecimals(stats.largestMint, decimals)}
                        </Typography>
                      )}
                    </ValueInfo>
                  </Box>
                </BoxInfoItem>
              </Box>
            )}
          </BoxInfo>
        </Grid>
      </Wrapper>
    </Paper>
  );
};

export default TokenAnalytics;
