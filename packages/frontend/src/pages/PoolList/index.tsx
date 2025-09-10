import { useEffect } from "react";

import DelegationLists from "src/components/PoolList";

import { StyledContainer } from "./styles";

const PoolList = () => {
  useEffect(() => {
    document.title = `Pools | Cardano Blockchain Explorer`;
  }, []);

  return (
    <StyledContainer>
      <DelegationLists />
    </StyledContainer>
  );
};

export default PoolList;
