import { useMemo, useState } from "react";
import { Box, Chip, Divider, LinearProgress, ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useTranslation } from "react-i18next";

import { VoteData, VoteType } from "@shared/dtos/GovernanceOverview";

interface Props {
  voteData: VoteData;
}

type FilterType = "all" | VoteType;

const VOTER_LABELS: Record<VoteType, string> = {
  committee: "Committee",
  drep: "DRep",
  spo: "SPO",
};

function VoterTypePanel({
  label,
  votes,
  compact = false,
}: {
  label: string;
  votes: { yes: number; no: number; abstain: number } | undefined;
  compact?: boolean;
}) {
  const theme = useTheme();
  if (!votes) return null;
  const total = votes.yes + votes.no + votes.abstain;
  const yesPct = total > 0 ? (votes.yes / total) * 100 : 0;
  const noPct = total > 0 ? (votes.no / total) * 100 : 0;
  const abstainPct = total > 0 ? (votes.abstain / total) * 100 : 0;

  return (
    <Box
      sx={{
        p: compact ? 1.5 : 2,
        border: `1px solid ${theme.palette.primary[200] || theme.palette.divider}`,
        borderRadius: 2,
        flex: 1,
        minWidth: 0,
      }}
    >
      <Typography
        variant="caption"
        fontWeight={700}
        sx={{ color: theme.palette.secondary.light, textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1 }}
      >
        {label}
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Box sx={{ textAlign: "center", flex: 1 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.success.main, lineHeight: 1.2 }}>
            {votes.yes}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.secondary.light }}>Yes</Typography>
        </Box>
        <Box sx={{ textAlign: "center", flex: 1 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.error.main, lineHeight: 1.2 }}>
            {votes.no}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.secondary.light }}>No</Typography>
        </Box>
        <Box sx={{ textAlign: "center", flex: 1 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.warning.main, lineHeight: 1.2 }}>
            {votes.abstain}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.secondary.light }}>Abstain</Typography>
        </Box>
      </Box>

      {total > 0 && (
        <Box sx={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", mt: 1.5 }}>
          {yesPct > 0 && (
            <Box sx={{ width: `${yesPct}%`, bgcolor: theme.palette.success.main }} />
          )}
          {noPct > 0 && (
            <Box sx={{ width: `${noPct}%`, bgcolor: theme.palette.error.main }} />
          )}
          {abstainPct > 0 && (
            <Box sx={{ width: `${abstainPct}%`, bgcolor: theme.palette.warning.main }} />
          )}
        </Box>
      )}

      <Typography variant="caption" sx={{ color: theme.palette.secondary.light, mt: 0.5, display: "block" }}>
        {total} total
      </Typography>
    </Box>
  );
}

export default function VoteChart({ voteData }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [filter, setFilter] = useState<FilterType>("all");

  const aggregated = useMemo(() => {
    if (!voteData) return { yes: 0, no: 0, abstain: 0 };
    if (filter === "all") {
      return {
        yes: (voteData.committee?.yes || 0) + (voteData.drep?.yes || 0) + (voteData.spo?.yes || 0),
        no: (voteData.committee?.no || 0) + (voteData.drep?.no || 0) + (voteData.spo?.no || 0),
        abstain: (voteData.committee?.abstain || 0) + (voteData.drep?.abstain || 0) + (voteData.spo?.abstain || 0),
      };
    }
    const v = voteData[filter as VoteType];
    return { yes: v?.yes || 0, no: v?.no || 0, abstain: v?.abstain || 0 };
  }, [filter, voteData]);

  const totalVotes = aggregated.yes + aggregated.no + aggregated.abstain;

  const chartOptions: Highcharts.Options = useMemo(() => ({
    chart: {
      type: "pie",
      backgroundColor: "transparent",
      height: 220,
      margin: [0, 0, 40, 0],
    },
    title: { text: undefined },
    tooltip: {
      pointFormat: "<b>{point.y}</b> ({point.percentage:.1f}%)",
      backgroundColor: theme.palette.secondary[0],
      borderColor: theme.palette.primary[200],
      style: { color: theme.palette.secondary.main },
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: "pointer",
        dataLabels: { enabled: false },
        showInLegend: true,
        innerSize: "55%",
      },
    },
    legend: {
      align: "center",
      verticalAlign: "bottom",
      itemStyle: { color: theme.palette.secondary.main, fontSize: "12px", fontWeight: "400" },
    },
    series: [
      {
        type: "pie",
        name: "Votes",
        data: [
          { name: "Yes", y: aggregated.yes, color: theme.palette.success.main },
          { name: "No", y: aggregated.no, color: theme.palette.error.main },
          { name: "Abstain", y: aggregated.abstain, color: theme.palette.warning.main },
        ].filter((d) => d.y > 0),
      },
    ],
    credits: { enabled: false },
  }), [aggregated, theme]);

  if (!voteData) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
      <Box sx={{ fontSize: "18px", fontWeight: 700, color: theme.palette.secondary.main }}>
        Vote Distribution
      </Box>

      {/* Filter tabs */}
      <ToggleButtonGroup
        value={filter}
        exclusive
        onChange={(_e, v) => { if (v !== null) setFilter(v); }}
        size="small"
        sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontSize: "12px", px: 1.5, py: 0.5 } }}
      >
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="committee">Committee</ToggleButton>
        <ToggleButton value="drep">DRep</ToggleButton>
        <ToggleButton value="spo">SPO</ToggleButton>
      </ToggleButtonGroup>

      {/* Donut chart */}
      {totalVotes > 0 ? (
        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
      ) : (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 220,
            color: theme.palette.secondary.light,
            fontSize: "14px",
          }}
        >
          No votes recorded yet
        </Box>
      )}

      <Divider />

      {/* Per-voter-type breakdown panels */}
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
        <VoterTypePanel label="Committee" votes={voteData.committee} compact />
        <VoterTypePanel label="DRep" votes={voteData.drep} compact />
        <VoterTypePanel label="SPO" votes={voteData.spo} compact />
      </Box>
    </Box>
  );
}
