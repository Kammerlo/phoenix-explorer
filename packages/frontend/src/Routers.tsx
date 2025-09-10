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
import ContractDetail from "./pages/ContractDetail";
import SmartContractDetail from "./pages/SmartContractDetail";
import NativeScriptAndSC from "./pages/NativeScriptsAndSC";
import ContractList from "./pages/ContractList";
import DelegationDetail from "./pages/DelegationDetail";
import DelegationPools from "./pages/PoolList";
import DelegatorLifecycle from "./pages/DelegatorLifecycle";
import Home from "./pages/Home";
import InstantRewards from "./pages/InstantRewards";
import NotFound from "./pages/NotFound";
import PolicyDetail from "./pages/PolicyDetail";
import ProtocolParameter from "./pages/ProtocolParameter";
import FAQ from "./pages/Reference/FAQ";
import RegistrationPools, { POOL_TYPE } from "./pages/RegistrationPools";
import SPOLifecycle from "./pages/SPOLifecycle";
import SearchResult from "./pages/SearchResult";
import Stake, { STAKE_ADDRESS_TYPE } from "./pages/Stake";
import StakeDetail from "./pages/StakeDetail";
import StakingLifecycle from "./pages/StakingLifecycle";
import Tokens from "./pages/Token";
import TokenDetail from "./pages/TokenDetail";
import TransactionDetailView from "./pages/TransactionDetail";
import TransactionList from "./pages/TransactionListPage";
import NativeScriptsDetailPage from "./pages/NativeScriptDetail";
import DrepDetail from "./pages/DrepDetail";
import Dreps from "./pages/Dreps";
import ConstitutionalCommittees from "./pages/ConstitutionalCommittees";
import ConstitutionalCommitteeDetail from "./pages/ConstitutionalCommitteeDetail";
import GovernanceOverview from "./pages/GovernanceOverview";
import NetworkMonitoring from "./pages/NetworkMonitoring";
import GovernanceActionDetails from "./pages/GovernanceActionDetails";
import { ApiConnector } from "./commons/connector/ApiConnector";
import { FunctionEnum } from "./commons/connector/types/FunctionEnum";
import Epoch from "./pages/Epoch";
import EpochDetail from "./pages/EpochDetail";

