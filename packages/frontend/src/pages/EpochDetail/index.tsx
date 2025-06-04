import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import EpochOverview from "src/components/EpochDetail/EpochOverview";

import { StyledContainer } from "./styles";
import { ApiConnector } from "../../commons/connector/ApiConnector";
import { ApiReturnType } from "../../commons/connector/types/APIReturnType";
import BlockListComponent from "../../components/BlockListComponent";

const EpochDetail: React.FC = () => {
  const { epochId } = useParams<{ epochId: string }>();
  const [data, setData] = useState<ApiReturnType<IDataEpoch>>();
  const [fetchData, setFetchData] = useState<ApiReturnType<Block[]>>();
  const [loading, setLoading] = useState(true);
  const apiConnector = ApiConnector.getApiConnector();

  // useEffect(() => {
  //   // Update key if this epoch don't have rewards and when new epoch distributed for api callback
  //   if (!data?.rewardsDistributed && epochNo !== undefined && data?.no !== undefined && epochNo !== data.no) {
  //     setKey(epochNo);
  //   }
  // }, [epochNo, data?.no, data?.rewardsDistributed]);

  useEffect(() => {
    window.history.replaceState({}, document.title);
    document.title = `Epoch ${epochId} | Cardano Blockchain Explorer`;
    apiConnector.getEpoch(Number(epochId)).then((data: ApiReturnType<IDataEpoch>) => {
      setData(data);
      setLoading(false);
    });
    apiConnector.getBlocksByEpoch(Number(epochId)).then((data) => {
      console.log("fetchData");
      setFetchData(data);
    });
  }, [epochId]);

  return (
    <StyledContainer>
      <EpochOverview data={data?.data} loading={loading} lastUpdated={data?.lastUpdated} />
      <BlockListComponent fetchData={fetchData} />
    </StyledContainer>
  );
};

export default EpochDetail;
