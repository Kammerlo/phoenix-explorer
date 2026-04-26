import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Container, Paper, Skeleton, Tooltip, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { MdContentCopy } from "react-icons/md";
import { HiArrowLongLeft } from "react-icons/hi2";

import { ApiConnector } from "src/commons/connector/ApiConnector";
import { details } from "src/commons/routers";
import { ITokenOverview } from "@shared/dtos/token.dto";
import { ApiReturnType } from "@shared/APIReturnType";
import Table, { Column } from "src/components/commons/Table";
import FormNowMessage from "src/components/commons/FormNowMessage";
import { formatNumberTotalSupply, getShortHash } from "src/commons/utils/helper";
import { Actions, TimeDuration } from "src/components/TransactionLists/styles";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const PolicySkeleton: React.FC = () => {
  const theme = useTheme();
  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          mb: 3,
          border: `1px solid ${
            theme.isDark
              ? alpha(theme.palette.secondary.light, 0.1)
              : theme.palette.primary[200] || "#e8edf2"
          }`
        }}
      >
        <Skeleton variant="text" width="25%" height={28} />
        <Skeleton variant="text" width="55%" height={18} sx={{ mt: 1 }} />
        <Skeleton variant="text" width="15%" height={16} sx={{ mt: 1 }} />
      </Paper>
      {Array.from({ length: 8 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
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
          <Box sx={{ flex: 2 }}><Skeleton variant="text" width="60%" /></Box>
          <Box sx={{ flex: 1.5 }}><Skeleton variant="text" width="70%" /></Box>
          <Box sx={{ flex: 1 }}><Skeleton variant="text" width="50%" /></Box>
        </Box>
      ))}
    </Box>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

// ─── Component ────────────────────────────────────────────────────────────────

const PolicyDetail: React.FC = () => {
  const { policyId } = useParams<{ policyId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const [fetchData, setFetchData] = useState<ApiReturnType<ITokenOverview[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1); // 1-based — what the gateway expects
  const [size, setSize] = useState(50);

  useEffect(() => {
    document.title = `Policy ${policyId} | Cardano Explorer`;
    setLoading(true);
    ApiConnector.getApiConnector()
      .getTokensByPolicy(policyId, { page: String(page), size: String(size) })
      .then((data) => {
        setFetchData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [policyId, page, size]);

  const columns: Column<ITokenOverview>[] = [
    {
      title: "Token Name",
      key: "displayName",
      minWidth: "180px",
      render: (r) => (
        <Box
          sx={{ cursor: "pointer", color: "primary.main", fontWeight: 600, fontSize: "0.87rem" }}
          onClick={() => navigate(details.token(r.fingerprint))}
        >
          {r.displayName || "(unnamed)"}
        </Box>
      )
    },
    {
      title: "Asset ID",
      key: "fingerprint",
      minWidth: "130px",
      render: (r) => (
        <Box sx={{ fontFamily: "monospace", fontSize: "0.82rem", color: "secondary.light" }}>
          {getShortHash(r.fingerprint ?? "")}
        </Box>
      )
    },
    {
      title: "Total Supply",
      key: "supply",
      minWidth: "120px",
      render: (r) => (
        <Box sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
          {formatNumberTotalSupply(r.supply)}
        </Box>
      )
    }
  ];

  const tokenCount = fetchData?.total ?? fetchData?.data?.length ?? 0;

  return (
    <Container sx={{ pt: 3, pb: 6 }}>
      {/* Back button */}
      <Box
        display="flex"
        alignItems="center"
        gap={0.75}
        mb={2.5}
        sx={{
          cursor: "pointer",
          color: "secondary.light",
          "&:hover": { color: "text.primary" },
          fontSize: "0.85rem",
          width: "fit-content"
        }}
        onClick={() => navigate(-1)}
      >
        <HiArrowLongLeft size={18} />
        Back
      </Box>

      {/* Policy header */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          mb: 3,
          border: `1px solid ${
            theme.isDark
              ? alpha(theme.palette.secondary.light, 0.1)
              : theme.palette.primary[200] || "#e8edf2"
          }`
        }}
      >
        <Typography variant="h5" fontWeight={800} color="text.primary" mb={1}>
          Policy Detail
        </Typography>
        <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
          <Box sx={{ fontFamily: "monospace", fontSize: "0.78rem", color: "text.secondary", wordBreak: "break-all" }}>
            {policyId}
          </Box>
          <Tooltip title="Copy policy ID">
            <Box
              component="span"
              onClick={() => copyToClipboard(policyId)}
              sx={{
                cursor: "pointer",
                color: "secondary.light",
                display: "inline-flex",
                "&:hover": { color: "primary.main" }
              }}
            >
              <MdContentCopy size={13} />
            </Box>
          </Tooltip>
        </Box>
        {fetchData?.data && (
          <Box sx={{ mt: 1, fontSize: "0.82rem", color: "secondary.light" }}>
            {tokenCount} token{tokenCount !== 1 ? "s" : ""} under this policy
          </Box>
        )}
      </Paper>

      {loading ? (
        <PolicySkeleton />
      ) : (
        <>
          <Actions>
            <TimeDuration>
              <FormNowMessage time={fetchData?.lastUpdated || 0} />
            </TimeDuration>
          </Actions>
          <Table
            columns={columns}
            data={fetchData?.data ?? []}
            total={{ count: tokenCount, title: "Tokens" }}
            rowKey="fingerprint"
            tableWrapperProps={{
              sx: (t) => ({
                minHeight: "50vh",
                [t.breakpoints.down("sm")]: { minHeight: "40vh" }
              })
            }}
            pagination={{
              page: fetchData?.currentPage ?? 0, // 0-based for FooterTable
              size: fetchData?.pageSize ?? size,
              total: tokenCount,
              onChange: (newPage, newSize) => {
                setPage(newPage);
                if (newSize) setSize(newSize);
              },
              hideLastPage: true
            }}
            onClickRow={(_e, r) => navigate(details.token(r.fingerprint))}
          />
        </>
      )}
    </Container>
  );
};

export default PolicyDetail;
