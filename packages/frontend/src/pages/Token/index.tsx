import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Skeleton, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { details } from "src/commons/routers";
import { formatNumberTotalSupply, getShortHash } from "src/commons/utils/helper";
import Table, { Column } from "src/components/commons/Table";
import CustomTooltip from "src/components/commons/CustomTooltip";
import FormNowMessage from "src/components/commons/FormNowMessage";
import usePageInfo from "src/hooks/usePageInfo";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { ApiReturnType } from "@shared/APIReturnType";
import { ITokenOverview } from "@shared/dtos/token.dto";
import { Actions, TimeDuration } from "src/components/TransactionLists/styles";
import { StyledContainer } from "./styles";

// ─── (TypeBadge removed — tokenType not returned by list endpoint) ─────────

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SKELETON_COUNT = 20;

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
          {/* Asset */}
          <Box sx={{ flex: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
            <Skeleton variant="circular" width={28} height={28} />
            <Box>
              <Skeleton variant="text" width={120} height={16} />
              <Skeleton variant="rounded" width={40} height={14} sx={{ mt: 0.4, borderRadius: "9px" }} />
            </Box>
          </Box>
          {/* Type */}
          <Box sx={{ flex: 0.7 }}>
            <Skeleton variant="rounded" width={32} height={18} sx={{ borderRadius: "9px" }} />
          </Box>
          {/* Supply */}
          <Box sx={{ flex: 1.5 }}><Skeleton variant="text" width="70%" /></Box>
          {/* Tx Count */}
          <Box sx={{ flex: 0.8 }}><Skeleton variant="text" width="50%" /></Box>
          {/* Created At */}
          <Box sx={{ flex: 1.2 }}><Skeleton variant="text" width="80%" /></Box>
        </Box>
      ))}
    </Box>
  );
};

// ─── Token list ───────────────────────────────────────────────────────────────

const Tokens: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pageInfo } = usePageInfo();
  const [fetchData, setFetchData] = useState<ApiReturnType<ITokenOverview[]>>();
  const [loading, setLoading] = useState(true);
  const apiConnector = ApiConnector.getApiConnector();

  function updateData(page: number) {
    setLoading(true);
    apiConnector.getTokensPage({ ...pageInfo, page }).then((data: ApiReturnType<ITokenOverview[]>) => {
      setFetchData(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    document.title = "Native Tokens | Phoenix Explorer";
    updateData(0);
  }, []);

  const columns: Column<ITokenOverview>[] = [
    {
      title: <Box data-testid="tokens.table.title.assetName">Asset</Box>,
      key: "assetName",
      minWidth: "200px",
      render: (r, idx) => (
        <Box
          display="flex"
          alignItems="center"
          gap={1.5}
          sx={{ cursor: "pointer" }}
          onClick={() => navigate(details.token(r.fingerprint ?? ""))}
        >
          {/* Logo or placeholder */}
          {r.metadata?.logo ? (
            <Box
              component="img"
              src={r.metadata.logo}
              alt=""
              sx={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.65rem",
                fontWeight: 700,
                color: "primary.main",
                flexShrink: 0,
                letterSpacing: 0
              }}
            >
              {(r.metadata?.ticker || r.displayName || "?").slice(0, 2).toUpperCase()}
            </Box>
          )}
          <Box>
            <Box
              data-testid={`token.assetName#${idx}`}
              sx={{ color: "primary.main", fontWeight: 600, fontSize: "0.87rem", lineHeight: 1.2 }}
            >
              {r.displayName || getShortHash(r.fingerprint || "")}
            </Box>
            {r.metadata?.ticker && (
              <Box sx={{ fontSize: "0.68rem", color: "secondary.light", mt: 0.2 }}>
                {r.metadata.ticker}
              </Box>
            )}
          </Box>
        </Box>
      )
    },
    {
      title: (
        <CustomTooltip title="Token supply scaled by registered decimals where available, otherwise raw on-chain quantity. Hover the row for the asset's full fingerprint.">
          <Box
            data-testid="tokens.table.title.totalSupply"
            component="span"
            sx={{ cursor: "help", borderBottom: "1px dashed", borderColor: "secondary.light", display: "inline-block", lineHeight: 1.4 }}
          >
            {t("common.totalSupply")}
          </Box>
        </CustomTooltip>
      ),
      key: "supply",
      minWidth: "140px",
      render: (r) => (
        <Box sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
          {formatNumberTotalSupply(r?.supply, r?.metadata?.decimals || 0)}
        </Box>
      )
    }
  ];

  const toTokenDetail = (_: React.MouseEvent<Element, MouseEvent>, r: ITokenOverview) => {
    if (!r.fingerprint) return;
    navigate(details.token(r.fingerprint));
  };

  return (
    <StyledContainer>
      <Box mb={2} px={2}>
        <Typography variant="h5" fontWeight={700} component="h1">Native Tokens</Typography>
      </Box>
      <Actions>
        <TimeDuration>
          <FormNowMessage time={fetchData?.lastUpdated || 0} />
        </TimeDuration>
      </Actions>

      {loading ? (
        <SkeletonRows />
      ) : (
        <Table
          data={fetchData?.data || []}
          columns={columns}
          total={{ title: "Total", count: fetchData?.total || 0 }}
          onClickRow={toTokenDetail}
          rowKey="fingerprint"
          tableWrapperProps={{
            sx: (theme) => ({
              minHeight: "70vh",
              [theme.breakpoints.down("md")]: { minHeight: "60vh" },
              [theme.breakpoints.down("sm")]: { minHeight: "50vh" }
            })
          }}
          pagination={{
            ...pageInfo,
            total: fetchData?.total || 0,
            page: fetchData?.currentPage || 0,
            size: fetchData?.pageSize || pageInfo.size,
            onChange: (page) => updateData(page),
            hideLastPage: true
          }}
        />
      )}
    </StyledContainer>
  );
};

export default Tokens;
