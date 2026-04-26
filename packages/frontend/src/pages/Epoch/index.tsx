import React, { useEffect, useState, MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Chip, LinearProgress, Paper, Skeleton, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { details } from "src/commons/routers";
import Table, { Column } from "src/components/commons/Table";
import { Capitalize } from "src/components/commons/CustomText/styles";
import usePageInfo from "src/hooks/usePageInfo";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import FormNowMessage from "src/components/commons/FormNowMessage";
import { formatADA, formatDateTimeLocal } from "src/commons/utils/helper";
import ADAicon from "src/components/commons/ADAIcon";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { ApiReturnType } from "@shared/APIReturnType";
import { EpochOverview, EpochStatus } from "@shared/dtos/epoch.dto";
import { Link } from "react-router-dom";
import { Actions, TimeDuration } from "src/components/TransactionLists/styles";
import { StyledContainer } from "./styles";
import { EPOCH_STATUS, MAX_SLOT_EPOCH } from "src/commons/utils/constants";

// ─── Status badge ──────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: "success" | "warning" | "default" | "primary" }> = {
  [EPOCH_STATUS.IN_PROGRESS]: { label: "In Progress", color: "success" },
  [EPOCH_STATUS.REWARDING]:   { label: "Rewarding",   color: "warning" },
  [EPOCH_STATUS.FINISHED]:    { label: "Finished",    color: "default" },
  [EPOCH_STATUS.SYNCING]:     { label: "Syncing",     color: "primary" },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SKELETON_COUNT = 12;

const SkeletonRows: React.FC = () => {
  const theme = useTheme();
  return (
    <Box>
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: 2,
            py: 1.5,
            borderBottom: `1px solid ${
              theme.isDark
                ? alpha(theme.palette.secondary.light, 0.08)
                : theme.palette.primary[200] || "#f0f0f0"
            }`
          }}
        >
          <Box sx={{ flex: 1.2 }}>
            <Skeleton variant="text" width="40%" height={16} />
            <Skeleton variant="rounded" width={72} height={18} sx={{ mt: 0.4, borderRadius: "9px" }} />
          </Box>
          <Box sx={{ flex: 1.5 }}>
            <Skeleton variant="text" width="80%" height={8} sx={{ borderRadius: 4 }} />
            <Skeleton variant="text" width="28%" height={12} sx={{ mt: 0.5 }} />
          </Box>
          <Box sx={{ flex: 1.5 }}><Skeleton variant="text" width="75%" height={16} /></Box>
          <Box sx={{ flex: 1.5 }}><Skeleton variant="text" width="75%" height={16} /></Box>
          <Box sx={{ flex: 0.8 }}><Skeleton variant="text" width="50%" height={16} /></Box>
          <Box sx={{ flex: 0.8 }}><Skeleton variant="text" width="50%" height={16} /></Box>
          <Box sx={{ flex: 1 }}><Skeleton variant="text" width="60%" height={16} /></Box>
          <Box sx={{ flex: 1 }}><Skeleton variant="text" width="60%" height={16} /></Box>
        </Box>
      ))}
    </Box>
  );
};

// ─── Current epoch banner ─────────────────────────────────────────────────────

interface CurrentEpochBannerProps {
  epoch: EpochOverview;
}

