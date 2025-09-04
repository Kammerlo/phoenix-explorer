import { useEffect } from "react";

import OverviewComponent from "src/components/Overview";

import { StyledContainer } from "./styles";
const GovernanceOverview = () => {
  useEffect(() => {
    document.title = `Governance Overview | Cardano Blockchain Explorer`;
  }, []);

  return (
    <StyledContainer>
      <OverviewComponent />
    </StyledContainer>
  );
};

export default GovernanceOverview;
