import { useEffect, useState } from "react";
import { Container, Grid, styled } from "@mui/material";
import { useTranslation } from "react-i18next";
import axios from "axios";

import { ApiConnector } from "src/commons/connector/ApiConnector";
import { Block } from "@shared/dtos/block.dto";
import { Transaction } from "@shared/dtos/transaction.dto";
import { PoolOverview } from "@shared/dtos/pool.dto";

import BlockChainVisualizer from "src/components/Home/BlockChainVisualizer";
import ActivityChart from "src/components/Home/ActivityChart";
import DashboardStatsGrid, { DashboardStats } from "src/components/Home/DashboardStats";
import LatestBlocks from "src/components/Home/LatestBlocks";
import LatestTransactions from "src/components/Home/LatestTransactions";
import TopDelegationPools from "src/components/Home/TopDelegationPools";

// ─── Layout ───────────────────────────────────────────────────────────────────

const HomeContainer = styled(Container)`
  padding-top: 30px;
  padding-bottom: 40px;
`;

// ─── Home page ────────────────────────────────────────────────────────────────

const TABLE_ROWS = 8;

const Home: React.FC = () => {
  const { t } = useTranslation();

  const [statsData, setStatsData]     = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [blocks, setBlocks]           = useState<Block[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [txs, setTxs]                 = useState<Transaction[]>([]);
  const [txsLoading, setTxsLoading]   = useState(true);
  const [pools, setPools]             = useState<PoolOverview[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(true);

  useEffect(() => {
    document.title = t("head.page.dashboard");
  }, [t]);

  useEffect(() => {
    const api = ApiConnector.getApiConnector();

    // Dashboard stats — gateway-specific aggregated endpoint.
    // On Yaci/Blockfrost the call will 404 and statsData stays null (cards show "—").
    axios
      .get<DashboardStats>(`${api.baseUrl}/dashboard/stats`)
      .then((r) => setStatsData(r.data))
      .catch(() => {/* unsupported provider — stats stay empty */})
      .finally(() => setStatsLoading(false));

    api
      .getBlocksPage({ page: "1", size: String(TABLE_ROWS) })
      .then((r) => setBlocks((r.data ?? []).slice(0, TABLE_ROWS)))
      .catch(() => {})
      .finally(() => setBlocksLoading(false));

    api
      .getTransactions(undefined, { page: "1", size: String(TABLE_ROWS) })
      .then((r) => setTxs((r.data ?? []).slice(0, TABLE_ROWS)))
      .catch(() => {})
      .finally(() => setTxsLoading(false));

    api
      .getPoolList({ page: "1", size: "5" })
      .then((r) => setPools(r.data ?? []))
      .catch(() => {})
      .finally(() => setPoolsLoading(false));
  }, []);

  return (
    <HomeContainer data-testid="home-container">
      <DashboardStatsGrid statsData={statsData} loading={statsLoading} />

      <BlockChainVisualizer />

      <ActivityChart />

      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <LatestBlocks blocks={blocks} loading={blocksLoading} rows={TABLE_ROWS} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <LatestTransactions txs={txs} loading={txsLoading} rows={TABLE_ROWS} />
        </Grid>
      </Grid>

      <TopDelegationPools pools={pools} loading={poolsLoading} />
    </HomeContainer>
  );
};

export default Home;
