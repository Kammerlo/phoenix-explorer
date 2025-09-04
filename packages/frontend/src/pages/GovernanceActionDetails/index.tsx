import { useEffect } from "react";

import GovernanceActionDetailsComponent from "src/components/GovernanceActionDetails";
import { FF_GLOBAL_IS_CONWAY_ERA } from "src/commons/utils/constants";

import { StyledContainer } from "./styles";
import NotFound from "../NotFound";

export default function GovernanceActionDetails() {
  useEffect(() => {
    document.title = `Governance Action Details | Cardano Blockchain Explorer`;
  }, []);
  return (
    <StyledContainer>
      <GovernanceActionDetailsComponent />
    </StyledContainer>
  );
}
