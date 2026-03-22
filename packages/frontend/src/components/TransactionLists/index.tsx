import React, { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Chip, Skeleton, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { formatADAFull, getShortHash } from "src/commons/utils/helper";
import { details } from "src/commons/routers";
import usePageInfo from "src/commons/hooks/usePageInfo";

import CustomTooltip from "../commons/CustomTooltip";
import ADAicon from "../commons/ADAIcon";
import FormNowMessage from "../commons/FormNowMessage";
import Table, { Column } from "../commons/Table";
import DatetimeTypeTooltip from "../commons/DatetimeTypeTooltip";
import { Actions, StyledLink, TimeDuration } from "./styles";
import { ApiReturnType } from "@shared/APIReturnType";
import { Transaction } from "@shared/dtos/transaction.dto";
import NotAvailable from "../commons/NotAvailable";

// ─── Skeleton loading ─────────────────────────────────────

const SKELETON_COUNT = 12;

const SkeletonRows: React.FC = () => {
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
            borderBottom: `1px solid ${theme.isDark ? alpha(theme.palette.secondary.light, 0.08) : theme.palette.primary[200] || "#f0f0f0"}`
          }}
        >
          {/* Transaction hash + time */}
          <Box sx={{ flex: 2, minWidth: 0 }}>
            <Skeleton variant="text" width="52%" height={16} />
            <Skeleton variant="text" width="32%" height={12} sx={{ mt: 0.4 }} />
          </Box>
          {/* Block / Epoch */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="55%" height={16} />
          </Box>
          {/* I → O */}
          <Box sx={{ flex: 0.7 }}>
            <Skeleton variant="text" width="60%" height={16} />
          </Box>
          {/* Volume */}
          <Box sx={{ flex: 1.3, minWidth: 0 }}>
            <Skeleton variant="text" width="70%" height={16} />
          </Box>
          {/* Fee */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="55%" height={16} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// ─── Component ────────────────────────────────────────────

interface TransactionListProps {
  underline?: boolean;
  showTabView?: boolean;
  transactions: ApiReturnType<Transaction[]>;
  updateData?: (page: number) => void;
  loading: boolean;
  paginated?: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  loading,
  updateData,
  paginated = false
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { pageInfo } = usePageInfo();

  const onClickRow = (e: MouseEvent<Element, globalThis.MouseEvent>, r: Transaction) => {
    if (e.target instanceof HTMLAnchorElement || (e.target instanceof Element && e.target.closest("a"))) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    navigate(details.transaction(r.hash));
  };

  const columns: Column<Transaction>[] = [
    {
      title: (
        <Box sx={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {t("glossary.txhash")}
        </Box>
      ),
      key: "hash",
      minWidth: 140,
      render: (r, index) => (
        <Box>
          <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
            <CustomTooltip title={r.hash}>
              <StyledLink
                data-testid={`transaction.table.value.txhash#${index}`}
                to={details.transaction(r.hash)}
                style={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.85rem" }}
              >
                {getShortHash(r.hash)}
              </StyledLink>
            </CustomTooltip>
            {r.tokens?.length > 0 && (
              <Chip
                label={`${r.tokens.length} token${r.tokens.length > 1 ? "s" : ""}`}
                size="small"
                sx={{
                  height: 16,
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  "& .MuiChip-label": { px: 0.75 }
                }}
              />
            )}
          </Box>
          <Box sx={{ fontSize: "0.72rem", color: "secondary.light", mt: 0.3 }}>
            <DatetimeTypeTooltip>{r.time}</DatetimeTypeTooltip>
          </Box>
        </Box>
      )
    },
    {
      title: (
        <Box sx={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {t("glossary.block")}
        </Box>
      ),
      key: "block",
      minWidth: 80,
      render: (r, index) => (
        <Box>
          <StyledLink
            to={details.block(r.blockNo || r.blockHash)}
            data-testid={`transactions.table.block#${r.blockNo}`}
            style={{ fontWeight: 700, fontSize: "0.85rem" }}
          >
            {r.blockNo?.toLocaleString()}
          </StyledLink>
          <Box sx={{ fontSize: "0.72rem", color: "secondary.light", mt: 0.3 }}>
            <StyledLink to={details.epoch(r.epochNo)} style={{ color: "inherit" }}>
              Epoch {r.epochNo}
            </StyledLink>
          </Box>
        </Box>
      )
    },
    {
      title: (
        <CustomTooltip title="Number of input and output UTXOs in this transaction">
          <Box sx={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "default" }}>
            In / Out
          </Box>
        </CustomTooltip>
      ),
      key: "addressesInput",
      minWidth: 70,
      render: (r) => {
        const inCount = r.addressesInput?.length ?? 0;
        const outCount = r.addressesOutput?.length ?? 0;
        if (inCount === 0 && outCount === 0) {
          return <Box sx={{ color: "secondary.light", fontSize: "0.82rem" }}>—</Box>;
        }
        return (
          <Box
            display="flex"
            alignItems="center"
            gap={0.5}
            sx={{ fontSize: "0.82rem", fontWeight: 600, color: "secondary.main", whiteSpace: "nowrap" }}
          >
            {inCount > 0 && (
              <Box component="span" sx={{ color: theme.palette.error.light, fontWeight: 700 }}>
                {inCount}
              </Box>
            )}
            {inCount > 0 && outCount > 0 && (
              <Box component="span" sx={{ color: "secondary.light", fontSize: "0.7rem" }}>→</Box>
            )}
            {outCount > 0 && (
              <Box component="span" sx={{ color: theme.palette.success.main, fontWeight: 700 }}>
                {outCount}
              </Box>
            )}
          </Box>
        );
      }
    },
    {
      title: (
        <Box sx={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {t("glossary.totalOutputInAda")}
        </Box>
      ),
      key: "totalOutput",
      minWidth: 120,
      render: (r) => (
        <Box display="inline-flex" alignItems="center" gap={0.35} sx={{ fontWeight: 700, fontSize: "0.88rem" }}>
          <span>{formatADAFull(r.totalOutput)}</span>
          <ADAicon />
        </Box>
      )
    },
    {
      title: (
        <Box sx={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {t("common.fees")}
        </Box>
      ),
      key: "fee",
      minWidth: 100,
      render: (r) => (
        <Box
          display="inline-flex"
          alignItems="center"
          gap={0.35}
          sx={{ fontSize: "0.82rem", color: "secondary.light", fontWeight: 500 }}
        >
          <span>{formatADAFull(r.fee)}</span>
          <ADAicon />
        </Box>
      )
    }
  ];

  if (transactions?.error) return <NotAvailable />;

  return (
    <>
      {!transactions?.error && (
        <Actions>
          <TimeDuration>
            <FormNowMessage time={transactions?.lastUpdated || 0} />
          </TimeDuration>
        </Actions>
      )}

      {loading ? (
        <SkeletonRows />
      ) : (
        <Table
          data={transactions?.data || []}
          columns={columns}
          onClickRow={onClickRow}
          rowKey="hash"
          total={paginated ? { title: t("common.totalTransactions"), count: transactions?.total || 0 } : undefined}
          tableWrapperProps={{
            sx: (theme) => ({
              minHeight: "60vh",
              [theme.breakpoints.down("md")]: { minHeight: "50vh" },
              [theme.breakpoints.down("sm")]: { minHeight: "40vh" }
            })
          }}
          pagination={
            paginated && updateData
              ? {
                  ...pageInfo,
                  total: transactions?.total || 0,
                  page: transactions?.currentPage || 0,
                  size: transactions?.pageSize || pageInfo.size,
                  onChange: (page) => updateData(page),
                  hideLastPage: true
                }
              : undefined
          }
        />
      )}
    </>
  );
};

export default TransactionList;
