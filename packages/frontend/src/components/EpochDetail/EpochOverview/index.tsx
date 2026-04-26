import React from "react";
import { Box, Chip, LinearProgress, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { differenceInSeconds } from "date-fns";

import {
  CubeIconComponent,
  ExchageAltIcon,
  ExchageIcon,
  OutputIcon,
  RewardIconComponent,
  SlotIcon,
  TimeIconComponent,
  DropIconComponent
} from "src/commons/resources";
import { MAX_SLOT_EPOCH, EPOCH_STATUS } from "src/commons/utils/constants";
import { formatADA, formatDateTimeLocal } from "src/commons/utils/helper";
import ADAicon from "src/components/commons/ADAIcon";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import DetailHeader from "src/components/commons/DetailHeader";
import { EpochOverview, EpochStatus } from "@shared/dtos/epoch.dto";

import { TitleCard } from "./styles";

interface EpochOverviewProps {
  data: EpochOverview | null | undefined;
  loading: boolean;
  lastUpdated?: number;
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status || status === EPOCH_STATUS.FINISHED) return null;
  const meta =
    status === EPOCH_STATUS.IN_PROGRESS ? { label: "In Progress", color: "success" as const } :
    status === EPOCH_STATUS.REWARDING   ? { label: "Rewarding",   color: "warning" as const } :
    status === EPOCH_STATUS.SYNCING     ? { label: "Syncing",     color: "primary" as const } :
    null;
  if (!meta) return null;
  return (
    <Chip
      label={meta.label}
      color={meta.color}
      size="small"
      sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700, ml: 1, "& .MuiChip-label": { px: 1 } }}
    />
  );
}

// ─── Progress tile value ──────────────────────────────────────────────────────

