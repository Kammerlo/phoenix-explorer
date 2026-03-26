// @ts-ignore
import React, { createContext, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Container, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useTranslation } from "react-i18next";

import NoRecord from "src/components/commons/NoRecord";
import FetchDataErr from "src/components/commons/FetchDataErr";
import TokenOverview from "src/components/TokenDetail/TokenOverview";
import TokenAnalytics from "src/components/TokenDetail/TokenAnalytics";
import TransactionList from "src/components/TransactionLists";
import TokenHolders from "src/components/TokenDetail/TokenHolders";
import PluginSlotRenderer from "src/plugins/PluginSlotRenderer";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { ApiReturnType } from "@shared/APIReturnType";
import { ITokenOverview, TokenHolder } from "@shared/dtos/token.dto";
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
  const { t } = useTranslation();
  const mainRef = useRef(document.querySelector("#main"));
  const { pageInfo } = usePageInfo();
  const { tokenId } = useParams<{ tokenId: string }>();

  const [fetchData, setFetchData] = useState<ApiReturnType<ITokenOverview>>();
  const [tokenTransactions, setTokenTransactions] = useState<ApiReturnType<Transaction[]>>({
    data: [], lastUpdated: 0, total: 0, currentPage: 0
  });
  const [tokenHolders, setTokenHolders] = useState<ApiReturnType<TokenHolder[]>>({
    data: [], lastUpdated: 0, total: 0, currentPage: 0
  });
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [tabValue, setTabValue] = useState("transactions");
  const [txCountRealtime, setTxCountRealtime] = useState(0);

  const apiConnector = ApiConnector.getApiConnector();
  const network = process.env.REACT_APP_NETWORK || "mainnet";

  function updateTransactions(page: number = 0) {
    setTransactionsLoading(true);
    apiConnector.getTokenTransactions(tokenId, { ...pageInfo, page: String(page) }).then((data) => {
      setTokenTransactions(data);
      setTransactionsLoading(false);
    });
  }

  function updateTokenHolders(page: number = 0) {
    setHoldersLoading(true);
    apiConnector.getTokenHolders(tokenId, { ...pageInfo, page: String(page) }).then((data) => {
      setTokenHolders(data);
      setHoldersLoading(false);
    });
  }

  useEffect(() => {
    setLoading(true);
    apiConnector.getTokenDetail(tokenId).then((data) => {
      setFetchData(data);
      setLoading(false);
    });
    updateTransactions(0);
  }, [tokenId]);

  useEffect(() => {
    if (tabValue === "transactions") {
      updateTransactions(0);
    } else if (tabValue === "holders") {
      updateTokenHolders(0);
    }
  }, [tabValue]);

  useEffect(() => {
    document.title = `Token ${tokenId} | Cardano Explorer`;
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [tokenId]);

  if (fetchData?.error) return <FetchDataErr />;
  if (!loading && !fetchData?.data) return <NoRecord />;

  const hasAnalytics = (fetchData?.data?.analytics?.length ?? 0) > 0;
  const txCount = fetchData?.data?.txCount ?? tokenTransactions.total ?? 0;
  const holdersCount = fetchData?.data?.numberOfHolders ?? tokenHolders.total ?? 0;

  return (
    <OverviewMetadataTokenContext.Provider value={{ txCountRealtime, setTxCountRealtime }}>
      <Container sx={{ pt: 3, pb: 6 }}>
        {/* Overview header */}
        <TokenOverview
          data={fetchData?.data ?? null}
          loading={loading}
          lastUpdated={fetchData?.lastUpdated ?? 0}
        />

        {/* Analytics chart — shown when data is available */}
        {!loading && hasAnalytics && (
          <Box mb={3}>
            <TokenAnalytics dataToken={fetchData?.data} loading={loading} />
          </Box>
        )}

        {/* Tabs: Transactions | Holders */}
        <TabContext value={tabValue}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <TabList
              onChange={(_: React.SyntheticEvent, newValue: string) => setTabValue(newValue)}
              aria-label="token data tabs"
            >
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={0.75}>
                    Transactions
                    {txCount > 0 && (
                      <Box
                        component="span"
                        sx={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          px: 0.7,
                          py: 0.15,
                          borderRadius: "9px",
                          bgcolor: "primary.main",
                          color: "white"
                        }}
                      >
                        {txCount.toLocaleString()}
                      </Box>
                    )}
                  </Box>
                }
                value="transactions"
              />
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={0.75}>
                    Holders
                    {holdersCount > 0 && (
                      <Box
                        component="span"
                        sx={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          px: 0.7,
                          py: 0.15,
                          borderRadius: "9px",
                          bgcolor: (t) => t.palette.secondary.light,
                          color: "white"
                        }}
                      >
                        {holdersCount.toLocaleString()}
                      </Box>
                    )}
                  </Box>
                }
                value="holders"
              />
            </TabList>
          </Box>

          <TabPanel value="transactions" sx={{ px: 0 }}>
            <TransactionList
              transactions={tokenTransactions}
              loading={transactionsLoading}
              updateData={updateTransactions}
              paginated
            />
          </TabPanel>

          <TabPanel value="holders" sx={{ px: 0 }}>
            <TokenHolders
              tokenHolders={tokenHolders}
              loading={holdersLoading}
              updateData={updateTokenHolders}
              paginated
            />
          </TabPanel>
        </TabContext>

        <PluginSlotRenderer slot="token-detail" context={{ data: fetchData?.data, network, apiConnector }} />
      </Container>
    </OverviewMetadataTokenContext.Provider>
  );
};

export default TokenDetail;
