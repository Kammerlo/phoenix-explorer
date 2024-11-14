import { useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useParams } from "react-router-dom";

import BlockOverview from "src/components/BlockDetail/BlockOverview";
import NoRecord from "src/components/commons/NoRecord";

import { StyledContainer } from "./styles";
import { ApiConnector } from "../../commons/connector/ApiConnector";
import { ApiReturnType } from "../../commons/connector/types/APIReturnType";
import TransactionList from "../../components/TransactionLists";

const BlockDetail = () => {
  const { blockId } = useParams<{ blockId: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [blockData, setBlockData] = useState<ApiReturnType<Block>>();

  const apiConnector: ApiConnector = ApiConnector.getApiConnector();

  useEffect(() => {
    if (!blockId) return;
    window.history.replaceState({}, document.title);
    document.title = `Block ${blockId} | Cardano Blockchain Explorer`;
    apiConnector.getBlockDetail(blockId).then((data) => {
      setBlockData(data);
      setLoading(false);
    });
  }, [blockId]);

  if (loading) {
    return (
      <Box>
        <CircularProgress />
      </Box>
    );
  }
  if (loading && !blockData) return <NoRecord />;

  return (
    <StyledContainer>
      <BlockOverview data={blockData?.data} loading={loading} lastUpdated={blockData?.lastUpdated} />
      <TransactionList blockId={blockId} showTabView />
    </StyledContainer>
  );
};

export default BlockDetail;
