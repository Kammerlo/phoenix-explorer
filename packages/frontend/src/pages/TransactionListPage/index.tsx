import styled from "@emotion/styled";
import {Container} from "@mui/material";
import {useEffect, useState} from "react";

import TransactionList from "src/components/TransactionLists";
import {setOnDetailView} from "src/stores/user";
import {ApiReturnType} from "@shared/APIReturnType";
import {Transaction} from "@shared/dtos/transaction.dto";
import {ApiConnector} from "../../commons/connector/ApiConnector";
import usePageInfo from "../../commons/hooks/usePageInfo";

const StyledContainer = styled(Container)`
  @media screen and (max-width: ${(props) => props.theme.breakpoints.values.sm}px) {
    padding-top: 0;
    margin-top: 0px !important;
  }
`;

const Transactions = () => {

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<ApiReturnType<Transaction[]> | undefined>();
  const apiConnector: ApiConnector = ApiConnector.getApiConnector();

  function updateData() {
    apiConnector.getTransactions(undefined, {size: 50}).then((data) => {
      setTransactions(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    updateData();
  }, []);

  useEffect(() => {
    window.history.replaceState({}, document.title);
    document.title = `Transactions List | Cardano Blockchain Explorer`;
  }, []);

  return (
    <StyledContainer>
      <TransactionList showTabView transactions={transactions} loading={loading} updateData={updateData} paginated={false}/>
    </StyledContainer>
  );
};

export default Transactions;
