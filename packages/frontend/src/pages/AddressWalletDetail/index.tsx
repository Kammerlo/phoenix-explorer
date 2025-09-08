import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { styled, Container, CircularProgress } from "@mui/material";

import { ApiConnector } from "../../commons/connector/ApiConnector";
import AddressHeader from "../../components/AddressDetail/AddressHeader";
import NoRecord from "../../components/commons/NoRecord";
import NotAvailable from "../../components/commons/NotAvailable";
import { AddressDetail } from "@shared/dtos/address.dto";
import TransactionList from "src/components/TransactionLists";
import { ApiReturnType } from "@shared/APIReturnType";
import { Transaction } from "@shared/dtos/transaction.dto";
import usePageInfo from "src/commons/hooks/usePageInfo";

const AddressWalletDetail = () => {
  const { address } = useParams<{ address: string }>();
  const [data, setData] = useState<AddressDetail>();
  const [txData, setTxData] = useState<ApiReturnType<Transaction[]>>();
  const [txDataLoading, setTxDataLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const apiConnector: ApiConnector = ApiConnector.getApiConnector();
  const [error, setError] = useState<string>();
  const { pageInfo } = usePageInfo();

  useEffect(() => {
    window.history.replaceState({}, document.title);
    document.title = `Address ${address} | Cardano Blockchain Explorer`;
    document.documentElement.scrollTop = 0;
    apiConnector.getWalletAddressFromAddress(address).then((data) => {
      if (data.error) {
        setLoading(false);
        setError(data.error);
        return;
      }
      setData(data.data!);
      setLoading(false);
    });
    updateTxPage();
  }, [address]);

  function updateTxPage() {
    setTxDataLoading(true);
    apiConnector.getAddressTxsFromAddress(address, pageInfo).then((data) => {
      setTxData(data);
      setTxDataLoading(false);
    });
  }

  if (loading) return <CircularProgress />;
  if (!error && !data) return <NoRecord />;
  if (error) return <NotAvailable />;

  return (
    <ContainerBox>
      <AddressHeader data={data} loading={loading} />
      <TransactionList showTabView transactions={txData} loading={txDataLoading} updateData={updateTxPage} paginated={true} />
    </ContainerBox>
  );
};

export default AddressWalletDetail;

const ContainerBox = styled(Container)`
  padding-top: 30px;
  display: flex;
  flex-direction: column;
  @media screen and (max-width: ${(props) => props.theme.breakpoints.values.md}px) {
    margin-top: -20px;
  }
  @media screen and (max-width: ${(props) => props.theme.breakpoints.values.sm}px) {
    margin-top: 0px !important;
  }
`;
