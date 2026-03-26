import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Container } from "@mui/material";

import { ApiConnector } from "../../commons/connector/ApiConnector";
import AddressHeader from "../../components/AddressDetail/AddressHeader";
import PluginSlotRenderer from "src/plugins/PluginSlotRenderer";
import NoRecord from "../../components/commons/NoRecord";
import FetchDataErr from "../../components/commons/FetchDataErr";
import TransactionList from "src/components/TransactionLists";
import { AddressDetail } from "@shared/dtos/address.dto";
import { ApiReturnType } from "@shared/APIReturnType";
import { Transaction } from "@shared/dtos/transaction.dto";
import usePageInfo from "src/commons/hooks/usePageInfo";

const AddressWalletDetail: React.FC = () => {
  const params = useParams<{ address: string; stakeId: string }>();
  const address = params.address || params.stakeId;
  const { pageInfo } = usePageInfo();
  const [data, setData] = useState<AddressDetail>();
  const [txData, setTxData] = useState<ApiReturnType<Transaction[]>>({
    data: [], lastUpdated: 0, total: 0, currentPage: 0
  });
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [error, setError] = useState<string>();

  const apiConnector = ApiConnector.getApiConnector();
  const network = process.env.REACT_APP_NETWORK || "mainnet";

  function updateTxPage(page: number = 0) {
    setTxLoading(true);
    apiConnector.getAddressTxsFromAddress(address, { ...pageInfo, page: String(page) }).then((res) => {
      setTxData(res);
      setTxLoading(false);
    });
  }

  useEffect(() => {
    document.title = `Address ${address} | Cardano Explorer`;
    document.documentElement.scrollTop = 0;

    setLoading(true);
    apiConnector.getWalletAddressFromAddress(address).then((res) => {
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setData(res.data!);
      setLoading(false);
    });

    updateTxPage(0);
  }, [address]);

  if (error) return <FetchDataErr />;
  if (!loading && !data) return <NoRecord />;

  return (
    <Container sx={{ pt: 3, pb: 6 }}>
      <AddressHeader data={data} loading={loading} />
      <TransactionList
        transactions={txData}
        loading={txLoading}
        updateData={updateTxPage}
        paginated
      />
      <PluginSlotRenderer slot="address-detail" context={{ data, network, apiConnector }} />
    </Container>
  );
};

export default AddressWalletDetail;