const StakeAddressRegistration = () => <Stake stakeAddressType={STAKE_ADDRESS_TYPE.REGISTRATION} />;
const StakeAddressDeregistration = () => <Stake stakeAddressType={STAKE_ADDRESS_TYPE.DEREREGISTRATION} />;
const StakeAddressDelegations = () => <Stake stakeAddressType={STAKE_ADDRESS_TYPE.DELEGATION} />;
const PoolsCertificate = () => <RegistrationPools poolType={POOL_TYPE.REGISTRATION} />;
const PoolsDeregistration = () => <RegistrationPools poolType={POOL_TYPE.DEREREGISTRATION} />;

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

      <Route path={routers.GOVERNANCE_OVERVIEW} exact
        component={isSupportedRoute(GovernanceOverview, FunctionEnum.GOVERNANCE)} />

      <Route
        path={routers.STAKING_LIFECYCLE}
        exact
        component={isSupportedRoute(StakingLifecycle, FunctionEnum.STAKING_LIFECYCLE)}
      />
      <Route path={routers.DELEGATOR_LIFECYCLE} exact component={DelegatorLifecycle} />
      <Route path={routers.SPO_LIFECYCLE} exact component={SPOLifecycle} />

      <Route path={routers.SEARCH} exact component={SearchResult} />
      <Route path={routers.FAQ} exact component={FAQ} />

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
      <Route
        path={routers.STAKE_ADDRESS_DELEGATIONS}
        exact
        component={isSupportedRoute(StakeAddressDelegations, FunctionEnum.ADDRESS)}
      />
      <Route path={routers.DELEGATION_POOLS} exact component={isSupportedRoute(DelegationPools, FunctionEnum.POOL)} />
      <Route
        path={routers.DELEGATION_POOL_DETAIL}
        exact
        component={isSupportedRoute(DelegationDetail, FunctionEnum.POOL)}
      />
      <Route path={routers.TOKEN_LIST} exact component={isSupportedRoute(Tokens, FunctionEnum.TOKENS)} />
      <Route path={routers.TOKEN_DETAIL} exact component={isSupportedRoute(TokenDetail, FunctionEnum.TOKENS)} />
      <Route path={routers.POLICY_DETAIL} exact component={isSupportedRoute(PolicyDetail, FunctionEnum.TOKENS)} />
      <Route
        path={routers.CONTRACT_LIST}
        exact
        component={isSupportedRoute(ContractList, FunctionEnum.SMART_CONTRACT)}
      />
      <Route
        path={routers.CONTRACT_DETAIL}
        exact
        component={isSupportedRoute(ContractDetail, FunctionEnum.SMART_CONTRACT)}
      />
      <Route
        path={routers.SMART_CONTRACT}
        exact
        component={isSupportedRoute(SmartContractDetail, FunctionEnum.SMART_CONTRACT)}
      />
      <Route
        path={routers.NATIVE_SCRIPTS_AND_SC}
        exact
        component={isSupportedRoute(NativeScriptAndSC, FunctionEnum.SMART_CONTRACT)}
      />
      <Route
        path={routers.NATIVE_SCRIPT_DETAIL}
        exact
        component={isSupportedRoute(NativeScriptsDetailPage, FunctionEnum.SMART_CONTRACT)}
      />

      <Route
        path={routers.INSTANTANEOUS_REWARDS}
        exact
        component={isSupportedRoute(InstantRewards, FunctionEnum.REWARDS)}
      />
      <Route
        path={routers.STAKE_ADDRESS_REGISTRATION}
        exact
        component={isSupportedRoute(StakeAddressRegistration, FunctionEnum.STAKE_ADDRESS_REGISTRATION)}
      />
      <Route
        path={routers.STAKE_ADDRESS_DEREGISTRATION}
        exact
        component={isSupportedRoute(StakeAddressDeregistration, FunctionEnum.STAKE_ADDRESS_REGISTRATION)}
      />
      <Route
        path={routers.STAKE_DETAIL}
        exact
        component={isSupportedRoute(StakeDetail, FunctionEnum.STAKE_ADDRESS_REGISTRATION)}
      />
      <Route
        path={routers.POOL_CERTIFICATE}
        exact
        component={isSupportedRoute(PoolsCertificate, FunctionEnum.POOL_REGISTRATION)}
      />
      <Route
        path={routers.POOL_DEREGISTRATION}
        exact
        component={isSupportedRoute(PoolsDeregistration, FunctionEnum.POOL_REGISTRATION)}
      />
      <Route
        path={routers.PROTOCOL_PARAMETER}
        exact
        component={isSupportedRoute(ProtocolParameter, FunctionEnum.PROTOCOL_PARAMETER)}
      />
      <Route
        path={routers.NETWORK_MONITORING}
        exact
        component={isSupportedRoute(NetworkMonitoring, FunctionEnum.NETWORK_MONITORING)}
      />
      <Route path={routers.DREPS} exact component={isSupportedRoute(Dreps, FunctionEnum.GOVERNANCE)} />
      <Route
        path={routers.CONSTITUIONAL_COMMITTEES}
        exact
        component={isSupportedRoute(ConstitutionalCommittees, FunctionEnum.GOVERNANCE)}
      />
      <Route
        path={routers.OVERVIEW_GOVERNANCE_ACTION}
        exact
        component={isSupportedRoute(GovernanceActionDetails, FunctionEnum.GOVERNANCE)}
      />
      <Route
        path={routers.CONSTITUIONAL_COMMITTEE_DETAIL}
        exact
        component={isSupportedRoute(ConstitutionalCommitteeDetail, FunctionEnum.GOVERNANCE)}
      />
      <Route path={routers.DREP_DETAILS} exact component={isSupportedRoute(DrepDetail, FunctionEnum.GOVERNANCE)} />

      <Route path={routers.NOT_FOUND} component={NotFound} />
    </Switch>
  );
};

export default Routes;
