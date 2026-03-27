import { useEffect } from "react";
import { Container, Grid, styled } from "@mui/material";
import { useTranslation } from "react-i18next";

import useFetch from "src/commons/hooks/useFetch";
import { Block } from "@shared/dtos/block.dto";
import { Transaction } from "@shared/dtos/transaction.dto";
import { PoolOverview } from "@shared/dtos/pool.dto";
import { ApiReturnType } from "@shared/APIReturnType";

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

  useEffect(() => {
    document.title = t("head.page.dashboard");
  }, [t]);

  const { data: statsData, loading: statsLoading } = useFetch<DashboardStats>("dashboard/stats");
  const { data: blocksData, loading: blocksLoading } = useFetch<ApiReturnType<Block[]>>("blocks?size=8");
  const { data: txsData,    loading: txsLoading    } = useFetch<ApiReturnType<Transaction[]>>("transactions?size=8");
  const { data: poolsData,  loading: poolsLoading  } = useFetch<ApiReturnType<PoolOverview[]>>("pools?size=5");

  const blocks = (blocksData?.data ?? []).slice(0, TABLE_ROWS);
  const txs    = (txsData?.data   ?? []).slice(0, TABLE_ROWS);
  const pools  = poolsData?.data ?? [];

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
