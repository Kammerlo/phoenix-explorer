import { CircularProgress, Container, useTheme } from "@mui/material";
import QueryString, { parse, stringify } from "qs";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate, useLocation, useParams } from "react-router-dom";

import { VOTE_TYPE, STATUS_VOTE } from "src/commons/utils/constants";
import { getPageInfo } from "src/commons/utils/helper";
import DelegationDetailInfo from "src/components/DelegationDetail/DelegationDetailInfo";
import DelegationDetailOverview from "src/components/DelegationDetail/DelegationDetailOverview";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { ApiReturnType } from "@shared/APIReturnType";
import { PoolDetail } from "@shared/dtos/pool.dto";
import PluginSlotRenderer from "src/plugins/PluginSlotRenderer";

const TABS: TabPoolDetail[] = ["epochs", "delegators", "certificatesHistory", "governanceVotes"];

const DelegationDetail: React.FC = () => {
  const { t } = useTranslation();
  const { poolId } = useParams<{ poolId: string }>();
  const [poolDetailData, setPoolDetailData] = useState<ApiReturnType<PoolDetail>>();
  const [loading, setLoading] = useState(true);

  const apiConnector = ApiConnector.getApiConnector();
  const network = process.env.REACT_APP_NETWORK || "mainnet";

  useEffect(() => {
    document.title = `Delegation Pool ${poolId} | Cardano Blockchain Explorer`;
    window.scrollTo(0, 0);
    setLoading(true);
    apiConnector.getPoolDetail(poolId).then((response) => {
      setLoading(false);
      setPoolDetailData(response);
    });
  }, [poolId]);

  if(loading) return <CircularProgress />;
  return (
    <Container>
      <DelegationDetailInfo data={poolDetailData?.data} loading={loading} poolId={poolId} lastUpdated={poolDetailData?.lastUpdated} />
      <DelegationDetailOverview data={poolDetailData?.data} loading={loading} />
      <PluginSlotRenderer slot="pool-detail" context={{ data: poolDetailData?.data, network, apiConnector }} />
    </Container>
  );
};

export default DelegationDetail;
