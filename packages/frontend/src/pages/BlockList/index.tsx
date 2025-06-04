import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "src/components/commons/Card";
import FormNowMessage from "src/components/commons/FormNowMessage";

import { StyledContainer, Actions, TimeDuration } from "./styles";
import { ApiConnector } from "../../commons/connector/ApiConnector";
import { ApiReturnType } from "../../commons/connector/types/APIReturnType";
import BlockListComponent from "../../components/BlockListComponent";
import { CircularProgress } from "@mui/material";

const BlockList: React.FC = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `Blocks List | Cardano Blockchain Explorer`;
  }, []);

  return (
    <StyledContainer>
      <Card data-testid="blocks-card" title={t("head.page.blocks")}>
        <BlockListComponent />
      </Card>
    </StyledContainer>
  );
};

export default BlockList;
