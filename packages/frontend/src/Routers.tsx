import { changeLanguage } from "i18next";
import React, { useEffect } from "react";
import { Route, Switch, useHistory } from "react-router-dom";

import { routers } from "./commons/routers";
import { APP_LANGUAGES, SUPPORTED_LANGUAGES } from "./commons/utils/constants";
import { handleChangeLanguage } from "./commons/utils/helper";
import i18n from "./i18n";
import AddressWalletDetail from "./pages/AddressWalletDetail";
import BlockDetail from "./pages/BlockDetail";
import BlockList from "./pages/BlockList";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import DrepDetail from "./pages/DrepDetail";
import Dreps from "./pages/Dreps";
import GovernanceOverview from "./pages/GovernanceOverview";
import GovernanceActionDetails from "./pages/GovernanceActionDetails";
import { ApiConnector } from "./commons/connector/ApiConnector";
import { FunctionEnum } from "./commons/connector/types/FunctionEnum";
import Epoch from "./pages/Epoch";
import EpochDetail from "./pages/EpochDetail";
import Tokens from "./pages/Token";
import TokenDetail from "./pages/TokenDetail";
import TransactionDetailView from "./pages/TransactionDetail";
import TransactionList from "./pages/TransactionListPage";
import DelegationPools from "./pages/PoolList";

const Routes: React.FC = () => {
  const history = useHistory();
  const supportedFunctions = ApiConnector.getApiConnector().getSupportedFunctions();
  useEffect(() => {
    const pattern = /^\/([a-z]{2})\//;
    const currentLanguage = window.location.pathname.match(pattern)?.[1];
    if (!currentLanguage || !SUPPORTED_LANGUAGES.includes(currentLanguage)) {
      changeLanguage(APP_LANGUAGES.ENGLISH);
      handleChangeLanguage(APP_LANGUAGES.ENGLISH, currentLanguage as APP_LANGUAGES);
    } else if (SUPPORTED_LANGUAGES.includes(currentLanguage) && i18n.language !== currentLanguage) {
      changeLanguage(currentLanguage);
    }
  }, [history]);

  function isSupportedRoute(element: React.FC, type: FunctionEnum) {
    if (supportedFunctions.includes(type)) {
      return element;
    } else {
      return NotFound;
    }
  }

  return (
    <Switch>
      <Route path={routers.HOME} exact component={Home} />

      <Route path={routers.GOVERNANCE_ACTION_LIST} exact
        component={isSupportedRoute(GovernanceOverview, FunctionEnum.GOVERNANCE)} />

      <Route path={routers.BLOCK_LIST} component={isSupportedRoute(BlockList, FunctionEnum.BLOCK)} />
      <Route path={routers.BLOCK_DETAIL} component={isSupportedRoute(BlockDetail, FunctionEnum.BLOCK)} />
      <Route path={routers.EPOCH_LIST} exact component={isSupportedRoute(Epoch, FunctionEnum.EPOCH)} />
      <Route path={routers.EPOCH_DETAIL} exact component={isSupportedRoute(EpochDetail, FunctionEnum.EPOCH)} />
      <Route
        path={routers.TRANSACTION_LIST}
        exact
        component={isSupportedRoute(TransactionList, FunctionEnum.TRANSACTION)}
      />
      <Route
        path={routers.TRANSACTION_DETAIL}
        component={isSupportedRoute(TransactionDetailView, FunctionEnum.TRANSACTION)}
      />
      <Route path={routers.ADDRESS_DETAIL} component={isSupportedRoute(AddressWalletDetail, FunctionEnum.ADDRESS)} />
      <Route
        path={routers.ADDRESS_DETAIL}
        exact
        component={isSupportedRoute(AddressWalletDetail, FunctionEnum.ADDRESS)}
      />
      <Route path={routers.DELEGATION_POOLS} exact component={isSupportedRoute(DelegationPools, FunctionEnum.POOL)} />
      
      <Route path={routers.TOKEN_LIST} exact component={isSupportedRoute(Tokens, FunctionEnum.TOKENS)} />
      <Route path={routers.TOKEN_DETAIL} exact component={isSupportedRoute(TokenDetail, FunctionEnum.TOKENS)} />
      <Route path={routers.DREPS} exact component={isSupportedRoute(Dreps, FunctionEnum.DREP)} />
      
      <Route
        path={routers.GOVERNANCE_ACTION}
        exact
        component={isSupportedRoute(GovernanceActionDetails, FunctionEnum.GOVERNANCE)}
      />
      <Route path={routers.DREP_DETAILS} exact component={isSupportedRoute(DrepDetail, FunctionEnum.DREP)} />

      <Route path={routers.NOT_FOUND} component={NotFound} />
    </Switch>
  );
};

export default Routes;
