import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { styled, Container, CircularProgress, Box } from "@mui/material";
import { useSelector } from "react-redux";

import useADAHandle from "src/commons/hooks/useADAHandle";
import { ApiConnector } from "../../commons/connector/ApiConnector";
import AddressAnalytics from "../../components/AddressDetail/AddressAnalytics";
import AddressHeader from "../../components/AddressDetail/AddressHeader";
import AddressTransactionList from "../../components/AddressTransactionList";

const AddressWalletDetail = () => {
  const { address } = useParams<{ address: string }>();
  const [addressWallet, setAddressWallet] = useState("");
  const { state } = useLocation<{ data?: WalletAddress }>();
  const blockKey = useSelector(({ system }: RootState) => system.blockKey);
  const [data, setData] = useState<WalletAddress>();
  const [{ data: adaHandle, loading: adaHandleLoading, initialized: ADAHandleInitialized }] = useADAHandle(address);

  const apiConnector: ApiConnector = ApiConnector.getApiConnector();

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
    console.log("address", address);
    apiConnector.getWalletAddressFromAddress(address).then((data) => {
      setData(data.data);
    });
  }, [address]);

  // const { data, loading, initialized, error, statusError } = useFetch<WalletAddress>(
  //   addressWallet ? `${API.ADDRESS.DETAIL}/${addressWallet}` : "",
  //   state?.data,
  //   false,
  //   blockKey
  // );

  // if (adaHandleLoading || loading || !initialized || (!ADAHandleInitialized && !state?.data)) {
  //   return (
  //     <Box>
  //       <CircularProgress />
  //     </Box>
  //   );
  // }
  // if (error && (statusError || 0) >= 500) return <FetchDataErr />;
  // if (initialized && (!data || (error && (statusError || 0) < 500)) && !loading) return <NoRecord />;
  //
  return (
    <ContainerBox>
      <AddressHeader adaHanldeData={adaHandle} data={data} loading={true} />
      {/*<AddressAnalytics address={addressWallet} />*/}
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
