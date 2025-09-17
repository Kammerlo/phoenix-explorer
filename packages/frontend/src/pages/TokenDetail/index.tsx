// @ts-ignore
import React, { createContext, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Box, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import NoRecord from "src/components/commons/NoRecord";
import TokenOverview from "src/components/TokenDetail/TokenOverview";
import TokenAnalytics from "src/components/TokenDetail/TokenAnalytics";
import FetchDataErr from "src/components/commons/FetchDataErr";

import { StyledContainer } from "./styles";
import {ITokenOverview, TokenHolder} from "@shared/dtos/token.dto";
import {ApiConnector} from "../../commons/connector/ApiConnector";
import {ApiReturnType} from "@shared/APIReturnType";
import CircularProgress from "@mui/material/CircularProgress";
import TransactionList from "../../components/TransactionLists";
import TokenHolders from "../../components/TokenDetail/TokenHolders";
import { Transaction } from "@shared/dtos/transaction.dto";
import usePageInfo from "src/commons/hooks/usePageInfo";

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
  const { pageInfo } = usePageInfo();

  const { tokenId } = useParams<{ tokenId: string }>();
  const [fetchData, setFechtData] = useState<ApiReturnType<ITokenOverview>>();
  const [tokenTransactions, setTokenTransactions] = useState<ApiReturnType<Transaction[]>>({ data: [], lastUpdated: 0, total: 0, currentPage: 1 });
  const [tokenHolders, setTokenHolders] = useState<ApiReturnType<TokenHolder[]>>({ data: [], lastUpdated: 0, total: 0, currentPage: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(false);
  const [holdersLoading, setHoldersLoading] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState<string>("transactions");
  const apiConnector = ApiConnector.getApiConnector();

  function updateData() {
    setLoading(true);
    apiConnector.getTokenDetail(tokenId).then((data) => {
      setFechtData(data);
      setLoading(false);
    });
  }

  function updateTransactions(page: number = 1) {
    setTransactionsLoading(true);
    const params = { ...pageInfo, page: page.toString() };
    apiConnector.getTokenTransactions(tokenId, params).then((data) => {
      setTokenTransactions(data);
      setTransactionsLoading(false);
    });
  }

  function updateTokenHolders(page: number = 1) {
    setHoldersLoading(true);
    const params = { ...pageInfo, page: page.toString() };
    apiConnector.getTokenHolders(tokenId, params).then((data) => {
      setTokenHolders(data);
      setHoldersLoading(false);
    });
  }

  useEffect(() => {
    updateData();
  }, [0]);

  useEffect(() => {
    if (tabValue === "transactions") {
      updateTransactions();
    } else if (tabValue === "holders") {
      updateTokenHolders();
    }
  }, [tabValue, tokenId]);

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
        {/* <TokenAnalytics dataToken={fetchData.data} /> */}
        
        <TabContext value={tabValue}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
            <TabList 
              onChange={(event: React.SyntheticEvent, newValue: string) => setTabValue(newValue)}
              aria-label="token data tabs"
            >
              <Tab label="Transactions" value="transactions" />
              <Tab label="Token Holders" value="holders" />
            </TabList>
          </Box>
          
          <TabPanel value="transactions" sx={{ px: 0 }}>
            <TransactionList 
              transactions={tokenTransactions} 
              loading={transactionsLoading}
              updateData={updateTransactions}
              paginated={false}
            />
          </TabPanel>
          
          <TabPanel value="holders" sx={{ px: 0 }}>
            <TokenHolders 
              tokenHolders={tokenHolders} 
              loading={holdersLoading}
              updateData={updateTokenHolders}
              paginated={false}
            />
          </TabPanel>
        </TabContext>
      </StyledContainer>
    </OverviewMetadataTokenContext.Provider>
  );
};

export default TokenDetail;
