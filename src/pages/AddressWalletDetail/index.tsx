import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { styled, Container, CircularProgress, Box } from "@mui/material";
import { useSelector } from "react-redux";

import useADAHandle from "src/commons/hooks/useADAHandle";
import { ApiConnector } from "../../commons/connector/ApiConnector";
import AddressHeader from "../../components/AddressDetail/AddressHeader";
import AddressTransactionList from "../../components/AddressTransactionList";
import NoRecord from "../../components/commons/NoRecord";
import NotAvailable from "../../components/commons/NotAvailable";

const AddressWalletDetail = () => {
  const { address } = useParams<{ address: string }>();
  const [addressWallet, setAddressWallet] = useState("");
  const { state } = useLocation<{ data?: WalletAddress }>();
  const blockKey = useSelector(({ system }: RootState) => system.blockKey);
  const [data, setData] = useState<WalletAddress>();
  const [{ data: adaHandle, loading: adaHandleLoading, initialized: ADAHandleInitialized }] = useADAHandle(address);
  const [loading, setLoading] = useState<boolean>(true);
  const apiConnector: ApiConnector = ApiConnector.getApiConnector();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (ADAHandleInitialized) {
      if (adaHandle?.paymentAddress) {
        setAddressWallet(adaHandle?.paymentAddress);
      } else {
        setAddressWallet(address);
      }
    }
  }, [JSON.stringify(adaHandle), adaHandleLoading, address, ADAHandleInitialized]);

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
  }, [address]);

  if (!error && !data) return <NoRecord />;
  if (error) return <NotAvailable />;

  return (
    <ContainerBox>
      <AddressHeader adaHanldeData={adaHandle} data={data} loading={loading} />
      {/*<AddressTransactionList address={addressWallet} />*/}
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
