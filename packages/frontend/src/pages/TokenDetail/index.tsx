// @ts-ignore
import React, { createContext, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import NoRecord from "src/components/commons/NoRecord";
import TokenOverview from "src/components/TokenDetail/TokenOverview";
import TokenAnalytics from "src/components/TokenDetail/TokenAnalytics";
import FetchDataErr from "src/components/commons/FetchDataErr";

import { StyledContainer } from "./styles";
import {ITokenOverview} from "@shared/dtos/token.dto";
import {ApiConnector} from "../../commons/connector/ApiConnector";
import {ApiReturnType} from "@shared/APIReturnType";
import CircularProgress from "@mui/material/CircularProgress";
import TransactionList from "../../components/TransactionLists";

interface IOverviewMetadataContext {
  txCountRealtime: number;
  setTxCountRealtime: React.Dispatch<React.SetStateAction<number>>;
}

export const OverviewMetadataTokenContext = createContext<IOverviewMetadataContext>({
  txCountRealtime: 0,
  setTxCountRealtime: () => 0
});

const TokenDetail: React.FC = () => {
  const mainRef = useRef(document.querySelector("#main"));

  const { tokenId } = useParams<{ tokenId: string }>();
  const [fetchData, setFechtData] = useState<ApiReturnType<ITokenOverview>>();
  const [loading, setLoading] = useState<boolean>(true);
  const apiConnector = ApiConnector.getApiConnector();

  function updateData() {
    setLoading(true);
    apiConnector.getTokenDetail(tokenId).then((data) => {
      setFechtData(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    updateData();
  }, [0]);

  const [txCountRealtime, setTxCountRealtime] = useState<number>(0);

  useEffect(() => {
    window.history.replaceState({}, document.title);
    document.title = `Token ${tokenId} | Cardano Blockchain Explorer`;
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [tokenId]);

  if (loading) return <CircularProgress/>;
  if (fetchData.error) return <FetchDataErr />;
  if (!loading && !fetchData.data) return <NoRecord />;

  return (
    <OverviewMetadataTokenContext.Provider
      value={{
        txCountRealtime,
        setTxCountRealtime
      }}
    >
      <StyledContainer>
        <TokenOverview data={fetchData.data} loading={loading} lastUpdated={fetchData.lastUpdated} />
        <TokenAnalytics dataToken={fetchData.data} />
        {/*<TokenTableData*/}
        {/*  totalSupply={data?.supply}*/}
        {/*  metadata={data?.metadata}*/}
        {/*  metadataJson={data?.metadataJson}*/}
        {/*  loading={loading}*/}
        {/*  metadataCIP25={data?.metadataCIP25}*/}
        {/*  metadataCIP60={data?.metadataCIP60}*/}
        {/*/>*/}
        {/*TODO show Transaction List here*/}
        {/*<TransactionList></TransactionList>*/}
      </StyledContainer>
    </OverviewMetadataTokenContext.Provider>
  );
};

export default TokenDetail;
