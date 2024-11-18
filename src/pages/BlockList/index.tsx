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
  const [fetchData, setFetchData] = useState<ApiReturnType<Block[]>>();
  const [loading, setLoading] = useState(true);

  const apiConnector: ApiConnector = ApiConnector.getApiConnector();
  useEffect(() => {
    document.title = `Blocks List | Cardano Blockchain Explorer`;
    apiConnector.getBlocksPage().then((data) => {
      setFetchData(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <CircularProgress />;

  return (
    <StyledContainer>
      <Card data-testid="blocks-card" title={t("head.page.blocks")}>
        {fetchData?.lastUpdated && (
          <Actions>
            <TimeDuration>
              <FormNowMessage time={fetchData.lastUpdated} />
            </TimeDuration>
          </Actions>
        )}
        <BlockListComponent fetchData={fetchData} />
      </Card>
    </StyledContainer>
  );
};

export default BlockList;
