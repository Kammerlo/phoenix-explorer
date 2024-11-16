import { useEffect, useRef, useState } from "react";
import { stringify } from "qs";
import { useSelector } from "react-redux";
import { Box, CircularProgress } from "@mui/material";
import { useHistory, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { details } from "src/commons/routers";
import { formatDateTimeLocal, getPageInfo, getShortHash } from "src/commons/utils/helper";
import Card from "src/components/commons/Card";
import CustomTooltip from "src/components/commons/CustomTooltip";
import DetailViewStakeKey from "src/components/commons/DetailView/DetailViewStakeKey";
import Table, { Column } from "src/components/commons/Table";
import { setOnDetailView } from "src/stores/user";
import SelectedIcon from "src/components/commons/SelectedIcon";
import { useScreen } from "src/commons/hooks/useScreen";
import FormNowMessage from "src/components/commons/FormNowMessage";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";

import { StyledContainer, StyledLink, TimeDuration } from "./styles";
import { ApiConnector, StakeAddressAction } from "../../commons/connector/ApiConnector";
import { ApiReturnType } from "../../commons/connector/types/APIReturnType";

export enum STAKE_ADDRESS_TYPE {
  REGISTRATION = "registration",
  DEREREGISTRATION = "deregistration",
  DELEGATION = "delegation"
}

interface Props {
  stakeAddressType: STAKE_ADDRESS_TYPE;
}

const Stake: React.FC<Props> = ({ stakeAddressType }) => {
  const mainRef = useRef(document.querySelector("#main"));
  const { t } = useTranslation();
  const { onDetailView } = useSelector(({ user }: RootState) => user);
  const { search } = useLocation();
  const history = useHistory();
  const fromPath = history.location.pathname as SpecialPath;

  const pageInfo = getPageInfo(search);
  const { isMobile } = useScreen();

  const [data, setData] = useState<ApiReturnType<IStakeKey[]>>();

  const apiConnector = ApiConnector.getApiConnector();

  useEffect(() => {
    let title = "";
    switch (stakeAddressType) {
      case STAKE_ADDRESS_TYPE.DELEGATION:
        apiConnector.getStakeDelegations().then((res) => {
          setData(res);
        });
        title = "Delegations";
        break;
      case STAKE_ADDRESS_TYPE.REGISTRATION:
        title = "Registrations";
        apiConnector.getStakeAddressRegistrations(StakeAddressAction.REGISTRATION).then((res) => {
          setData(res);
        });
        break;
      case STAKE_ADDRESS_TYPE.DEREREGISTRATION:
        apiConnector.getStakeAddressRegistrations(StakeAddressAction.DEREGISTRATION).then((res) => {
          setData(res);
        });
        title = "Deregistrations";
        break;
    }
    document.title = `${title} Stake Addresses | Cardano Blockchain Explorer`;
  }, [stakeAddressType]);

  const columns: Column<IStakeKey>[] = [
    {
      title: <div data-testid="stake.txHashTitle">{t("glossary.txHash")}</div>,
      key: "txHash",
      minWidth: isMobile ? 245 : 80,
      render: (r, idx) => (
        <CustomTooltip title={r.txHash}>
          <StyledLink data-testid={`stake.txHashValue#${idx}`} to={details.transaction(r.txHash)}>
            {getShortHash(r.txHash)}
          </StyledLink>
        </CustomTooltip>
      )
    },
    {
      title: <div data-testid="stake.createdAtTitle">{t("glossary.createdAt")}</div>,
      key: "time",
      render: (r) => (
        <DatetimeTypeTooltip data-testid="stake.createdAtValue">
          {formatDateTimeLocal(r.txTime || "")}
        </DatetimeTypeTooltip>
      )
    },
    {
      title: <div data-testid="stake.blockTitle">{t("glossary.block")}</div>,
      key: "block",
      minWidth: "50px",
      render: (r) => (
        <StyledLink data-testid="stake.blockValue" to={details.block(r.block)}>
          {r.block}
        </StyledLink>
      )
    },
    {
      title: <div data-testid="stake.epochTitle">{t("glossary.epoch")}</div>,
      key: "epoch",
      minWidth: "50px",
      render: (r) => (
        <StyledLink data-testid="stake.epochValue" to={details.epoch(r.epoch)}>
          {r.epoch}
        </StyledLink>
      )
    },
    {
      title: <div data-testid="stake.epochSlotNoTitle">{t("glossary.slot")}</div>,
      key: "epochSlotNo",
      minWidth: "50px",
      render: (r) => <div data-testid="stake.epochSlotNoValue">{r.epochSlotNo}</div>
    },
    {
      title: <div data-testid="stake.slotNoTitle">{t("glossary.absoluteSlot")}</div>,
      key: "slotNo",
      minWidth: "100px",
      render: (r) => <div data-testid="stake.slotNoValue">{r.epochSlotNo}</div>
    },
    {
      title: <div data-testid="stake.stakeAddressTitle">{t("glossary.stakeAddress")}</div>,
      key: "stakeAddress",
      render: (r) => (
        <>
          <CustomTooltip title={r.stakeKey}>
            <StyledLink
              data-testid="stake.stakeAddressValue"
              to={{ pathname: details.stake(r.stakeKey), state: { fromPath } }}
            >
              {getShortHash(r.stakeKey)}
            </StyledLink>
          </CustomTooltip>
        </>
      )
    }
  ];
  if (stakeAddressType === STAKE_ADDRESS_TYPE.DELEGATION) {
    columns.push({
      title: <div data-testid="stake.poolTitle">{t("glossary.pool")}</div>,
      key: "pool",
      render: (r) => (
        <>
          <CustomTooltip title={r.poolName || ""}>
            <StyledLink
              data-testid="stake.poolValue"
              to={{ pathname: details.delegation(r.poolName), state: { fromPath } }}
            >
              {getShortHash(r.poolName)}
            </StyledLink>
          </CustomTooltip>
        </>
      )
    });
  }
  if (!data) return <CircularProgress />;
  return (
    <StyledContainer>
      <Box className="stake-list">
        <Card
          title={
            stakeAddressType === STAKE_ADDRESS_TYPE.REGISTRATION
              ? t("head.page.stakeAddressRegistration")
              : stakeAddressType === STAKE_ADDRESS_TYPE.DEREREGISTRATION
              ? t("head.page.stakeAddressDeregistration")
              : t("head.page.stakeDelegation")
          }
        >
          {!data?.error && (
            <TimeDuration>
              <FormNowMessage time={data!.lastUpdated} />
            </TimeDuration>
          )}
          <Table
            data-testid="stake.table"
            data={data?.data || []}
            columns={columns}
            total={{ title: "Total Token List", count: data?.total || 0 }}
            pagination={{
              ...pageInfo,
              total: data?.total || 0,
              onChange: (page, size) => {
                mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                history.push({ search: stringify({ page, size, stakeAddressType }) });
              }
            }}
            rowKey="txKey"
            showTabView
            tableWrapperProps={{ sx: (theme) => ({ [theme.breakpoints.between("sm", "md")]: { minHeight: "60vh" } }) }}
          />
        </Card>
      </Box>
    </StyledContainer>
  );
};

export default Stake;
