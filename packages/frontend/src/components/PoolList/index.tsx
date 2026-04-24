import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Chip, LinearProgress, Skeleton, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import usePageInfo from "src/hooks/usePageInfo";
import { details } from "src/commons/routers";
import { formatADA, formatPercent, getShortHash } from "src/commons/utils/helper";
import ADAicon from "src/components/commons/ADAIcon";
import CustomTooltip from "src/components/commons/CustomTooltip";
import Table, { Column } from "src/components/commons/Table";
import FormNowMessage from "src/components/commons/FormNowMessage";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { ApiReturnType } from "@shared/APIReturnType";
import { PoolOverview } from "@shared/dtos/pool.dto";
import { Actions, TimeDuration } from "src/components/TransactionLists/styles";
import { DelegationContainer } from "./styles";

// ─── Saturation bar ───────────────────────────────────────────────────────────

function SaturationBar({ value }: { value: number | null | undefined }) {
  const theme = useTheme();
  if (value == null) return <Box sx={{ color: "secondary.light", fontSize: "0.8rem" }}>N/A</Box>;

  // value is 0-1 range (fraction from Blockfrost live_saturation)
  const pct = Math.min(100, value * 100);
  const isOver = value > 1;
  const barColor = isOver ? theme.palette.error[700] : theme.palette.primary.main;

  return (
    <Box sx={{ minWidth: 110 }}>
      <Box
        sx={{
          height: 6,
          borderRadius: 3,
          mb: 0.5,
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
            borderRadius: 3,
            bgcolor: barColor,
            transition: "width 0.4s ease"
          }}
        />
      </Box>
      <Box sx={{ fontSize: "0.72rem", color: isOver ? "error.main" : "secondary.light", fontWeight: isOver ? 700 : 400 }}>
        {formatPercent(value)}
      </Box>
    </Box>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SKELETON_COUNT = 20;

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
          <Box sx={{ flex: 2 }}>
            <Skeleton variant="text" width="55%" height={16} />
            <Skeleton variant="rounded" width={48} height={16} sx={{ mt: 0.5, borderRadius: "9px" }} />
          </Box>
          <Box sx={{ flex: 1.5 }}><Skeleton variant="text" width="70%" /></Box>
          <Box sx={{ flex: 1.5 }}>
            <Skeleton variant="text" width="80%" height={8} sx={{ borderRadius: 3 }} />
            <Skeleton variant="text" width="30%" height={12} sx={{ mt: 0.5 }} />
          </Box>
          <Box sx={{ flex: 1.5 }}><Skeleton variant="text" width="60%" /></Box>
          <Box sx={{ flex: 1 }}><Skeleton variant="text" width="50%" /></Box>
        </Box>
      ))}
    </Box>
  );
};

// ─── Pool list ────────────────────────────────────────────────────────────────

