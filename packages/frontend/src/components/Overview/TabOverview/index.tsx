import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Tab, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { parse, ParsedQs, stringify } from "qs";
import { useTranslation } from "react-i18next";
import { t } from "i18next";

import { Column } from "src/components/commons/Table";
import { API } from "src/commons/utils/api";
import useFetchList from "src/commons/hooks/useFetchList";
import usePageInfo from "src/commons/hooks/usePageInfo";
import CustomTooltip from "src/components/commons/CustomTooltip";
import { formatDateLocal, getShortHash } from "src/commons/utils/helper";
import { details } from "src/commons/routers";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import { actionTypeListDrep } from "src/components/commons/CardGovernanceVotes";
import { STATUS_OVERVIEW } from "src/commons/utils/constants";

import { ContainerTab, StyledLink, StyledTable } from "./styles";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { GovernanceActionListItem } from "@shared/dtos/GovernanceOverview";
import { ApiReturnType } from "@shared/APIReturnType";

export default function TabOverview() {
  const { pageInfo } = usePageInfo();
  const { search } = useLocation<{ fromPath?: SpecialPath }>();
  const { t } = useTranslation();
  const history = useHistory();
  const theme = useTheme();
  const [fetchData, setFetchData] = useState<ApiReturnType<GovernanceActionListItem[]>>({data: [], lastUpdated: 0, total: 0, currentPage: 1});
  const [loading, setLoading] = useState<boolean>(true);
  

  const apiConnector = ApiConnector.getApiConnector();
  apiConnector.getGovernanceOverviewList(pageInfo).then((res: ApiReturnType<GovernanceActionListItem[]>) => {
    setFetchData(res);
    setLoading(false);
  });

  const columns: Column<GovernanceActionListItem>[] = [
    {
      title: <Box component={"span"}>Governance ID</Box>,
      key: "overview",
      minWidth: "120px",
      render: (r) => (
        <Box>
          <CustomTooltip title={r.txHash}>
            <StyledLink to={details.overviewGovernanceAction(r.txHash, r.index.toString())}>
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
