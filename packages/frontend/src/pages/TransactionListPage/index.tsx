import React, { useEffect, useState } from "react";
import { Box, Container, Typography } from "@mui/material";

import TransactionList from "src/components/TransactionLists";
import { ApiReturnType } from "@shared/APIReturnType";
import { Transaction } from "@shared/dtos/transaction.dto";
import { ApiConnector } from "../../commons/connector/ApiConnector";

const Transactions: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<ApiReturnType<Transaction[]>>({
    data: [], lastUpdated: 0, total: 0, currentPage: 0
  });
  const apiConnector = ApiConnector.getApiConnector();

  function updateData() {
    setLoading(true);
    apiConnector.getTransactions(undefined, { size: 50 }).then((data) => {
      setTransactions(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    document.title = "Latest Transactions | Cardano Explorer";
    updateData();
  }, []);

  return (
    <Container sx={{ pt: 3, pb: 6 }}>
      <Box mb={2}>
        <Typography variant="h5" fontWeight={700} component="h1">Latest Transactions</Typography>
      </Box>
      <TransactionList
        transactions={transactions}
        loading={loading}
        updateData={updateData}
      />
    </Container>
  );
};

export default Transactions;
