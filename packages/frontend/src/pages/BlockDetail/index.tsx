import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Container } from "@mui/material";

import BlockOverview from "src/components/BlockDetail/BlockOverview";
import NoRecord from "src/components/commons/NoRecord";
import FetchDataErr from "src/components/commons/FetchDataErr";
import TransactionList from "../../components/TransactionLists";
import PluginSlotRenderer from "src/plugins/PluginSlotRenderer";
import { ApiConnector } from "../../commons/connector/ApiConnector";
import { ApiReturnType } from "@shared/APIReturnType";
import { Block } from "@shared/dtos/block.dto";
import { Transaction } from "@shared/dtos/transaction.dto";
import usePageInfo from "src/hooks/usePageInfo";

const BlockDetail: React.FC = () => {
  const { blockId } = useParams<{ blockId: string }>();
  const { pageInfo } = usePageInfo();
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [blockData, setBlockData] = useState<ApiReturnType<Block>>();
  const [transactions, setTransactions] = useState<ApiReturnType<Transaction[]>>({
    data: [], lastUpdated: 0, total: 0, currentPage: 0
  });

  const apiConnector = ApiConnector.getApiConnector();
  const network = process.env.REACT_APP_NETWORK || "mainnet";

  function updateTransactions(page: number = 0) {
    setTxLoading(true);
    apiConnector.getTransactions(blockId, { ...pageInfo, page }).then((data) => {
      setTransactions(data);
      setTxLoading(false);
    });
  }

  useEffect(() => {
    if (!blockId) return;
    // Friendly placeholder while loading; refined to "Block #N" once we have the block data.
    document.title = `Block | Phoenix Explorer`;

    setLoading(true);
    apiConnector.getBlockDetail(blockId).then((data) => {
      setBlockData(data);
      setLoading(false);
      const blockNo = data?.data?.blockNo;
      document.title = blockNo != null
        ? `Block #${blockNo} | Phoenix Explorer`
        : `Block | Phoenix Explorer`;
    });
    updateTransactions(0);
  }, [blockId]);

  if (blockData?.error) return <FetchDataErr />;
  if (!loading && !blockData?.data) return <NoRecord />;

  return (
    <Container sx={{ pt: 3, pb: 6 }}>
      <BlockOverview data={blockData?.data} loading={loading} lastUpdated={blockData?.lastUpdated} />
      <TransactionList
        transactions={transactions}
        loading={txLoading}
        updateData={updateTransactions}
        paginated
      />
      <PluginSlotRenderer slot="block-detail" context={{ data: blockData?.data, network, apiConnector }} />
    </Container>
  );
};

export default BlockDetail;