const PoolList: React.FC = () => {
  const { t } = useTranslation();
  const { pageInfo } = usePageInfo();
  const [fetchData, setFetchData] = useState<ApiReturnType<PoolOverview[]>>();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const apiConnector = ApiConnector.getApiConnector();

  useEffect(() => {
    setLoading(true);
    apiConnector.getPoolList(pageInfo).then((response) => {
      setFetchData(response);
      setLoading(false);
    });
  }, [pageInfo.page, pageInfo.size]);

  const columns: Column<PoolOverview>[] = [
    {
      title: <Box data-testid="poolList.poolNameTitle">{t("glossary.pool")}</Box>,
      key: "poolName",
      minWidth: "180px",
      render: (r, idx) => (
        <Box>
          <Box
            component="span"
            data-testid={`poolList.poolNameValue#${idx}`}
            sx={{
              color: "primary.main",
              fontWeight: 600,
              fontSize: "0.87rem",
              cursor: "pointer",
              "&:hover": { textDecoration: "underline" }
            }}
            onClick={() => navigate(details.delegation(r.poolId))}
          >
            <Box
              component="span"
              sx={{
                display: "inline-block",
                maxWidth: 220,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                verticalAlign: "bottom"
              }}
            >
              {r.poolName || getShortHash(r.poolId)}
            </Box>
          </Box>
          {r.tickerName && (
            <Box mt={0.3}>
              <Chip
                label={r.tickerName}
                size="small"
                sx={{
                  height: 17,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                  color: "primary.main",
                  border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.3)}`,
                  "& .MuiChip-label": { px: 0.7 }
                }}
              />
            </Box>
          )}
        </Box>
      )
    },
    {
      title: (
        <Box component="span" data-testid="poolList.poolSizeTitle">
          {t("glossary.poolSize")} (<ADAicon />)
        </Box>
      ),
      key: "poolSize",
      minWidth: "130px",
      render: (r, idx) => (
        <Box
          component="span"
          data-testid={`poolList.poolSizeValue#${idx}`}
          sx={{ fontWeight: 600, fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: 0.4 }}
        >
          {r.poolSize != null ? (
            <>{formatADA(r.poolSize)} <ADAicon /></>
          ) : (
            <Box sx={{ color: "secondary.light" }}>—</Box>
          )}
        </Box>
      )
    },
    {
      title: (
        <Box component="span" data-testid="poolList.saturationTitle">
          {t("glossary.saturation")}
        </Box>
      ),
      key: "saturation",
      minWidth: "120px",
      render: (r, idx) => (
        <Box data-testid={`poolList.saturationValue#${idx}`}>
          <SaturationBar value={r.saturation} />
        </Box>
      )
    },
    {
      title: (
        <Box component="span" data-testid="poolList.declaredPledgeTitle">
          {t("glossary.declaredPledge")} (<ADAicon />)
        </Box>
      ),
      key: "declaredPledge",
      minWidth: "130px",
      render: (r, idx) => (
        <Box
          component="span"
          data-testid={`poolList.declaredPledgeValue#${idx}`}
          sx={{ fontSize: "0.83rem", color: "secondary.light", display: "inline-flex", alignItems: "center", gap: 0.4 }}
        >
          {formatADA(r.declaredPledge)} <ADAicon />
        </Box>
      )
    },
    {
      title: (
        <Box component="span" data-testid="poolList.blockLifetimeTitle">
          {t("glossary.blocksLifetime")}
        </Box>
      ),
      key: "lifetimeBlock",
      minWidth: "100px",
      render: (r, idx) => (
        <Box
          component="span"
          data-testid={`poolList.blockLifetimeValue#${idx}`}
          sx={{ fontWeight: 600, fontSize: "0.85rem" }}
        >
          {(r.lifetimeBlock ?? 0).toLocaleString()}
        </Box>
      )
    }
  ];

  return (
    <DelegationContainer>
      <Actions>
        <TimeDuration>
          <FormNowMessage time={fetchData?.lastUpdated || 0} />
        </TimeDuration>
      </Actions>

      {loading ? (
        <SkeletonRows />
      ) : (
        <Table
          data-testid="delegationList.table"
          data={fetchData?.data || []}
          columns={columns}
          total={{ count: fetchData?.total ?? 0, title: "Total" }}
          onClickRow={(_, r: PoolOverview) => navigate(details.delegation(r.poolId))}
          pagination={{
            ...pageInfo,
            total: fetchData?.total ?? 0,
            page: fetchData?.currentPage ?? 0,
            size: fetchData?.pageSize ?? pageInfo.size,
            onChange: (page) => {
              setLoading(true);
              apiConnector.getPoolList({ ...pageInfo, page }).then((response) => {
                setFetchData(response);
                setLoading(false);
              });
            }
          }}
          tableWrapperProps={{
            sx: (theme) => ({
              minHeight: "70vh",
              [theme.breakpoints.down("md")]: { minHeight: "60vh" },
              [theme.breakpoints.down("sm")]: { minHeight: "50vh" }
            })
          }}
        />
      )}
    </DelegationContainer>
  );
};

export default PoolList;
