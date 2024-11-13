import { useSelector } from "react-redux";
import React, { useEffect, useState, useRef, MouseEvent } from "react";
import { Box } from "@mui/material";
import { stringify } from "qs";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Column } from "src/types/table";
import { details } from "src/commons/routers";
import Card from "src/components/commons/Card";
import Table from "src/components/commons/Table";
import Link from "src/components/commons/Link";
import { Capitalize } from "src/components/commons/CustomText/styles";
import FormNowMessage from "src/components/commons/FormNowMessage";
import usePageInfo from "src/commons/hooks/usePageInfo";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";

import { PriceWrapper, StyledContainer, StyledLink, Actions, TimeDuration } from "./styles";
import { ApiConnector } from "../../commons/connector/ApiConnector";
import CustomTooltip from "../../components/commons/CustomTooltip";
import { getShortHash } from "../../commons/utils/helper";
import { TooltipIcon } from "../../commons/resources";
import { ApiReturnType } from "../../commons/connector/types/APIReturnType";
import BlockListComponent from "../../components/BlockListComponent";

const BlockList: React.FC = () => {
  const { t } = useTranslation();
  const [fetchData, setFetchData] = useState<ApiReturnType<Block[]>>();

  const apiConnector: ApiConnector = ApiConnector.getApiConnector();
  useEffect(() => {
    document.title = `Blocks List | Cardano Blockchain Explorer`;
    apiConnector.getBlocksPage().then((data) => {
      setFetchData(data);
    });
  }, []);

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
