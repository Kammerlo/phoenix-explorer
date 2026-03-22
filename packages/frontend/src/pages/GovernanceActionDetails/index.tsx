import { useEffect } from "react";

import GovernanceActionDetailsComponent from "src/components/GovernanceActionDetails";

import { StyledContainer } from "./styles";
import PluginSlotRenderer from "src/plugins/PluginSlotRenderer";
import { ApiConnector } from "src/commons/connector/ApiConnector";

export default function GovernanceActionDetails() {
  const apiConnector = ApiConnector.getApiConnector();
  const network = process.env.REACT_APP_NETWORK || "mainnet";

  useEffect(() => {
    document.title = `Governance Action Details | Cardano Blockchain Explorer`;
  }, []);
  return (
    <StyledContainer>
      <GovernanceActionDetailsComponent />
      <PluginSlotRenderer slot="governance-detail" context={{ data: null, network, apiConnector }} />
    </StyledContainer>
  );
}
