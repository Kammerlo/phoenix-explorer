import { useSelector } from "react-redux";
import React, { useEffect, useState, useRef, MouseEvent } from "react";
import { Box, CircularProgress } from "@mui/material";
import { stringify } from "qs";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Column } from "src/types/table";
import { details } from "src/commons/routers";
import Card from "src/components/commons/Card";
import Table from "src/components/commons/Table";
import Link from "src/components/commons/Link";
import { Capitalize } from "src/components/commons/CustomText/styles";
import FormNowMessage from "src/components/commons/FormNowMessage";
import usePageInfo from "src/commons/hooks/usePageInfo";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";

import { PriceWrapper, StyledContainer, StyledLink, Actions, TimeDuration } from "./styles";
import { ApiConnector } from "../../commons/connector/ApiConnector";
import CustomTooltip from "../commons/CustomTooltip";
import { getShortHash } from "../../commons/utils/helper";
import { TooltipIcon } from "../../commons/resources";
import { ApiReturnType } from "../../commons/connector/types/APIReturnType";
import { APIResponse } from "@playwright/test";
import { ParsedUrlQuery } from "querystring";

interface BlockListComponentProps {}
const BlockListComponent: React.FC<BlockListComponentProps> = ({}) => {
  const { t } = useTranslation();
  const history = useHistory();
  const { onDetailView } = useSelector(({ user }: RootState) => user);
  const { pageInfo } = usePageInfo();
  const [selected, setSelected] = useState<(number | string | null)[]>([]);
  const mainRef = useRef(document.querySelector("#main"));
  const [fetchData, setFetchData] = useState<ApiReturnType<Block[]>>();
  const [loading, setLoading] = useState(true);

  const apiConnector: ApiConnector = ApiConnector.getApiConnector();

  function updateData(page: number) {
    pageInfo.page = page;
    apiConnector.getBlocksPage(pageInfo).then((data) => {
      setFetchData(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    updateData(0);
  }, []);

  const expandedBlockRowData = [
    { label: "Transactions", value: "txCount" },
    { label: "Fees", value: "totalFees", isFormatADA: true },
    { label: "Output", value: "totalOutput", isFormatADA: true }
  ];

  const columns: Column<Block>[] = [
    {
      title: <Capitalize data-testid="blocks.table.title.block">{t("glossary.block")}</Capitalize>,
      key: "blockNo",
      minWidth: "50px",
      render: (r, index) => {
        return (
          <Link to={details.block(r.blockNo)}>
            <span data-testid={`blocks.table.value.block#${index}`}>{r.blockNo}</span>
          </Link>
        );
      }
    },
    {
      title: <Capitalize data-testid="blocks.table.title.blockId">{t("glossary.blockID")}</Capitalize>,
      key: "hash",
      minWidth: "50px",
      render: (r, index) => (
        <CustomTooltip title={r.hash}>
          <StyledLink to={details.block(r.blockNo || r.hash)} data-testid={`blocks.table.value.blockId#${index}`}>
            {getShortHash(`${r.hash}`)}
          </StyledLink>
        </CustomTooltip>
      )
    },
    {
      title: <Capitalize data-testid="blocks.table.title.epoch"> {t("glossary.epoch")}</Capitalize>,
      key: "epoch",
      minWidth: "50px",
      render: (r, index) => (
        <StyledLink to={details.epoch(r.epochNo)} data-testid={`blocks.table.value.epoch#${index}`}>
          {r.epochNo}
        </StyledLink>
      )
    },
    {
      title: (
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Capitalize data-testid="blocks.table.title.slot">{t("glossary.slot")}</Capitalize>
        </Box>
      ),
      key: "epochSlot",
      minWidth: "100px",
      render: (r, index) => <Box data-testid={`blocks.table.value.slot#${index}`}>{r.epochSlotNo}</Box>
    },
    {
      title: (
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Capitalize data-testid="blocks.table.title.absoluteSlot">{t("glossary.absoluteSlot")}</Capitalize>{" "}
          <CustomTooltip title={t("common.absoluteSlot")}>
            <p>
              <TooltipIcon />
            </p>
          </CustomTooltip>
        </Box>
      ),
      key: "slot",
      minWidth: "100px",
      render: (r, index) => <Box data-testid={`blocks.table.value.absSlot#${index}`}>{r.slotNo}</Box>
    },
    {
      title: <Capitalize data-testid="blocks.table.title.createAt">{t("createdAt")}</Capitalize>,
      key: "time",
      minWidth: "100px",
      render: (r, index) => (
        <DatetimeTypeTooltip>
          <PriceWrapper data-testid={`blocks.table.value.createAt#${index}`}>{r.time}</PriceWrapper>
        </DatetimeTypeTooltip>
      )
    }
  ];

  const handleOpenDetail = (_: MouseEvent<Element, globalThis.MouseEvent>, r: Block) => {
    history.push(details.block(r.blockNo));
  };

  const handleClose = () => {
    setSelected([]);
  };

  useEffect(() => {
    if (!onDetailView) handleClose();
  }, [onDetailView]);

  const handleExpandedRow = (data: Block) => {
    setSelected((prev) => {
      const isSelected = prev.includes(Number(data.blockNo));

      if (isSelected) {
        return prev.filter((blockNo) => blockNo !== Number(data.blockNo));
      } else {
        return [...prev, Number(data.blockNo)];
      }
    });
  };

  if (loading) return <CircularProgress />;

  return (
    <>
      <Table
        data={fetchData?.data}
        columns={columns}
        total={{ title: t("common.totalBlocks"), count: fetchData?.total || 0 }}
        pagination={{
          ...pageInfo,
          total: fetchData?.total,
          onChange: (page) => {
            updateData(page);
          },
          handleCloseDetailView: handleClose
        }}
        onClickRow={handleOpenDetail}
        rowKey={(r: Block) => r.blockNo || r.hash}
        selected={selected}
        showTabView
        tableWrapperProps={{ sx: (theme) => ({ [theme.breakpoints.between("sm", "md")]: { minHeight: "60vh" } }) }}
        onClickExpandedRow={handleExpandedRow}
        expandedTable
        expandedRowData={expandedBlockRowData}
      />
    </>
  );
};

export default BlockListComponent;
