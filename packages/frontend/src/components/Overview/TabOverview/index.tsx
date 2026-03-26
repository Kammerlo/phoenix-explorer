import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { stringify } from "qs";
import { useTranslation } from "react-i18next";

import { Column } from "src/components/commons/Table";
import usePageInfo from "src/commons/hooks/usePageInfo";
import CustomTooltip from "src/components/commons/CustomTooltip";
import { getShortHash } from "src/commons/utils/helper";
import { details } from "src/commons/routers";

import { ContainerTab, StyledLink, StyledTable } from "./styles";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { GovernanceActionListItem } from "@shared/dtos/GovernanceOverview";
import { ApiReturnType } from "@shared/APIReturnType";

export default function TabOverview() {
  const { pageInfo } = usePageInfo();
  const { search } = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fetchData, setFetchData] = useState<ApiReturnType<GovernanceActionListItem[]>>({data: [], lastUpdated: 0, total: 0, currentPage: 1});
  const [loading, setLoading] = useState<boolean>(true);

  const apiConnector = ApiConnector.getApiConnector();

  useEffect(() => {
    setLoading(true);
    apiConnector.getGovernanceOverviewList(pageInfo).then((res) => {
      setFetchData(res);
      setLoading(false);
    });
  }, [search]);

  const columns: Column<GovernanceActionListItem>[] = [
    {
      title: <Box component={"span"}>Governance ID</Box>,
      key: "overview",
      minWidth: "120px",
      render: (r) => (
        <Box>
          <CustomTooltip title={r.txHash}>
            <StyledLink to={details.governanceAction(r.txHash, r.index.toString())}>
              {getShortHash(r.txHash)}
            </StyledLink>
          </CustomTooltip>
        </Box>
      )
    },
    {
      title: <Box component={"span"}>Cert Index</Box>,
      key: "overview",
      minWidth: "120px",
      render: (r) => <Box component={"span"}>{r.index}</Box>
    },
    {
      title: <Box component={"span"}>Governance Type</Box>,
      key: "overview",
      minWidth: "120px",
      render: (r) => <Box component={"span"}>{r.type}</Box>
    }
  ];
  
  if(loading) return <>Loading...</>;
  if (!loading && fetchData.data.length === 0) return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={10}
      px={2}
      textAlign="center"
    >
      <Typography variant="h6" fontWeight={600} mb={1}>
        No Active Governance Actions
      </Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={480}>
        There are currently no governance proposals on-chain. Check back later or visit the Cardano governance portal
        for upcoming proposals.
      </Typography>
    </Box>
  );
  return (
    <ContainerTab>
      <Box sx={{ width: "100%", typography: "body1" }}>
        <StyledTable
          {...fetchData}
          columns={columns}
          total={{ count: fetchData.total, title: "Total" }}
          pagination={{
            ...pageInfo,
            total: fetchData.total,
          }}
        />
      </Box>
    </ContainerTab>
  );
}
