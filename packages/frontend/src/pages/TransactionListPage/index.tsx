import styled from "@emotion/styled";
import { Container } from "@mui/material";
import { useEffect, useState } from "react";

import TransactionList from "src/components/TransactionLists";
import { setOnDetailView } from "src/stores/user";

const StyledContainer = styled(Container)`
  @media screen and (max-width: ${(props) => props.theme.breakpoints.values.sm}px) {
    padding-top: 0;
    margin-top: 0px !important;
  }
`;

const Transactions = () => {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    window.history.replaceState({}, document.title);
    document.title = `Transactions List | Cardano Blockchain Explorer`;
  }, []);

  const openDetail = (_: React.MouseEvent<Element, MouseEvent>, r: Transaction) => {
    setOnDetailView(true);
    setSelected(r.hash);
  };

  return (
    <>
      <StyledContainer>
        <TransactionList showTabView />
      </StyledContainer>
    </>
  );
};

export default Transactions;