function EpochProgressValue({ data, slot }: { data: EpochOverview; slot: number }) {
  const theme = useTheme();
  const isActive = (data.status as string) === EPOCH_STATUS.IN_PROGRESS;
  const pct = data.status === EpochStatus.FINISHED ? 100 : Math.min(100, data.syncingProgress ?? 0);

  const barColor =
    (data.status as string) === EPOCH_STATUS.IN_PROGRESS ? theme.palette.success.main :
    (data.status as string) === EPOCH_STATUS.REWARDING   ? theme.palette.warning.main :
    theme.palette.primary.main;

  return (
    <Box sx={{ minWidth: 160 }}>
      <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={0.75}>
        <Box sx={{ fontSize: "0.82rem", fontWeight: 700, color: barColor }}>
          {pct.toFixed(1)}%
        </Box>
        <Box sx={{ fontSize: "0.72rem", color: "secondary.light" }}>
          {isActive ? `Slot ${slot.toLocaleString()} / ${MAX_SLOT_EPOCH.toLocaleString()}` : `${MAX_SLOT_EPOCH.toLocaleString()} slots`}
        </Box>
      </Box>
      <Box
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: theme.isDark
            ? alpha(theme.palette.secondary.light, 0.12)
            : alpha(theme.palette.secondary.light, 0.15),
          overflow: "hidden"
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 4,
            background: `linear-gradient(90deg, ${alpha(barColor, 0.7)} 0%, ${barColor} 100%)`,
            transition: "width 0.5s ease"
          }}
        />
      </Box>
    </Box>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const EpochOverviewView: React.FC<EpochOverviewProps> = ({ data, loading, lastUpdated }) => {
  const { t } = useTranslation();
  const slot = data?.epochSlotNo ?? 0;

  const isFinished = !data || differenceInSeconds(new Date(data.endTime || ""), new Date()) <= 0;

  const listOverview = [
    {
      icon: SlotIcon,
      title: (
        <Box display="flex" alignItems="center">
          <TitleCard mr={1}>Progress</TitleCard>
        </Box>
      ),
      value: data ? <EpochProgressValue data={data} slot={slot} /> : <Box sx={{ color: "secondary.light" }}>—</Box>
    },
    {
      icon: TimeIconComponent,
      title: (
        <Box display="flex" alignItems="center">
          <TitleCard data-testId="epoch.overview.startTimeTitle" mr={1}>
            {t("glossary.startTimestamp")}
          </TitleCard>
        </Box>
      ),
      value: (
        <DatetimeTypeTooltip>
          <Box display="inline" data-testId="epoch.overview.startTimeValue">
            {formatDateTimeLocal(data?.startTime || "")}
          </Box>
        </DatetimeTypeTooltip>
      )
    },
    {
      icon: TimeIconComponent,
      title: (
        <Box display="flex" alignItems="center">
          <TitleCard data-testId="epoch.overview.endTimeTitle" mr={1}>
            {t("glossary.endTimestamp")}
          </TitleCard>
        </Box>
      ),
      value: (
        <DatetimeTypeTooltip>
          <Box display="inline" data-testId="epoch.overview.endTimeValue">
            {formatDateTimeLocal(data?.endTime || "")}
          </Box>
        </DatetimeTypeTooltip>
      )
    },
    {
      icon: CubeIconComponent,
      title: (
        <Box display="flex" alignItems="center">
          <TitleCard data-testId="epoch.overview.blocksTitle" mr={1}>
            {t("glossary.blocks")}
          </TitleCard>
        </Box>
      ),
      value: (
        <Box sx={{ fontWeight: 700, fontSize: "1rem" }} data-testId="epoch.overview.blocksValue">
          {data?.blkCount?.toLocaleString() ?? "—"}
        </Box>
      )
    },
    {
      icon: ExchageIcon,
      title: (
        <Box display="flex" alignItems="center">
          <TitleCard data-testId="epoch.overview.txCountTitle" mr={1}>
            {t("glossary.transactionCount")}
          </TitleCard>
        </Box>
      ),
      value: (
        <Box sx={{ fontWeight: 700, fontSize: "1rem" }} data-testId="epoch.overview.txCountValue">
          {data?.txCount?.toLocaleString() ?? "—"}
        </Box>
      )
    },
    {
      icon: OutputIcon,
      title: (
        <Box display="flex" alignItems="center">
          <TitleCard data-testId="epoch.overview.totalOutputTitle" mr={1}>
            {t("glossary.totalOutput")}
          </TitleCard>
        </Box>
      ),
      value: (
        <Box display="inline-flex" alignItems="center" gap={0.35} data-testId="epoch.overview.totalOutputValue">
          {formatADA(data?.outSum || 0)} <ADAicon />
        </Box>
      )
    },
    {
      icon: ExchageAltIcon,
      title: (
        <Box display="flex" alignItems="center">
          <TitleCard data-testId="epoch.overview.totalFeesTitle" mr={1}>
            {t("common.fees")}
          </TitleCard>
        </Box>
      ),
      value: (
        <Box display="inline-flex" alignItems="center" gap={0.35} data-testId="epoch.overview.totalFeesValue">
          {formatADA(data?.fees || 0)} <ADAicon />
        </Box>
      )
    },
    {
      icon: DropIconComponent,
      title: (
        <Box display="flex" alignItems="center">
          <TitleCard data-testId="epoch.overview.activeStakeTitle" mr={1}>
            Active Stake
          </TitleCard>
        </Box>
      ),
      value: data?.activeStake !== undefined && data.activeStake > 0 ? (
        <Box display="inline-flex" alignItems="center" gap={0.35} data-testId="epoch.overview.activeStakeValue">
          {formatADA(data.activeStake)} <ADAicon />
        </Box>
      ) : (
        <Box sx={{ color: "secondary.light" }} data-testId="epoch.overview.activeStakeValue">—</Box>
      )
    },
    {
      icon: RewardIconComponent,
      title: (
        <Box display="flex" alignItems="center">
          <TitleCard data-testId="epoch.overview.rewardsTitle" mr={1}>
            {t("glossary.rewardsDistributed")}
          </TitleCard>
        </Box>
      ),
      value: data?.rewardsDistributed ? (
        <Box display="inline-flex" alignItems="center" gap={0.35} data-testId="epoch.overview.rewardsValue">
          {formatADA(data.rewardsDistributed)} <ADAicon />
        </Box>
      ) : (
        <Box sx={{ color: "secondary.light" }} data-testId="epoch.overview.rewardsValue">—</Box>
      )
    }
  ];

  return (
    <Box mb={3}>
      <DetailHeader
        data-testId="epoch.overview.detailHeader"
        loading={loading}
        listItem={listOverview}
        type="EPOCH"
        bookmarkData={data?.no?.toString()}
        title={
          <Box display="inline-flex" alignItems="center">
            {t("head.page.epochDetails")}
            <StatusBadge status={data?.status as string} />
          </Box>
        }
        lastUpdated={lastUpdated}
        epoch={
          data
            ? { no: data.no, slot, status: data.status, endTime: data.endTime }
            : undefined
        }
      />
    </Box>
  );
};

export default EpochOverviewView;
