// @ts-ignore
import React, { MouseEvent } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Column } from "src/types/table";
import { details } from "src/commons/routers";
import Table from "src/components/commons/Table";
import Link from "src/components/commons/Link";
import { Capitalize } from "src/components/commons/CustomText/styles";
import FormNowMessage from "src/components/commons/FormNowMessage";
import usePageInfo from "src/commons/hooks/usePageInfo";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import { BlockFillBarMini } from "src/components/commons/BlockFillBar";
import CustomTooltip from "../commons/CustomTooltip";
import { getShortHash, formatDateTimeLocal } from "src/commons/utils/helper";

import { PriceWrapper, StyledLink } from "./styles";
import { Block } from "@shared/dtos/block.dto";
import { ApiReturnType } from "@shared/APIReturnType";
import { Actions, TimeDuration } from "../TransactionLists/styles";

interface BlockListComponentProps {
  fetchData?: ApiReturnType<Block[]>;
  updateData: ({ page, size }: { page: number; size?: number }) => void;
  loading?: boolean;
}

const BlockListComponent: React.FC<BlockListComponentProps> = ({ fetchData, updateData, loading }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pageInfo } = usePageInfo();

  const columns: Column<Block>[] = [
    {
      title: <Capitalize data-testid="blocks.table.title.block">{t("glossary.block")}</Capitalize>,
      key: "blockNo",
      minWidth: "60px",
      render: (r, index) => (
        <Link to={details.block(r.blockNo)}>
          <Box
            data-testid={`blocks.table.value.block#${index}`}
            sx={{ fontWeight: 700, fontSize: "0.9rem" }}
          >
            {r.blockNo?.toLocaleString()}
          </Box>
        </Link>
      )
    },
    {
      title: <Capitalize data-testid="blocks.table.title.blockId">{t("glossary.blockID")}</Capitalize>,
      key: "hash",
      minWidth: "100px",
      render: (r, index) => (
        <CustomTooltip title={r.hash}>
          <StyledLink
            to={details.block(r.blockNo || r.hash)}
            data-testid={`blocks.table.value.blockId#${index}`}
          >
            {getShortHash(`${r.hash}`)}
          </StyledLink>
        </CustomTooltip>
      )
    },
    {
      title: <Capitalize data-testid="blocks.table.title.epoch">{t("glossary.epoch")}</Capitalize>,
      key: "epoch",
      minWidth: "60px",
      render: (r, index) => (
        <StyledLink to={details.epoch(r.epochNo)} data-testid={`blocks.table.value.epoch#${index}`}>
          {r.epochNo}
          <Box component="span" sx={{ color: "secondary.light", fontSize: "0.78em", ml: 0.5 }}>
            / {r.epochSlotNo}
          </Box>
        </StyledLink>
      )
    },
    {
      title: (
        <Capitalize data-testid="blocks.table.title.txCount">{t("glossary.TxCount")}</Capitalize>
      ),
      key: "txCount",
      minWidth: "50px",
      render: (r, index) => (
        <Box data-testid={`blocks.table.value.txCount#${index}`} sx={{ fontWeight: 600 }}>
          {r.txCount}
        </Box>
      )
    },
    {
      title: (
        <Capitalize data-testid="blocks.table.title.fill">Fill</Capitalize>
      ),
      key: "size",
      minWidth: "110px",
      render: (r, index) => (
        <Box data-testid={`blocks.table.value.fill#${index}`} sx={{ pr: 1 }}>
          <BlockFillBarMini size={r.size} />
        </Box>
      )
    },
    {
      title: <Capitalize data-testid="blocks.table.title.producer">Producer</Capitalize>,
      key: "slotLeader",
      minWidth: "100px",
      render: (r) => {
        if (!r.slotLeader) return <Box sx={{ color: "secondary.light" }}>—</Box>;
        const label = r.poolTicker
          ? `[${r.poolTicker}]`
          : r.poolName || getShortHash(r.slotLeader);
        return (
          <CustomTooltip title={r.slotLeader}>
            <StyledLink to={details.delegation(r.slotLeader)}>
              {label}
            </StyledLink>
          </CustomTooltip>
        );
      }
    },
    {
      title: <Capitalize data-testid="blocks.table.title.createAt">{t("createdAt")}</Capitalize>,
      key: "time",
      minWidth: "130px",
      render: (r, index) => (
        <DatetimeTypeTooltip>
          <PriceWrapper data-testid={`blocks.table.value.createAt#${index}`}>
            {formatDateTimeLocal(r.time)}
          </PriceWrapper>
        </DatetimeTypeTooltip>
      )
    }
  ];

  const handleOpenDetail = (_: MouseEvent<Element, globalThis.MouseEvent>, r: Block) => {
    navigate(details.block(r.blockNo));
  };

  if (loading) return <CircularProgress />;

  return (
    <>
      <Actions>
        <TimeDuration>
          <FormNowMessage time={fetchData?.lastUpdated || 0} />
        </TimeDuration>
      </Actions>
      <Table
        data={fetchData?.data || []}
        columns={columns}
        total={{ title: t("common.totalBlocks"), count: fetchData?.total || 0 }}
        onClickRow={handleOpenDetail}
        rowKey={(r: Block) => r.blockNo || r.hash}
        tableWrapperProps={{
          sx: (theme) => ({
            minHeight: "70vh",
            maxHeight: "85vh",
            [theme.breakpoints.down("md")]: { minHeight: "60vh", maxHeight: "80vh" },
            [theme.breakpoints.down("sm")]: { minHeight: "50vh", maxHeight: "75vh" }
          })
        }}
        pagination={{
          ...pageInfo,
          total: fetchData?.total || 0,
          page: fetchData?.currentPage || 0,
          size: fetchData?.pageSize || pageInfo.size,
          onChange: (page, size) => updateData({ page, size }),
          hideLastPage: true
        }}
      />
    </>
  );
};

export default BlockListComponent;
