import React, { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Box, LinearProgress, Skeleton, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { numberWithCommas, truncateDecimals, getShortHash } from "src/commons/utils/helper";
import { details } from "src/commons/routers";
import { ApiReturnType } from "@shared/APIReturnType";
import { TokenHolder } from "@shared/dtos/token.dto";
import CustomTooltip from "../../commons/CustomTooltip";
import Table, { Column } from "../../commons/Table";
import { StyledLink } from "../../TransactionLists/styles";
import NotAvailable from "../../commons/NotAvailable";
import FormNowMessage from "src/components/commons/FormNowMessage";
import { Actions, TimeDuration } from "src/components/TransactionLists/styles";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SKELETON_COUNT = 15;

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
            borderBottom: `1px solid ${
              theme.isDark
                ? alpha(theme.palette.secondary.light, 0.08)
                : theme.palette.primary[200] || "#f0f0f0"
            }`
          }}
        >
          <Box sx={{ flex: 2 }}><Skeleton variant="text" width="80%" /></Box>
          <Box sx={{ flex: 1 }}><Skeleton variant="text" width="60%" /></Box>
          <Box sx={{ flex: 1.5 }}>
            <Skeleton variant="text" width="70%" height={8} sx={{ borderRadius: 3 }} />
            <Skeleton variant="text" width="30%" height={12} sx={{ mt: 0.4 }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

interface TokenHoldersProps {
  tokenHolders: ApiReturnType<TokenHolder[]>;
  updateData?: (page: number) => void;
  loading: boolean;
  paginated?: boolean;
}

const TokenHolders: React.FC<TokenHoldersProps> = ({
  tokenHolders,
  loading,
  updateData,
  paginated = true
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();

  const onClickRow = (e: MouseEvent<Element, globalThis.MouseEvent>, r: TokenHolder) => {
    if (e.target instanceof HTMLAnchorElement || (e.target instanceof Element && e.target.closest("a"))) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    navigate(details.address(r.address));
  };

  const columns: Column<TokenHolder>[] = [
    {
      title: <Box data-testid="tokenholders.table.title.address">{t("glossary.address")}</Box>,
      key: "address",
      minWidth: 140,
      render: (r, index) => (
        <CustomTooltip title={r.address}>
          <StyledLink to={details.address(r.address)} data-testid={`tokenholders.table.value.address#${index}`}>
            {getShortHash(r.address)}
          </StyledLink>
        </CustomTooltip>
      )
    },
    {
      title: <Box data-testid="tokenholders.table.title.amount">{t("glossary.amount")}</Box>,
      key: "amount",
      minWidth: 120,
      render: (r, index) => (
        <Box data-testid={`tokenholders.table.value.amount#${index}`} sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
          {r.amount != null ? numberWithCommas(r.amount) : <NotAvailable />}
        </Box>
      )
    },
    {
      title: <Box data-testid="tokenholders.table.title.ratio">Share</Box>,
      key: "ratio",
      minWidth: 130,
      render: (r, index) => {
        const pct = r.ratio ?? 0;
        return (
          <Box data-testid={`tokenholders.table.value.ratio#${index}`} sx={{ minWidth: 110 }}>
            <Box
              sx={{
                height: 5,
                borderRadius: 3,
                mb: 0.5,
                bgcolor: theme.isDark
                  ? alpha(theme.palette.secondary.light, 0.1)
                  : alpha(theme.palette.secondary.light, 0.15),
                overflow: "hidden"
              }}
            >
              <Box
                sx={{
                  width: `${Math.min(100, pct)}%`,
                  height: "100%",
                  borderRadius: 3,
                  bgcolor: "primary.main",
                  transition: "width 0.3s ease"
                }}
              />
            </Box>
            <Box sx={{ fontSize: "0.72rem", color: "secondary.light" }}>
              {r.ratio != null ? `${truncateDecimals(r.ratio, 2)}%` : <NotAvailable />}
            </Box>
          </Box>
        );
      }
    }
  ];

  if (loading) return <SkeletonRows />;

  return (
    <>
      <Actions>
        <TimeDuration>
          <FormNowMessage time={tokenHolders?.lastUpdated || 0} />
        </TimeDuration>
      </Actions>
      <Table
        columns={columns}
        data={tokenHolders?.data || []}
        total={{ title: "Total Holders", count: tokenHolders?.total || 0 }}
        error={tokenHolders?.error}
        onClickRow={onClickRow}
        rowKey="address"
        data-testid="token-holders-table"
        tableWrapperProps={{
          sx: (t) => ({
            minHeight: "50vh",
            [t.breakpoints.down("sm")]: { minHeight: "40vh" }
          })
        }}
        {...(paginated && updateData && tokenHolders
          ? {
              pagination: {
                page: tokenHolders.currentPage ?? 0,
                total: tokenHolders.total ?? 0,
                onChange: (page) => updateData(page),
                hideLastPage: true
              }
            }
          : {})}
      />
    </>
  );
};

export default TokenHolders;
