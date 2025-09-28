import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import EpochOverviewView from "src/components/EpochDetail/EpochOverview";

import { StyledContainer } from "./styles";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import BlockListComponent from "../../components/BlockListComponent";

import { EpochOverview } from "@shared/dtos/epoch.dto";
import { Block } from "@shared/dtos/block.dto";
import {ApiReturnType} from "@shared/APIReturnType";

const EpochDetail: React.FC = () => {
  const { epochId } = useParams<{ epochId: string }>();
  const [data, setData] = useState<ApiReturnType<EpochOverview>>();
  const [fetchData, setFetchData] = useState<ApiReturnType<Block[]>>();
  const [loading, setLoading] = useState(true);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const apiConnector = ApiConnector.getApiConnector();

  useEffect(() => {
    window.history.replaceState({}, document.title);
    document.title = `Epoch ${epochId} | Cardano Blockchain Explorer`;
    apiConnector.getEpoch(Number(epochId)).then((data: ApiReturnType<EpochOverview>) => {
      setData(data);
      setLoading(false);
    });
    updateBlocks({page: 1, size: 10});
  }, [epochId]);

  function updateBlocks(pageInfo: { page: number, size?: number }) {
    console.log("updateBlocks page:", pageInfo.page);
    setBlocksLoading(true);
    apiConnector.getBlocksByEpoch(Number(epochId), pageInfo).then((data) => {
      setFetchData(data);
      setBlocksLoading(false);
    });
  }

  return (
    <StyledContainer>
      <EpochOverviewView data={data?.data} loading={loading} lastUpdated={data?.lastUpdated} />
      <BlockListComponent loading={blocksLoading} fetchData={fetchData} updateData={updateBlocks}/>
    </StyledContainer>
  );
};

export default EpochDetail;
