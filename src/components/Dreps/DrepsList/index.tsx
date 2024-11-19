import { Box, Button } from "@mui/material";
import { stringify } from "qs";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom";

import useFetchList from "src/commons/hooks/useFetchList";
import usePageInfo from "src/commons/hooks/usePageInfo";
import { details } from "src/commons/routers";
import { API } from "src/commons/utils/api";
import { formatADAFull, formatDateTimeLocal, formatPercent, getShortHash } from "src/commons/utils/helper";
import { ActionMetadataModalConfirm } from "src/components/GovernanceVotes";
import ADAicon from "src/components/commons/ADAIcon";
import { DATETIME_PARTTEN } from "src/components/commons/CustomFilter/DateRangeModal";
import CustomTooltip from "src/components/commons/CustomTooltip";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import { StakeKeyStatus } from "src/components/commons/DetailHeader/styles";
import Table, { Column } from "src/components/commons/Table";

import { PoolName } from "./styles";
import { ApiConnector } from "../../../commons/connector/ApiConnector";
import { ApiReturnType } from "../../../commons/connector/types/APIReturnType";

const DrepsList: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { pageInfo, setSort } = usePageInfo();
  const [metadataUrl, setMetadataUrl] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);
  const blockKey = useSelector(({ system }: RootState) => system.blockKey);
  const handleBlankSort = () => {
    history.replace({ search: stringify({ ...pageInfo, page: 1, sort: undefined }) });
  };
  const [fetchData, setFetchData] = useState<ApiReturnType<Drep[]>>();
  const apiConnector: ApiConnector = ApiConnector.getApiConnector();

  function updateData(page: number) {
    pageInfo.page = page;
    apiConnector.getDreps(pageInfo).then((data: ApiReturnType<Drep[]>) => {
      setFetchData(data);
    });
  }

  useEffect(() => {
    updateData(0);
  }, []);

  const columns: Column<Drep>[] = [
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
              onClick={() => {
                r.anchorUrl.includes("http") ? setMetadataUrl(r.anchorUrl) : setMetadataUrl(`//${r.anchorUrl}`);
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
    },
    {
      title: (
        <Box data-testid="drepList.lastUpdatedTitle" component={"span"}>
          {t("dreps.lastUpdated")}
        </Box>
      ),
      key: "updatedAt",
      minWidth: "120px",
      render: (r) => (
        <DatetimeTypeTooltip>
          <Box data-testid="drepList.lastUpdatedValue" component={"span"}>
            {formatDateTimeLocal(r.updatedAt)}
          </Box>
        </DatetimeTypeTooltip>
      ),
      sort: ({ columnKey, sortValue }) => {
        sortValue ? setSort(`${columnKey},${sortValue}`) : handleBlankSort();
      }
    }
  ];
  return (
    <>
      <Table
        data={fetchData?.data || []}
        data-testid="drepList.table"
        columns={columns}
        total={{ count: fetchData?.total || 0, title: "Total" }}
        onClickRow={(_, r: Drep) => history.push(details.drep(r.drepId))}
        pagination={{
          ...pageInfo,
          total: fetchData?.total || 0,
          onChange: (page) => {
            updateData(page);
          }
        }}
      />
      <ActionMetadataModalConfirm onClose={() => setMetadataUrl("")} open={!!metadataUrl} anchorUrl={metadataUrl} />
    </>
  );
};

export default DrepsList;
