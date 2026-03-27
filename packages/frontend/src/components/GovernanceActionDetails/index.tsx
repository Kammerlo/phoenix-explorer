import { Box, Button, Skeleton, Typography } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { HiArrowLongLeft } from "react-icons/hi2";

import OverviewHeader from "./OverviewHeader";
import GovernanceVotesTable from "./GovernanceVotesTable";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { GovActionVote, GovernanceActionDetail } from "@shared/dtos/GovernanceOverview";

function DetailSkeleton() {
  return (
    <Box>
      <Box mb={3}>
        <Skeleton variant="text" width={120} height={24} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="60%" height={44} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="40%" height={24} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="50%" height={24} />
      </Box>
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", lg: "1fr 1fr" }} gap={3} mb={3}>
        <Skeleton variant="rounded" height={420} />
        <Skeleton variant="rounded" height={420} />
      </Box>
      <Skeleton variant="rounded" height={300} />
    </Box>
  );
}

function ErrorState({ txHash, index }: { txHash?: string; index?: string }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ py: 8, textAlign: "center" }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Governance Action Not Found
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Could not load details for action{" "}
        <Box component="code" sx={{ fontSize: "12px", fontFamily: "var(--font-family-text)" }}>
          {txHash}#{index}
        </Box>
        . The proposal may not be indexed yet or the metadata anchor is unavailable.
      </Typography>
      <Button variant="outlined" startIcon={<HiArrowLongLeft />} onClick={() => navigate(-1)}>
        Go Back
      </Button>
    </Box>
  );
}

export default function GovernanceActionDetailsComponent() {
  const apiConnector = ApiConnector.getApiConnector();
  const [loading, setLoading] = useState(true);
  const [votesLoading, setVotesLoading] = useState(true);
  const [data, setData] = useState<GovernanceActionDetail | null>(null);
  const [votesData, setVotesData] = useState<GovActionVote[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { txHash, index } = useParams<{ txHash: string; index: string }>();

  useEffect(() => {
    setLoading(true);
    setVotesLoading(true);
    setError(null);
    setData(null);
    apiConnector.getGovernanceDetail(txHash, index).then((response) => {
      setData(response.data);
      setLoading(false);
      if (response.error) setError(response.error);
    });
    apiConnector.getGovernanceActionVotes(txHash, index).then((response) => {
      setVotesData(response.data ?? []);
      setVotesLoading(false);
    });
  }, [txHash, index]);

  if (loading) return <DetailSkeleton />;

  if (error || !data) {
    return <ErrorState txHash={txHash} index={index} />;
  }

  return (
    <Box>
      <OverviewHeader data={data} />
      <Box sx={{ mt: 3 }}>
        <GovernanceVotesTable votes={votesData} loading={votesLoading} />
      </Box>
    </Box>
  );
}
