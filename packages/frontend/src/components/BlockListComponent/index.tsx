// @ts-ignore
import React, { MouseEvent } from "react";
import { Box, Skeleton, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Column } from "src/types/table";
import { details } from "src/commons/routers";
import Table from "src/components/commons/Table";
import Link from "src/components/commons/Link";
import { Capitalize } from "src/components/commons/CustomText/styles";
import FormNowMessage from "src/components/commons/FormNowMessage";
import usePageInfo from "src/hooks/usePageInfo";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import { BlockFillBarMini } from "src/components/commons/BlockFillBar";
import CustomTooltip from "../commons/CustomTooltip";
import { getShortHash, formatDateTimeLocal } from "src/commons/utils/helper";

import { PriceWrapper, StyledLink } from "./styles";
import { Block } from "@shared/dtos/block.dto";
import { ApiReturnType } from "@shared/APIReturnType";
import { Actions, TimeDuration } from "../TransactionLists/styles";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SKELETON_COUNT = 10;

const BlockListSkeleton: React.FC = () => {
  const theme = useTheme();
  return (
    <Box>
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: 2,
            py: 1.5,
            borderBottom: `1px solid ${
              theme.isDark
                ? alpha(theme.palette.secondary.light, 0.08)
                : theme.palette.primary[200] || "#f0f0f0"
            }`
          }}
        >
          <Box sx={{ flex: 0.8 }}><Skeleton variant="text" width="50%" /></Box>
          <Box sx={{ flex: 1.2 }}><Skeleton variant="text" width="70%" /></Box>
          <Box sx={{ flex: 0.8 }}><Skeleton variant="text" width="60%" /></Box>
          <Box sx={{ flex: 0.5 }}><Skeleton variant="text" width="40%" /></Box>
          <Box sx={{ flex: 1.2 }}>
            <Skeleton variant="text" width="80%" height={8} sx={{ borderRadius: 3 }} />
            <Skeleton variant="text" width="30%" height={12} sx={{ mt: 0.4 }} />
          </Box>
          <Box sx={{ flex: 1 }}><Skeleton variant="text" width="65%" /></Box>
          <Box sx={{ flex: 1.2 }}><Skeleton variant="text" width="75%" /></Box>
        </Box>
      ))}
    </Box>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

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
      hideBelow: "md",
      render: (r) => {
        if (!r.slotLeader) return <Box sx={{ color: "secondary.light" }}>—</Box>;
        const isPoolId = /^pool1[a-z0-9]+$/i.test(r.slotLeader);
        const hasMeta = Boolean(r.poolTicker || r.poolName);
        return (
          <CustomTooltip title={r.slotLeader}>
            {isPoolId ? (
              hasMeta ? (
                <StyledLink to={details.delegation(r.slotLeader)}>
                  {r.poolTicker ? `[${r.poolTicker}]` : r.poolName}
                </StyledLink>
              ) : (
                <StyledLink to={details.delegation(r.slotLeader)}>
                  <Box component="span" sx={{ display: "inline-flex", flexDirection: "column", lineHeight: 1.1 }}>
                    <Box component="span" sx={{ color: "secondary.light", fontStyle: "italic" }}>Unknown pool</Box>
                    <Box component="span" sx={{ fontSize: "0.7rem", color: "secondary.light", fontFamily: "monospace" }}>
                      {getShortHash(r.slotLeader)}
                    </Box>
                  </Box>
                </StyledLink>
              )
            ) : (
              <Box component="span" sx={{ color: "secondary.main" }}>
                {r.slotLeader.replace(/-/g, " ").replace(/([A-Z])/g, " $1").trim().replace(/\s+/g, " ")}
              </Box>
            )}
          </CustomTooltip>
        );
      }
    },
    {
      title: <Capitalize data-testid="blocks.table.title.createAt">{t("createdAt")}</Capitalize>,
      key: "time",
      minWidth: "170px",
      hideBelow: "lg",
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

  if (loading) return <BlockListSkeleton />;

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
            overflowX: "auto",
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
