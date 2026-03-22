import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import { MdContentCopy } from "react-icons/md";

import { ApiConnector } from "src/commons/connector/ApiConnector";
import { details } from "src/commons/routers";
import { ITokenOverview } from "@shared/dtos/token.dto";
import { ApiReturnType } from "@shared/APIReturnType";
import Card from "src/components/commons/Card";
import Table, { Column } from "src/components/commons/Table";
import { formatNumberTotalSupply, getShortHash } from "src/commons/utils/helper";

const PolicyDetail: React.FC = () => {
  const { policyId } = useParams<{ policyId: string }>();
  const navigate = useNavigate();
  const [fetchData, setFetchData] = useState<ApiReturnType<ITokenOverview[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    document.title = `Policy ${policyId} | Cardano Blockchain Explorer`;
    const apiConnector = ApiConnector.getApiConnector();
    setLoading(true);
    apiConnector
      .getTokensByPolicy(policyId, { page: String(page), size: "50" })
      .then((data) => {
        setFetchData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [policyId, page]);

  const handleCopy = () => {
    navigator.clipboard.writeText(policyId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const columns: Column<ITokenOverview>[] = [
    {
      title: "Token Name",
      key: "displayName",
      render: (r) => (
        <Typography
          variant="body2"
          sx={{ cursor: "pointer", color: "primary.main" }}
          onClick={() => navigate(details.token(r.fingerprint))}
        >
          {r.displayName || "(unnamed)"}
        </Typography>
      )
    },
    {
      title: "Asset ID",
      key: "fingerprint",
      render: (r) => (
        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
          {getShortHash(r.fingerprint ?? "")}
        </Typography>
      )
    },
    {
      title: "Total Supply",
      key: "supply",
      render: (r) => <Typography variant="body2">{formatNumberTotalSupply(r.supply)}</Typography>
    }
  ];

  const tokenCount = fetchData?.total ?? fetchData?.data?.length ?? 0;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: "auto" }}>
      <Typography variant="h5" fontWeight="bold" mb={1}>
        Policy Detail
      </Typography>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Typography variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
          {policyId}
        </Typography>
        <Tooltip title={copied ? "Copied!" : "Copy policy ID"}>
          <IconButton size="small" onClick={handleCopy}>
            <MdContentCopy />
          </IconButton>
        </Tooltip>
      </Box>

      {fetchData?.data && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {tokenCount} token{tokenCount !== 1 ? "s" : ""} under this policy
        </Typography>
      )}

      <Card>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Table
            columns={columns}
            data={fetchData?.data ?? []}
            total={{ count: tokenCount, title: "Tokens" }}
            loading={loading}
            pagination={{
              page,
              size: 50,
              total: tokenCount,
              onChange: (newPage) => setPage(newPage)
            }}
            onClickRow={(_e, r) => navigate(details.token(r.fingerprint))}
          />
        )}
      </Card>
    </Box>
  );
};

export default PolicyDetail;
