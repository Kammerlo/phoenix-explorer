import { changeLanguage } from "i18next";
import React, { Suspense, useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";

import { routers } from "./commons/routers";
import { APP_LANGUAGES, SUPPORTED_LANGUAGES } from "./commons/utils/constants";

import i18n from "./i18n";
import { ApiConnector } from "./commons/connector/ApiConnector";
import { FunctionEnum } from "./commons/connector/types/FunctionEnum";
import { PageTransition } from "./commons/animation";

const AddressDetail = React.lazy(() => import("./pages/AddressDetail"));
const BlockDetail = React.lazy(() => import("./pages/BlockDetail"));
const BlockList = React.lazy(() => import("./pages/BlockList"));
const Home = React.lazy(() => import("./pages/Home"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const DrepDetail = React.lazy(() => import("./pages/DrepDetail"));
const Dreps = React.lazy(() => import("./pages/Dreps"));
const GovernanceOverview = React.lazy(() => import("./pages/GovernanceOverview"));
const GovernanceActionDetails = React.lazy(() => import("./pages/GovernanceActionDetails"));
const Epoch = React.lazy(() => import("./pages/Epoch"));
const EpochDetail = React.lazy(() => import("./pages/EpochDetail"));
const Tokens = React.lazy(() => import("./pages/Token"));
const TokenDetail = React.lazy(() => import("./pages/TokenDetail"));
const TransactionDetailView = React.lazy(() => import("./pages/TransactionDetail"));
const TransactionList = React.lazy(() => import("./pages/TransactionListPage"));
const DelegationPools = React.lazy(() => import("./pages/PoolList"));
const PoolDetailView = React.lazy(() => import("./pages/PoolDetailView"));
const PluginManager = React.lazy(() => import("./pages/PluginManager"));
const ProtocolParameters = React.lazy(() => import("./pages/ProtocolParameters"));
const PolicyDetail = React.lazy(() => import("./pages/PolicyDetail"));

const PageLoader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
    <CircularProgress />
  </Box>
);

const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const supportedFunctions = ApiConnector.getApiConnector().getSupportedFunctions();
  useEffect(() => {
    const pattern = /^\/([a-z]{2})\//;
    const currentLanguage = window.location.pathname.match(pattern)?.[1];
    if (!currentLanguage || !SUPPORTED_LANGUAGES.includes(currentLanguage)) {
      changeLanguage(APP_LANGUAGES.ENGLISH);
    } else if (i18n.language !== currentLanguage) {
      changeLanguage(currentLanguage);
    }
  }, [navigate]);

  function isSupportedElement(Component: React.LazyExoticComponent<React.FC>, type: FunctionEnum) {
    if (supportedFunctions.includes(type)) {
      return <Component />;
    } else {
      return <NotFound />;
    }
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <PageTransition routeKey={location.pathname}>
      <Routes>
        <Route path={routers.HOME} element={<Home />} />

        <Route path={routers.GOVERNANCE_ACTION_LIST}
          element={isSupportedElement(GovernanceOverview, FunctionEnum.GOVERNANCE)} />

        <Route path={routers.BLOCK_LIST} element={isSupportedElement(BlockList, FunctionEnum.BLOCK)} />
        <Route path={routers.BLOCK_DETAIL} element={isSupportedElement(BlockDetail, FunctionEnum.BLOCK)} />
        <Route path={routers.EPOCH_LIST} element={isSupportedElement(Epoch, FunctionEnum.EPOCH)} />
        <Route path={routers.EPOCH_DETAIL} element={isSupportedElement(EpochDetail, FunctionEnum.EPOCH)} />
        <Route path={routers.TRANSACTION_LIST} element={isSupportedElement(TransactionList, FunctionEnum.TRANSACTION)} />
        <Route path={routers.TRANSACTION_DETAIL} element={isSupportedElement(TransactionDetailView, FunctionEnum.TRANSACTION)} />
        <Route path={routers.ADDRESS_DETAIL} element={isSupportedElement(AddressDetail, FunctionEnum.ADDRESS)} />
        <Route path={routers.STAKE_DETAIL} element={isSupportedElement(AddressDetail, FunctionEnum.ADDRESS)} />
        <Route path={routers.POOLS} element={isSupportedElement(DelegationPools, FunctionEnum.POOL)} />
        <Route path={routers.POOL_DETAIL} element={isSupportedElement(PoolDetailView, FunctionEnum.POOL)} />
        <Route path={routers.TOKEN_LIST} element={isSupportedElement(Tokens, FunctionEnum.TOKENS)} />
        <Route path={routers.TOKEN_DETAIL} element={isSupportedElement(TokenDetail, FunctionEnum.TOKENS)} />
        <Route path={routers.DREPS} element={isSupportedElement(Dreps, FunctionEnum.DREP)} />
        <Route path={routers.GOVERNANCE_ACTION} element={isSupportedElement(GovernanceActionDetails, FunctionEnum.GOVERNANCE)} />
        <Route path={routers.DREP_DETAILS} element={isSupportedElement(DrepDetail, FunctionEnum.DREP)} />
        <Route path={routers.PLUGINS} element={<PluginManager />} />
        <Route path={routers.PROTOCOL_PARAMETERS} element={isSupportedElement(ProtocolParameters, FunctionEnum.PROTOCOL_PARAMETER)} />
        <Route path={routers.POLICY_DETAIL} element={isSupportedElement(PolicyDetail, FunctionEnum.TOKENS)} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </PageTransition>
    </Suspense>
  );
};

export default AppRoutes;
