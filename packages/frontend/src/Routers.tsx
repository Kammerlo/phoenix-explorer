import { changeLanguage } from "i18next";
import React, { Suspense, useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";

import { routers } from "./commons/routers";
import { APP_LANGUAGES, SUPPORTED_LANGUAGES } from "./commons/utils/constants";

import i18n from "./i18n";
import { requireCapability } from "./commons/connector/capabilities/requireCapability";
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
  useEffect(() => {
    const pattern = /^\/([a-z]{2})\//;
    const currentLanguage = window.location.pathname.match(pattern)?.[1];
    if (!currentLanguage || !SUPPORTED_LANGUAGES.includes(currentLanguage)) {
      changeLanguage(APP_LANGUAGES.ENGLISH);
    } else if (i18n.language !== currentLanguage) {
      changeLanguage(currentLanguage);
    }
  }, [navigate]);

  return (
    <Suspense fallback={<PageLoader />}>
      <PageTransition routeKey={location.pathname}>
      <Routes>
        <Route path={routers.HOME} element={<Home />} />

        <Route path={routers.GOVERNANCE_ACTION_LIST}
          element={requireCapability(GovernanceOverview, "getGovernanceOverviewList", NotFound)} />

        <Route path={routers.BLOCK_LIST}        element={requireCapability(BlockList, "getBlocksPage", NotFound)} />
        <Route path={routers.BLOCK_DETAIL}      element={requireCapability(BlockDetail, "getBlockDetail", NotFound)} />
        <Route path={routers.EPOCH_LIST}        element={requireCapability(Epoch, "getEpochs", NotFound)} />
        <Route path={routers.EPOCH_DETAIL}      element={requireCapability(EpochDetail, "getEpoch", NotFound)} />
        <Route path={routers.TRANSACTION_LIST}  element={requireCapability(TransactionList, "getTransactions", NotFound)} />
        <Route path={routers.TRANSACTION_DETAIL} element={requireCapability(TransactionDetailView, "getTxDetail", NotFound)} />
        <Route path={routers.ADDRESS_DETAIL}    element={requireCapability(AddressDetail, "getWalletAddressFromAddress", NotFound)} />
        <Route path={routers.STAKE_DETAIL}      element={requireCapability(AddressDetail, "getWalletStakeFromAddress", NotFound)} />
        <Route path={routers.STAKE_DETAIL_ALIAS} element={requireCapability(AddressDetail, "getWalletStakeFromAddress", NotFound)} />
        <Route path={routers.POOLS}             element={requireCapability(DelegationPools, "getPoolList", NotFound)} />
        <Route path={routers.POOL_DETAIL}       element={requireCapability(PoolDetailView, "getPoolDetail", NotFound)} />
        <Route path={routers.TOKEN_LIST}        element={requireCapability(Tokens, "getTokensPage", NotFound)} />
        <Route path={routers.TOKEN_DETAIL}      element={requireCapability(TokenDetail, "getTokenDetail", NotFound)} />
        <Route path={routers.DREPS}             element={requireCapability(Dreps, "getDreps", NotFound)} />
        <Route path={routers.GOVERNANCE_ACTION} element={requireCapability(GovernanceActionDetails, "getGovernanceDetail", NotFound)} />
        <Route path={routers.DREP_DETAILS}      element={requireCapability(DrepDetail, "getDrep", NotFound)} />
        <Route path={routers.PLUGINS}           element={<PluginManager />} />
        <Route path={routers.PROTOCOL_PARAMETERS} element={requireCapability(ProtocolParameters, "getCurrentProtocolParameters", NotFound)} />
        <Route path={routers.POLICY_DETAIL}     element={requireCapability(PolicyDetail, "getTokensByPolicy", NotFound)} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </PageTransition>
    </Suspense>
  );
};

export default AppRoutes;
