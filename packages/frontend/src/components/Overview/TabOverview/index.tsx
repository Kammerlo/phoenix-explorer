import { Box, Chip, Skeleton, Typography, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { Column } from "src/components/commons/Table";
import usePageInfo from "src/hooks/usePageInfo";
import CustomTooltip from "src/components/commons/CustomTooltip";
import { getShortHash } from "src/commons/utils/helper";
import { details } from "src/commons/routers";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { GovernanceActionListItem } from "@shared/dtos/GovernanceOverview";
import { ApiReturnType } from "@shared/APIReturnType";

import { ContainerTab, StyledLink, StyledTable } from "./styles";

const ACTION_TYPE_LABELS: Record<string, string> = {
  parameter_change: "Protocol Parameter Change",
  hard_fork_initiation: "Hard Fork Initiation",
  treasury_withdrawals: "Treasury Withdrawal",
  no_confidence: "No Confidence",
  new_committee: "Update Committee",
  update_committee: "Update Committee",
  new_constitution: "New Constitution",
  info_action: "Info",
  info: "Info",
};

function formatActionType(type?: string): string {
  if (!type) return "Unknown";
  return ACTION_TYPE_LABELS[type.toLowerCase()] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ActionTypeChip({ type }: { type?: string }) {
  const theme = useTheme();
  return (
    <Chip
      label={formatActionType(type)}
      size="small"
      variant="outlined"
      sx={{
        fontWeight: 500,
        fontSize: "11px",
        height: "22px",
        color: theme.palette.secondary.main,
        borderColor: theme.palette.primary[200],
        "& .MuiChip-label": { px: 1 },
      }}
    />
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr",
            gap: 2,
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Skeleton variant="text" width="80%" height={20} />
          <Skeleton variant="rounded" width={160} height={22} />
        </Box>
      ))}
    </>
  );
}

export default function TabOverview() {
  const { pageInfo } = usePageInfo();
  const { search } = useLocation();
  const [fetchData, setFetchData] = useState<ApiReturnType<GovernanceActionListItem[]>>({
    data: [],
    lastUpdated: 0,
    total: 0,
    currentPage: 1,
  });
  const [loading, setLoading] = useState<boolean>(true);

  const apiConnector = ApiConnector.getApiConnector();

  useEffect(() => {
    setLoading(true);
    // pageInfo.page is 0-based (getPageInfo subtracts 1); the gateway expects 1-based.
    apiConnector.getGovernanceOverviewList({ ...pageInfo, page: (pageInfo.page ?? 0) + 1 }).then((res) => {
      setFetchData(res);
      setLoading(false);
    });
  }, [search]);

  const columns: Column<GovernanceActionListItem>[] = [
    {
      title: "Governance Action ID",
      key: "txHash",
      minWidth: "200px",
      render: (r) => (
        <CustomTooltip title={`${r.txHash}#${r.index}`}>
          <StyledLink to={details.governanceAction(r.txHash, r.index.toString())}>
            {getShortHash(r.txHash)}#{r.index}
          </StyledLink>
        </CustomTooltip>
      ),
    },
    {
      title: "Type",
      key: "type",
      minWidth: "200px",
      render: (r) => <ActionTypeChip type={r.type} />,
    },
  ];

  if (loading) {
    return (
      <ContainerTab>
        <Box sx={{ width: "100%", p: 2 }}>
          <LoadingRows />
        </Box>
      </ContainerTab>
    );
  }

  if (!loading && fetchData.data.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={10} px={2} textAlign="center">
        <Typography variant="h6" fontWeight={600} mb={1}>
          No Governance Actions Found
        </Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={480}>
          There are currently no governance proposals on-chain. Check back later or visit the Cardano governance portal
          for upcoming proposals.
        </Typography>
      </Box>
    );
  }

  return (
    <ContainerTab>
      <Box sx={{ width: "100%", typography: "body1" }}>
        <StyledTable
          {...fetchData}
          columns={columns}
          total={{ count: fetchData.total, title: "Governance Actions" }}
          pagination={{
            ...pageInfo,
            total: fetchData.total,
            hideLastPage: true,
          }}
          tableWrapperProps={{ sx: { overflowX: "auto" } }}
        />
      </Box>
    </ContainerTab>
  );
}