const CurrentEpochBanner: React.FC<CurrentEpochBannerProps> = ({ epoch }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const liveSlot = epoch.epochSlotNo ?? 0;
  const pct = liveSlot > 0
    ? Math.min(100, (liveSlot / MAX_SLOT_EPOCH) * 100)
    : Math.min(100, epoch.syncingProgress ?? 0);

  const barColor = theme.palette.success.main;

  const stat = (label: string, value: React.ReactNode) => (
    <Box sx={{ flex: "1 1 130px", minWidth: 100 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </Typography>
      <Box sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary", mt: 0.3 }}>
        {value}
      </Box>
    </Box>
  );

  return (
    <Paper
      elevation={0}
      onClick={() => navigate(details.epoch(epoch.no))}
      sx={{
        mb: 2,
        p: 2.5,
        borderRadius: 3,
        border: `1px solid ${alpha(barColor, 0.35)}`,
        background: theme.isDark
          ? alpha(barColor, 0.06)
          : alpha(barColor, 0.04),
        cursor: "pointer",
        "&:hover": { background: theme.isDark ? alpha(barColor, 0.1) : alpha(barColor, 0.07) },
        transition: "background 0.2s"
      }}
    >
      {/* Header row */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" fontWeight={700} color="text.primary">
            Epoch {epoch.no}
          </Typography>
          <Chip
            label="In Progress"
            color="success"
            size="small"
            sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, "& .MuiChip-label": { px: 0.9 } }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          Slot {(liveSlot || 0).toLocaleString()} / {MAX_SLOT_EPOCH.toLocaleString()}
          {" · "}{pct.toFixed(1)}% complete
        </Typography>
      </Box>

      {/* Progress bar */}
      <Box
        sx={{
          height: 8,
          borderRadius: 4,
          mb: 2,
          bgcolor: theme.isDark
            ? alpha(theme.palette.secondary.light, 0.1)
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

      {/* Stats row */}
      <Box display="flex" flexWrap="wrap" gap={2}>
        {stat("Blocks",    epoch.blkCount?.toLocaleString() ?? "—")}
        {stat("Transactions", epoch.txCount?.toLocaleString() ?? "—")}
        {stat("Total Output", <Box display="inline-flex" alignItems="center" gap={0.3}>{formatADA(epoch.outSum)}<ADAicon /></Box>)}
        {stat("Fees", <Box display="inline-flex" alignItems="center" gap={0.3}>{formatADA(epoch.fees ?? 0)}<ADAicon /></Box>)}
        <Box sx={{ flex: "1 1 130px", minWidth: 100 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Start
          </Typography>
          <Box sx={{ fontWeight: 500, fontSize: "0.82rem", color: "text.secondary", mt: 0.3 }}>
            {formatDateTimeLocal(epoch.startTime || "")}
          </Box>
        </Box>
        <Box sx={{ flex: "1 1 130px", minWidth: 100 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Ends
          </Typography>
          <Box sx={{ fontWeight: 500, fontSize: "0.82rem", color: "text.secondary", mt: 0.3 }}>
            {formatDateTimeLocal(epoch.endTime || "")}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

// ─── Epoch list ───────────────────────────────────────────────────────────────

const Epoch: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pageInfo } = usePageInfo();
  const [epochData, setEpochData] = useState<ApiReturnType<EpochOverview[]>>();
  const [loading, setLoading] = useState(true);
  const apiConnector = ApiConnector.getApiConnector();

  function updateData(page: number, size?: number) {
    setLoading(true);
    apiConnector.getEpochs({ ...pageInfo, page, size: size ?? pageInfo.size }).then((data: ApiReturnType<EpochOverview[]>) => {
      setEpochData(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    document.title = t("head.page.epochsList");
    updateData(0);
  }, []);

  const columns: Column<EpochOverview>[] = [
    {
      title: <Capitalize>{t("glossary.epoch")}</Capitalize>,
      key: "no",
      minWidth: "100px",
      render: (r, idx) => {
        const statusMeta = STATUS_META[r.status as string];
        return (
          <Box>
            <Link
              to={details.epoch(r.no)}
              style={{ fontWeight: 700, fontSize: "0.9rem", textDecoration: "none", color: "inherit" }}
              data-testid={`epoch.table.value.no#${idx}`}
            >
              <Box component="span" sx={{ color: "primary.main" }}>{r.no}</Box>
            </Link>
            {statusMeta && (r.status as string) !== EPOCH_STATUS.FINISHED && (
              <Box mt={0.3}>
                <Chip
                  label={statusMeta.label}
                  color={statusMeta.color}
                  size="small"
                  sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, "& .MuiChip-label": { px: 0.8 } }}
                />
              </Box>
            )}
          </Box>
        );
      }
    },
    {
      title: <Capitalize>Progress</Capitalize>,
      key: "syncingProgress",
      minWidth: "120px",
      render: (r) => {
        const pct = r.status === EpochStatus.FINISHED || (r.syncingProgress >= 100)
          ? 100
          : Math.min(100, r.syncingProgress ?? 0);
        const color =
          (r.status as string) === EPOCH_STATUS.IN_PROGRESS ? "success" :
          (r.status as string) === EPOCH_STATUS.REWARDING    ? "warning" :
          "primary";
        return (
          <Box sx={{ minWidth: 100 }}>
            <LinearProgress
              variant="determinate"
              value={pct}
              color={color as any}
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Box sx={{ fontSize: "0.7rem", color: "secondary.light", mt: 0.4 }}>
              {pct.toFixed(0)}%
            </Box>
          </Box>
        );
      }
    },
    {
      title: <Capitalize>{t("glossary.startTimestamp")}</Capitalize>,
      key: "startTime",
      minWidth: "130px",
      render: (r, idx) => (
        <DatetimeTypeTooltip>
          <Box data-testid={`epoch.table.value.startTime#${idx}`} sx={{ fontSize: "0.82rem", color: "secondary.light" }}>
            {formatDateTimeLocal(r.startTime || "")}
          </Box>
        </DatetimeTypeTooltip>
      )
    },
    {
      title: <Capitalize>{t("glossary.endTimestamp")}</Capitalize>,
      key: "endTime",
      minWidth: "130px",
      render: (r, idx) => (
        <DatetimeTypeTooltip>
          <Box data-testid={`epoch.table.value.endTime#${idx}`} sx={{ fontSize: "0.82rem", color: "secondary.light" }}>
            {formatDateTimeLocal(r.endTime || "")}
          </Box>
        </DatetimeTypeTooltip>
      )
    },
    {
      title: <Capitalize>{t("filter.blocks")}</Capitalize>,
      key: "blkCount",
      minWidth: "70px",
      render: (r, idx) => (
        <Box data-testid={`epoch.table.value.blocks#${idx}`} sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
          {r.blkCount?.toLocaleString() ?? "—"}
        </Box>
      )
    },
    {
      title: <Capitalize>{t("glossary.transactionCount")}</Capitalize>,
      key: "txCount",
      minWidth: "70px",
      render: (r, idx) => (
        <Box data-testid={`epoch.table.value.txCount#${idx}`} sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
          {r.txCount?.toLocaleString() ?? "—"}
        </Box>
      )
    },
    {
      title: <Capitalize>{t("glossary.totalOutput")}</Capitalize>,
      key: "outSum",
      minWidth: "120px",
      render: (r) => (
        <Box display="inline-flex" alignItems="center" gap={0.35} sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
          <span>{formatADA(r.outSum)}</span>
          <ADAicon />
        </Box>
      )
    },
    {
      title: <Capitalize>{t("common.fees")}</Capitalize>,
      key: "fees",
      minWidth: "100px",
      render: (r) => (
        <Box display="inline-flex" alignItems="center" gap={0.35} sx={{ fontSize: "0.82rem", color: "secondary.light", fontWeight: 500 }}>
          <span>{formatADA(r.fees ?? 0)}</span>
          <ADAicon />
        </Box>
      )
    }
  ];

  const handleClickRow = (_: MouseEvent, r: EpochOverview) => {
    navigate(details.epoch(r.no));
  };

  // Current epoch is the one with IN_PROGRESS status (first in the list)
  const currentEpochRow = epochData?.data?.find((e) => (e.status as string) === EPOCH_STATUS.IN_PROGRESS);

  return (
    <StyledContainer>
      {/* Current epoch highlight banner */}
      {!loading && currentEpochRow && <CurrentEpochBanner epoch={currentEpochRow} />}

      <Actions>
        <TimeDuration>
          <FormNowMessage time={epochData?.lastUpdated || 0} />
        </TimeDuration>
      </Actions>

      {loading ? (
        <SkeletonRows />
      ) : (
        <Table
          data={epochData?.data || []}
          columns={columns}
          total={{ title: t("common.totalEpochs"), count: epochData?.total || 0 }}
          onClickRow={handleClickRow}
          rowKey="no"
          tableWrapperProps={{
            sx: (theme) => ({
              minHeight: "70vh",
              [theme.breakpoints.down("md")]: { minHeight: "60vh" },
              [theme.breakpoints.down("sm")]: { minHeight: "50vh" }
            })
          }}
          pagination={{
            ...pageInfo,
            total: epochData?.total || 0,
            page: epochData?.currentPage || 0,
            size: epochData?.pageSize || pageInfo.size,
            onChange: (page, size) => updateData(page, size),
            hideLastPage: true
          }}
        />
      )}
    </StyledContainer>
  );
};

export default Epoch;
