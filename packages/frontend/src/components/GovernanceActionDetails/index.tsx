import { Box, CircularProgress } from "@mui/material";
import { useHistory, useParams } from "react-router-dom";

import { details } from "src/commons/routers";
import { CCGorvernanceVote, DescriptionIcon, PencilIcon } from "src/commons/resources";

import CustomAccordion, { TTab } from "../commons/CustomAccordion";
import Description from "./Description";
import OverviewHeader from "./OverviewHeader";
import VotesOverview from "./VotesOverview";
import CreatedBy from "./CreatedBy";
import GovernanceVotesTable from "./GovernanceVotesTable";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { GovActionVote, GovernanceActionDetail } from "@shared/dtos/GovernanceOverview";
import { useEffect, useState } from "react";
import NotFound from "src/pages/NotFound";

export default function GovernanceActionDetailsComponent() {
  const history = useHistory();

  const pathArray = history.location.pathname.split("/").filter(Boolean);
  const apiConnector = ApiConnector.getApiConnector();
  const [loading, setLoading] = useState(true);
  const [votesLoading, setVotesLoading] = useState(true);
  const [data, setData] = useState<GovernanceActionDetail | null>(null);
  const [votesData, setVotesData] = useState<GovActionVote[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { txHash, index } = useParams<{ txHash: string; index: string }>();
  useEffect(() => {
    apiConnector.getGovernanceDetail(txHash, index).then((response) => {
      setData(response.data);
      setLoading(false);
      if (!response.data) setError("No data found");
      setError(response.error);
    });
    apiConnector.getGovernanceActionVotes(txHash, index).then((response) => {
      setVotesLoading(false);
      setVotesData(response.data);
    });
  }, [txHash, index]);
  if (loading)
    return (
      <Box width={"100%"} height={"100%"}>
        <CircularProgress />
      </Box>
    );

  if (!data || error) {
    return (
      <Box width={"100%"} height={"100%"}>
        <NotFound />
      </Box>
    );
  }
  
  return (
    <Box>
      <OverviewHeader data={data} />
      
      <Box sx={{ marginTop: 3 }}>
        {votesData && !votesLoading && (
          <GovernanceVotesTable votes={votesData} />
        )}
      </Box>
    </Box>
  );
}
