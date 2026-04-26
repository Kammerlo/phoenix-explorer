import { Box, Button } from "@mui/material";
import { stringify } from "qs";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";

import usePageInfo from "src/hooks/usePageInfo";
import { details } from "src/commons/routers";
import { formatADA, getShortHash } from "src/commons/utils/helper";
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
  const navigate = useNavigate();
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
    navigate({ search: stringify({ ...pageInfo, page: 1, sort: undefined }) }, { replace: true });
  };

  const apiConnector = ApiConnector.getApiConnector();

  const fetchDreps = useCallback(async () => {
    setLoading(true);
    try {
      // pageInfo.page is 0-based (getPageInfo subtracts 1); the gateway expects 1-based.
      const data = await apiConnector.getDreps({ ...pageInfo, page: (pageInfo.page ?? 0) + 1 });
      setFetchData(data);
    } catch {
      // ignore
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
      minWidth: "160px",
      render: (r) => (
        <CustomTooltip title={r.givenName || r.drepId}>
          <PoolName data-testid="drepList.drepGivenNameValue" to={{ pathname: details.drep(r.drepId) }}>
            <Box component={"span"} textOverflow={"ellipsis"} whiteSpace={"nowrap"} overflow={"hidden"}>
              {r.givenName || (
                <Box component="span" sx={{ color: "secondary.light", fontStyle: "italic", fontSize: "0.85em" }}>
                  {getShortHash(r.drepId)}
                </Box>
              )}
            </Box>
          </PoolName>
        </CustomTooltip>
      )
    },
    {
      title: <div data-testid="drepList.drepIdTitle">{t("dreps.id")}</div>,
      key: "id",
      minWidth: "150px",
      render: (r) => (
        <CustomTooltip title={r.drepId || undefined}>
          <PoolName data-testid="drepList.drepIdValue" to={{ pathname: details.drep(r.drepId) }}>
            <Box component={"span"} textOverflow={"ellipsis"} whiteSpace={"nowrap"} overflow={"hidden"}>
              {getShortHash(r.drepId)}
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
      minWidth: "180px",
      render: (r) => {
        const trimmed = (r.anchorUrl ?? "").trim();
        if (!trimmed) {
          return (
            <Box padding={"6px 8px 6px 0"} color="secondary.light">
              {t("common.N/A")}
            </Box>
          );
        }
        const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        return (
          <CustomTooltip title={trimmed} sx={{ width: 200 }}>
            <Box
              padding={"6px 0px"}
              data-testid="drepList.anchorLinkValue"
              component="a"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              textTransform={"lowercase"}
              fontWeight={400}
              display={"inline-block"}
              width={"180px"}
              minWidth={0}
              textOverflow={"ellipsis"}
              whiteSpace={"nowrap"}
              overflow={"hidden"}
              color={(theme) => `${theme.palette.primary.main} !important`}
              onClick={(e) => e.stopPropagation()}
              sx={{ textAlign: "left", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
            >
              {trimmed}
            </Box>
          </CustomTooltip>
        );
      }
    },
    {
      title: (
        <Box data-testid="drepList.activeStakeTitle" component={"span"}>
          {t("glossary.activeStake")} (<ADAicon />)
        </Box>
      ),
      key: "activeVoteStake",
      minWidth: "160px",
      render: (r) => (
        <Box data-testid="drepList.activeStakeValue" component={"span"} sx={{ whiteSpace: "nowrap" }}>
          {r.activeVoteStake != null ? (
            <>
              {formatADA(r.activeVoteStake)} <ADAicon />
            </>
          ) : (
            t("common.N/A")
          )}
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
          sx={{ width: 70, display: "inline-block", textAlign: "center" }}
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

  return (
    <>
      {!fetchData.error && (
        <TopSearchContainer sx={{ justifyContent: "space-between", mt: 2, mb: 1.5 }}>
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
        minHeight="calc(100vh - 350px)"
        tableWrapperProps={{ sx: { overflowX: "auto" } }}
        onClickRow={(e, r: Drep) => {
          if (
            e.target instanceof HTMLAnchorElement ||
            (e.target instanceof Element && e.target.closest("a")) ||
            e.target instanceof HTMLButtonElement ||
            (e.target instanceof Element && e.target.closest("button"))
          ) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          navigate(details.drep(r.drepId));
        }}
        pagination={{
          page: fetchData.currentPage ?? 0, // 0-based for FooterTable
          size: fetchData.pageSize ?? pageInfo.size,
          total: fetchData.total,
          onChange: (page, size) => {
            // PaginationCustom emits a 1-based page; persist that to the URL
            // so getPageInfo's -1 normalization gives the right pageInfo.page.
            navigate({ search: stringify({ ...pageInfo, page, size }) }, { replace: true });
            tableRef.current?.scrollIntoView();
          }
        }}
      />
    </>
  );
};

export default DrepsList;
