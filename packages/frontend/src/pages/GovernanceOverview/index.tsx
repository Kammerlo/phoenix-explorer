import { useEffect } from "react";

import OverviewComponent from "src/components/Overview";

import { StyledContainer } from "./styles";
const GovernanceOverview = () => {
  useEffect(() => {
    document.title = `Governance Overview | Phoenix Explorer`;
  }, []);

  return (
    <StyledContainer>
      <OverviewComponent />
    </StyledContainer>
  );
};

export default GovernanceOverview;
