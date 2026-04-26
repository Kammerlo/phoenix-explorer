import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Container } from "@mui/material";

import EpochOverviewView from "src/components/EpochDetail/EpochOverview";
import BlockListComponent from "../../components/BlockListComponent";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { EpochOverview } from "@shared/dtos/epoch.dto";
import { Block } from "@shared/dtos/block.dto";
import { ApiReturnType } from "@shared/APIReturnType";

const EpochDetail: React.FC = () => {
  const { epochId } = useParams<{ epochId: string }>();
  const [data, setData] = useState<ApiReturnType<EpochOverview>>();
  const [fetchData, setFetchData] = useState<ApiReturnType<Block[]>>();
  const [loading, setLoading] = useState(true);
  const [blocksLoading, setBlocksLoading] = useState(true);

  const apiConnector = ApiConnector.getApiConnector();
  useEffect(() => {
    document.title = `Epoch ${epochId} | Phoenix Explorer`;

    setLoading(true);
    apiConnector.getEpoch(Number(epochId)).then((res: ApiReturnType<EpochOverview>) => {
      setData(res);
      setLoading(false);
    });
    updateBlocks({ page: 1, size: 10 });
  }, [epochId]);

  function updateBlocks(pageInfo: { page: number; size?: number }) {
    setBlocksLoading(true);
    apiConnector.getBlocksByEpoch(Number(epochId), pageInfo).then((res) => {
      setFetchData(res);
      setBlocksLoading(false);
    });
  }

  return (
    <Container sx={{ pt: 3, pb: 6 }}>
      <EpochOverviewView data={data?.data} loading={loading} lastUpdated={data?.lastUpdated} />
      <BlockListComponent loading={blocksLoading} fetchData={fetchData} updateData={updateBlocks} />
    </Container>
  );
};

export default EpochDetail;
