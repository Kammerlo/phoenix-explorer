import { Box, CircularProgress, Container, styled, ToggleButton, ToggleButtonGroup, useTheme } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MdAccountTree, MdViewList } from "react-icons/md";

import TransactionMetadata from "src/components/TransactionDetail/TransactionMetadata";
import TransactionFlowChart from "src/components/TransactionDetail/TransactionFlowChart";
import TransactionOverview from "src/components/TransactionDetail/TransactionOverview";
import NoRecord from "src/components/commons/NoRecord";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { ApiReturnType } from "@shared/APIReturnType";
import { TransactionDetail } from "@shared/dtos/transaction.dto";
import PluginSlotRenderer from "src/plugins/PluginSlotRenderer";

const StyledContainer = styled(Container)`
  padding: 30px 16px 40px;

  @media screen and (max-width: ${(props) => props.theme.breakpoints.values.sm}px) {
    margin-top: 0px !important;
  }
`;

type ViewMode = "flow" | "tabs";

const TransactionDetailView: React.FC = () => {
  const { trxHash } = useParams<{ trxHash: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const [txData, setTxData] = useState<ApiReturnType<TransactionDetail>>();
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>("flow");
  const apiConnector: ApiConnector = ApiConnector.getApiConnector();
  const network = process.env.REACT_APP_NETWORK || "mainnet";

  useEffect(() => {
    window.history.replaceState({}, document.title);
    document.title = `Transaction ${trxHash} | Cardano Blockchain Explorer`;
    apiConnector.getTxDetail(trxHash).then((data) => {
      setTxData(data);
      setLoading(false);
    });
  }, [trxHash]);

  if (loading) {
    return (
      <StyledContainer>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress />
        </Box>
      </StyledContainer>
    );
  }

  if (!loading && !txData) return <NoRecord />;

  return (
    <StyledContainer>
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
    </StyledContainer>
  );
};

export default TransactionDetailView;
