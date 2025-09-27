import { useEffect } from "react";

import PoolList from "src/components/PoolList";

import { StyledContainer } from "./styles";

const PoolListPage = () => {
  useEffect(() => {
    document.title = `Pools | Cardano Blockchain Explorer`;
  }, []);

  return (
    <StyledContainer>
      <PoolList />
    </StyledContainer>
  );
};

export default PoolListPage;
