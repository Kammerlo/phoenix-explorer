import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, CircularProgress } from "@mui/material";

import { EPOCH_STATUS } from "src/commons/utils/constants";
import Card from "src/components/commons/Card";
import Table, { Column } from "src/components/commons/Table";
import { Capitalize } from "src/components/commons/CustomText/styles";
import usePageInfo from "src/commons/hooks/usePageInfo";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import { details } from "src/commons/routers";

import { Blocks, BlueText, EpochNumber, StatusTableRow, StyledContainer, StyledLink } from "./styles";
import { ApiConnector } from "../../commons/connector/ApiConnector";
import { ApiReturnType } from "@shared/APIReturnType";
import { formatDateTimeLocal } from "../../commons/utils/helper";
import { EpochOverview } from "@shared/dtos/epoch.dto";
import FirstEpoch from "src/components/commons/Epoch/FirstEpoch";

const Epoch: React.FC = () => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<(number | string | null)[]>([]);
  const history = useHistory();
  const { onDetailView } = useSelector(({ user }: RootState) => user);
  const epochNo = useSelector(({ system }: RootState) => system.currentEpoch?.no);
  const { pageInfo, setSort } = usePageInfo();
  const [epochData, setEpochData] = useState<ApiReturnType<EpochOverview[]>>();
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);

  const apiConnector: ApiConnector = ApiConnector.getApiConnector();

  function updateData(page: number) {
    pageInfo.page = page;
    apiConnector.getEpochs(pageInfo).then((data: ApiReturnType<EpochOverview[]>) => {
      setLoading(false);
      setEpochData(data);
    });
  }

  useEffect(() => {
    updateData(0);
  }, []);

  const EPOCH_STATUS_MAPPING = {
    [EPOCH_STATUS.FINISHED]: t("common.epoch.finished"),
    [EPOCH_STATUS.IN_PROGRESS]: t("common.epoch.inProgress"),
    [EPOCH_STATUS.REWARDING]: t("common.epoch.rewarding"),
    [EPOCH_STATUS.SYNCING]: t("common.epoch.cyncing")
  };

  // @ts-ignore
  const columns: Column<EpochOverview>[] = [
    {
      title: <Capitalize data-testid="epoch.table.epochTitle">{t("glossary.epoch")}</Capitalize>,
      key: "epochNumber",
      minWidth: "50px",
      render: (r, idx) => (
        <EpochNumber data-testid={`epoch.epochValue#${idx}`}>
          <Box display={"flex"} alignItems={"center"} justifyContent={"center"}>
            <StyledLink to={details.epoch(r.no)} data-testid={`blocks.table.value.epoch#${idx}`}>
              {r.no}
            </StyledLink>
            {/*<StatusTableRow status={r.status as keyof typeof EPOCH_STATUS}>*/}
            {/*  {EPOCH_STATUS_MAPPING[EPOCH_STATUS[r.status]]}*/}
            {/*</StatusTableRow>*/}
          </Box>
        </EpochNumber>
      )
    },
    {
      title: <Capitalize data-testid="epoch.table.startTimeTitle">{t("glossary.startTimestamp")}</Capitalize>,
      key: "startTime",
      minWidth: "100px",
      render: (r, idx) => (
        <DatetimeTypeTooltip>
          <BlueText data-testid={`epoch.table.startTimeValue#${idx}`}>
            {formatDateTimeLocal(r.startTime || "")}
          </BlueText>
        </DatetimeTypeTooltip>
      )
    },
    {
      title: <Capitalize data-testid="epoch.table.endTimeTitle">{t("glossary.endTimestamp")}</Capitalize>,
      key: "endTime",
      minWidth: "100px",
      render: (r, idx) => (
        <DatetimeTypeTooltip>
          <BlueText data-testid={`epoch.table.endTimeValue#${idx}`}>{formatDateTimeLocal(r.endTime || "")}</BlueText>
        </DatetimeTypeTooltip>
      )
    },
    {
      title: <Capitalize data-testid="epoch.table.blocksTitle">{t("filter.blocks")}</Capitalize>,
      key: "blkCount",
      minWidth: "100px",
      render: (r, idx) => <Blocks data-testid={`epoch.table.blocksValue#${idx}`}>{r.blkCount}</Blocks>,
      sort: ({ columnKey, sortValue }) => {
        sortValue ? setSort(`${columnKey},${sortValue}`) : setSort("");
      }
    }
  ];

  useEffect(() => {
    window.history.replaceState({}, document.title);
    document.title = t("head.page.epochsList");
  }, [t]);

  const handleOpenDetail = (_: React.MouseEvent, r: EpochOverview) => {
    history.push(details.epoch(r.no));
  };

  const handleExpandedRow = (data: EpochOverview) => {
    setSelected((prev) => {
      const isSelected = prev.includes(Number(data.no));

      if (isSelected) {
        return prev.filter((no) => no !== Number(data.no));
      } else {
        return [...prev, Number(data.no)];
      }
    });
  };

  const handleClose = () => {
    setSelected([]);
  };

  useEffect(() => {
    if (!onDetailView) handleClose();
  }, [onDetailView]);

  const latestEpoch = epochData ? epochData.data?.[0] : undefined;

  useEffect(() => {
    // Update key when new epoch for api callback
    if (epochNo !== undefined && latestEpoch?.no !== undefined && epochNo !== latestEpoch.no) setKey(epochNo);
  }, [epochNo, latestEpoch?.no]);

  const expandedEpochRowData = [
    { label: "Transaction Count", value: "txCount" },
    // { label: "Rewards Distributed", value: "rewardsDistributed", isFormatADA: true }, // TODO we might add it later
    { label: "Total Output", value: "outSum", isFormatADA: true }
  ];

  if (loading) return <CircularProgress />;

  return (
    <StyledContainer>
      <Card data-testid="epoch.epochsTitle" title={t("glossary.epochs")}>
        {latestEpoch && pageInfo.page == 0 && <FirstEpoch data={latestEpoch} onClick={handleOpenDetail} />}
        <Table
          data-testid="epoch.table"
          data={epochData?.data || []}
          columns={columns}
          total={{ title: t("common.totalEpochs"), count: epochData?.total || 0 }}
          onClickRow={handleOpenDetail}
          onClickExpandedRow={handleExpandedRow}
          rowKey="no"
          selected={selected}
          showTabView
          expandedTable
          expandedRowData={expandedEpochRowData}
        />
      </Card>
    </StyledContainer>
  );
};

export default Epoch;
