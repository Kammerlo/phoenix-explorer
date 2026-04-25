import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, Container, Skeleton, ToggleButton, ToggleButtonGroup, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { MdAccountTree, MdViewList } from "react-icons/md";

import TransactionMetadata from "src/components/TransactionDetail/TransactionMetadata";
import TransactionFlowChart from "src/components/TransactionDetail/TransactionFlowChart";
import TransactionOverview from "src/components/TransactionDetail/TransactionOverview";
import NoRecord from "src/components/commons/NoRecord";
import FetchDataErr from "src/components/commons/FetchDataErr";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { ApiReturnType } from "@shared/APIReturnType";
import { TransactionDetail } from "@shared/dtos/transaction.dto";
import PluginSlotRenderer from "src/plugins/PluginSlotRenderer";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const TxDetailSkeleton: React.FC = () => {
  const theme = useTheme();
  return (
    <Box>
      {/* Header skeleton */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          border: `1px solid ${
            theme.isDark
              ? alpha(theme.palette.secondary.light, 0.1)
              : theme.palette.primary[200] || "#e8edf2"
          }`,
          mb: 3
        }}
      >
        <Skeleton variant="text" width="30%" height={28} />
        <Skeleton variant="text" width="55%" height={18} sx={{ mt: 1 }} />
        <Box display="flex" gap={2} mt={2} flexWrap="wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} sx={{ flex: "1 1 130px" }}>
              <Skeleton variant="text" width="60%" height={14} />
              <Skeleton variant="text" width="80%" height={20} sx={{ mt: 0.5 }} />
            </Box>
          ))}
        </Box>
      </Box>
      {/* Content skeleton */}
      <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
    </Box>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

type ViewMode = "flow" | "tabs";

const TransactionDetailView: React.FC = () => {
  const { trxHash } = useParams<{ trxHash: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const [txData, setTxData] = useState<ApiReturnType<TransactionDetail>>();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("flow");

  const apiConnector = ApiConnector.getApiConnector();
  const network = process.env.REACT_APP_NETWORK || "mainnet";

  useEffect(() => {
    document.title = `Transaction ${trxHash} | Phoenix Explorer`;
    setLoading(true);
    apiConnector.getTxDetail(trxHash).then((data) => {
      setTxData(data);
      setLoading(false);
    });
  }, [trxHash]);

  if (txData?.error) return <FetchDataErr />;
  if (!loading && !txData?.data) return <NoRecord />;

  return (
    <Container sx={{ pt: 3, pb: 6 }}>
      {loading ? (
        <TxDetailSkeleton />
      ) : (
        <>
          <TransactionOverview data={txData?.data} loading={loading} />

          <Box display="flex" justifyContent="flex-end" mt={2} mb={-1}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_e, val) => val && setViewMode(val)}
              size="small"
              sx={{
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  px: 2,
                  py: 0.5,
                  gap: 0.5,
                  color: theme.palette.secondary.light,
                  borderColor: theme.palette.primary[200] || theme.palette.divider,
                  "&.Mui-selected": {
                    color: theme.palette.primary.main,
                    bgcolor: theme.isDark ? "rgba(102,189,255,0.08)" : "rgba(0,51,173,0.06)"
                  }
                }
              }}
            >
              <ToggleButton value="flow">
                <MdAccountTree size={16} />
                {t("flow.viewFlow")}
              </ToggleButton>
              <ToggleButton value="tabs">
                <MdViewList size={16} />
                {t("flow.viewTabs")}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {viewMode === "flow"
            ? <TransactionFlowChart data={txData?.data} />
            : <TransactionMetadata data={txData?.data} loading={loading} />
          }
          <PluginSlotRenderer slot="transaction-detail" context={{ data: txData?.data, network, apiConnector }} excludeMetadataPlugins />
        </>
      )}
    </Container>
  );
};

export default TransactionDetailView;
