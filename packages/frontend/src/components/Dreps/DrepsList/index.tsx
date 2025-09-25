import { Box, Button, CircularProgress } from "@mui/material";
import { stringify } from "qs";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";

import usePageInfo from "src/commons/hooks/usePageInfo";
import { details } from "src/commons/routers";
import { formatADAFull, getShortHash } from "src/commons/utils/helper";
import ADAicon from "src/components/commons/ADAIcon";
import CustomTooltip from "src/components/commons/CustomTooltip";
import { StakeKeyStatus } from "src/components/commons/DetailHeader/styles";
import Table, { Column } from "src/components/commons/Table";
import { Drep } from "@shared/dtos/drep.dto";

import { ListOfDreps, PoolName, TopSearchContainer } from "./styles";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { ApiReturnType } from "@shared/APIReturnType";

const DrepsList: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { search } = useLocation();
  const { pageInfo, setSort } = usePageInfo();
  const tableRef = useRef<HTMLDivElement>(null);
  const [fetchData, setFetchData] = useState<ApiReturnType<Drep[]>>({ 
    data: [], 
    lastUpdated: 0, 
    total: 0, 
    currentPage: 1 
  });
  const [loading, setLoading] = useState<boolean>(true);
  const handleBlankSort = () => {
    history.replace({ search: stringify({ ...pageInfo, page: 1, sort: undefined }) });
  };

  const apiConnector = ApiConnector.getApiConnector();
  
  const fetchDreps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiConnector.getDreps(pageInfo);
      setFetchData(data);
    } catch (error) {
      console.error('Error fetching dreps:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDreps();
  }, [fetchDreps]);


  const columns: Column<Drep>[] = [
    {
      title: <div data-testid="drepList.drepGivenName">{t("dreps.givenName")}</div>,
      key: "givenName",
      minWidth: "100px",
      render: (r) => (
        <CustomTooltip title={r.givenName ? r.givenName : undefined}>
          <PoolName data-testid="drepList.drepGivenNameValue" to={{ pathname: details.drep(r.drepId) }}>
            <Box component={"span"} textOverflow={"ellipsis"} whiteSpace={"nowrap"} overflow={"hidden"}>
              {r.givenName}
            </Box>
          </PoolName>
        </CustomTooltip>
      )
    },
    {
      title: <div data-testid="drepList.drepIdTitle">{t("dreps.id")}</div>,
      key: "id",
      minWidth: "100px",
      render: (r) => (
        <CustomTooltip title={r.drepId ? r.drepId : undefined}>
          <PoolName data-testid="drepList.drepIdValue" to={{ pathname: details.drep(r.drepId) }}>
            <Box component={"span"} textOverflow={"ellipsis"} whiteSpace={"nowrap"} overflow={"hidden"}>
              {`${getShortHash(r.drepId)}`}
            </Box>
          </PoolName>
        </CustomTooltip>
      )
    },
    {
      title: (
        <Box data-testid="drepList.anchorLinkTitle" component={"span"}>
          {t("dreps.anchorLink")}
        </Box>
      ),
      key: "anchorLink",
      minWidth: "100px",
      render: (r) =>
        r.anchorUrl != null ? (
          <CustomTooltip title={r.anchorUrl ? r.anchorUrl : undefined} sx={{ width: 150 }}>
            <Box
              padding={"6px 0px"}
              data-testid="drepList.anchorLinkValue"
              component={Button}
              textTransform={"lowercase"}
              fontWeight={400}
              display={(r.anchorUrl || "").length > 20 ? "inline-block" : "inline"}
              width={(r.anchorUrl || "").length > 20 ? "150px" : "fit-content"}
              minWidth={0}
              textOverflow={"ellipsis"}
              whiteSpace={"nowrap"}
              overflow={"hidden"}
              color={(theme) => `${theme.palette.primary.main} !important`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const url = r.anchorUrl.includes("http") ? r.anchorUrl : `https://${r.anchorUrl}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              disableRipple={true}
              sx={{ ":hover": { background: "none" }, textAlign: "left" }}
            >
              {`${r.anchorUrl || ""}`}
            </Box>
          </CustomTooltip>
        ) : (
          <Box padding={"6px 8px 6px 0"}>{t("common.N/A")}</Box>
        )
    },
    {
      title: (
        <Box data-testid="drepList.anchorHashTitle" component={"span"}>
          {t("dreps.anchorHash")}
        </Box>
      ),
      key: "pu.anchorHash",
      minWidth: "120px",
      render: (r) =>
        r.anchorHash != null ? (
          <CustomTooltip title={r.anchorHash ? r.anchorHash : undefined}>
            <Box
              data-testid="drepList.anchorHashValue"
              component={"span"}
              display={"inline-block"}
              width={"150px"}
              textOverflow={"ellipsis"}
              whiteSpace={"nowrap"}
              overflow={"hidden"}
              paddingTop={"3px"}
            >
              {r.anchorHash}
            </Box>
          </CustomTooltip>
        ) : (
          t("common.N/A")
        )
    },
    {
      title: (
        <Box data-testid="drepList.activeStakeTitle" component={"span"}>
          {t("glossary.activeStake")} (<ADAicon />)
        </Box>
      ),
      key: "activeVoteStake",
      minWidth: "120px",
      render: (r) => (
        <Box data-testid="drepList.activeStakeValue" component={"span"}>
          {r.activeVoteStake != null ? formatADAFull(r.activeVoteStake) : t("common.N/A")}
        </Box>
      ),
      sort: ({ columnKey, sortValue }) => {
        sortValue ? setSort(`${columnKey},${sortValue}`) : handleBlankSort();
      }
    },
    {
      title: <div data-testid="drepList.statusTitle">{t("common.status")}</div>,
      key: "status",
      minWidth: "120px",
      render: (r) => (
        <StakeKeyStatus
          data-testid="drepList.statusValue"
          status={r.status}
          sx={{ width: 65, display: "inline-block", textAlign: "center" }}
        >
          {r.status === "ACTIVE"
            ? t("status.active")
            : r.status === "INACTIVE"
            ? t("status.inActive")
            : t("status.retired")}
        </StakeKeyStatus>
      )
    }
  ];
  if (loading) return <CircularProgress />;
  
  return (
    <>
      {!fetchData.error && (
        <TopSearchContainer
          sx={{
            justifyContent: "space-between"
          }}
        >
          <ListOfDreps>{t("dreps.listOfDreps")}</ListOfDreps>
        </TopSearchContainer>
      )}
      <Table
        data={fetchData.data}
        loading={loading}
        error={fetchData.error}
        data-testid="drepList.table"
        columns={columns}
        total={{ count: fetchData.total, title: "Total" }}
        onClickRow={(e, r: Drep) => {
          // Prevent navigation if clicking on a link or button
          if (e.target instanceof HTMLAnchorElement || 
              (e.target instanceof Element && e.target.closest("a")) ||
              e.target instanceof HTMLButtonElement ||
              (e.target instanceof Element && e.target.closest("button"))) {
            e.preventDefault();
            e.stopPropagation();
            return;
          } else {
            history.push(details.drep(r.drepId));
          }
        }}
        pagination={{
          page: pageInfo.page,
          size: pageInfo.size,
          total: fetchData.total,
          onChange: (page, size) => {
            history.replace({ search: stringify({ ...pageInfo, page, size }) });
            tableRef.current?.scrollIntoView();
          }
        }}
      />
    </>
  );
};

export default DrepsList;
