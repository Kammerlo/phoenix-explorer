import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "src/components/commons/Card";

import { StyledContainer } from "./styles";
import BlockListComponent from "../../components/BlockListComponent";
import usePageInfo from "src/commons/hooks/usePageInfo";
import {Block} from "@shared/dtos/block.dto";
import {ApiReturnType} from "@shared/APIReturnType";
import {ApiConnector} from "src/commons/connector/ApiConnector";

const BlockList: React.FC = () => {
  const { t } = useTranslation();

  const { pageInfo } = usePageInfo();
  const [loading, setLoading] = useState(true);
  const [fetchData, setFetchData] = useState<ApiReturnType<Block[]>>();
  const apiConnector = ApiConnector.getApiConnector();

  function updateData(pageInfo: {page: number, size?: number}) {
    console.log("updateData page:", pageInfo.page);
    setLoading(true);
    apiConnector.getBlocksPage(pageInfo).then((data: ApiReturnType<Block[]>) => {
      setLoading(false);
      setFetchData(data);
    });
  }

  useEffect(() => {
    updateData({page: 1, size: 10});
  }, []);

  useEffect(() => {
    document.title = `Latest Blocks List | Cardano Blockchain Explorer`;
  }, []);

  return (
    <StyledContainer>
      <Card data-testid="blocks-card" title={t("head.page.blocks")}>
        <BlockListComponent fetchData={fetchData} updateData={updateData} loading={loading}/>
      </Card>
    </StyledContainer>
  );
};

export default BlockList;
