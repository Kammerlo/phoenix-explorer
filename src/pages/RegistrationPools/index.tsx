import { useEffect, useRef, useState } from "react";
import { stringify } from "qs";
import { useHistory } from "react-router-dom";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import Card from "src/components/commons/Card";
import useFetchList from "src/commons/hooks/useFetchList";
import { details } from "src/commons/routers";
import { formatADAFull, formatDateTimeLocal, formatPercent, getShortHash } from "src/commons/utils/helper";
import CustomTooltip from "src/components/commons/CustomTooltip";
import Table, { Column } from "src/components/commons/Table";
import { API } from "src/commons/utils/api";
import NoRecord from "src/components/commons/NoRecord";
import FormNowMessage from "src/components/commons/FormNowMessage";
import ADAicon from "src/components/commons/ADAIcon";
import usePageInfo from "src/commons/hooks/usePageInfo";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";

import { RegistrationContainer, StakeKey, StyledLink, StyledPoolLink, TimeDuration } from "./styles";
import { ApiConnector } from "../../commons/connector/ApiConnector";
import { ApiReturnType } from "../../commons/connector/types/APIReturnType";

export enum POOL_TYPE {
  REGISTRATION = "registration",
  DEREREGISTRATION = "de-registration"
}

interface Props {
  poolType: POOL_TYPE;
}

const RegistrationPools: React.FC<Props> = ({ poolType }) => {
  const { t } = useTranslation();
  const history = useHistory();
  const { pageInfo, setSort } = usePageInfo();
  const mainRef = useRef(document.querySelector("#main"));
  const blockKey = useSelector(({ system }: RootState) => system.blockKey);
  const [data, setData] = useState<ApiReturnType<Registration[]>>();
  const apiConnector: ApiConnector = ApiConnector.getApiConnector();

  useEffect(() => {
    const title = poolType === POOL_TYPE.REGISTRATION ? "Registration" : "Deregistration";
    document.title = `${title} Pools | Cardano Blockchain Explorer`;
    apiConnector.getPoolRegistrations(poolType).then((data) => {
      setData(data);
    });
  }, [poolType]);

  const columns: Column<Registration>[] = [
    {
      title: <Box data-testid="registrationPools.transactionHashTitle">{t("glossary.txHash")}</Box>,
      key: "bk.time",
      render: (pool, idx) => {
        return (
          <>
            <CustomTooltip title={pool.txHash}>
              <StyledLink
                data-testid={`registrationPools.transactionHashValue#${idx}`}
                to={details.transaction(pool.txHash)}
              >
                {getShortHash(pool.txHash || "")}
              </StyledLink>
            </CustomTooltip>
          </>
        );
      }
    },
    {
      title: <Box data-testid="registrationPools.createdAtTitle">{t("glossary.createdAt")}</Box>,
      key: "created_at",
      render: (pool) => (
        <DatetimeTypeTooltip data-testid="registrationPools.createdAtValue">
          {formatDateTimeLocal(pool.txTime || "")}
        </DatetimeTypeTooltip>
      )
    },
    {
      title: <Box data-testid="registrationPools.blockTitle">{t("glossary.block")}</Box>,
      key: "block",
      minWidth: "50px",
      render: (pool) => (
        <StyledLink data-testid="registrationPools.blockValue" to={details.block(pool.block)}>
          {pool.block}
        </StyledLink>
      )
    },
    {
      title: <Box data-testid="registrationPools.epochTitle">{t("glossary.epoch")}</Box>,
      key: "epoch",
      minWidth: "50px",
      render: (r) => (
        <StyledLink data-testid="registrationPools.epochValue" to={details.epoch(r.epoch)}>
          {r.epoch}
        </StyledLink>
      )
    },
    {
      title: <Box data-testid="registrationPools.absoluteSlotNo">{t("glossary.absoluteSlot")}</Box>,
      key: "slotNo",
      minWidth: "100px"
    },
    {
      title: <Box data-testid="registrationPools.poolTitle">{t("glossary.pool")}</Box>,
      key: "pool",
      maxWidth: 200,
      render: (pool) => (
        <StyledPoolLink
          data-testid="registrationPools.poolValue"
          to={{ pathname: details.delegation(pool.poolId), state: { fromPath: history.location.pathname } }}
        >
          <CustomTooltip title={pool.poolName || pool.poolId || ""}>
            <Box component={"span"}>
              {pool.poolName?.startsWith("pool")
                ? getShortHash(pool.poolName)
                : pool.poolName || getShortHash(pool.poolId)}
            </Box>
          </CustomTooltip>
        </StyledPoolLink>
      )
    },
    {
      title: (
        <Box data-testid="registrationPools.pledgeTitle" component="span">
          {t("glossary.pledge")} (<ADAicon />)
        </Box>
      ),
      key: poolType === POOL_TYPE.REGISTRATION ? "pledge" : "pu.pledge",
      render: (pool) => <Box data-testid="registrationPools.pledgeValue">{formatADAFull(pool.pledge)}</Box>,
      sort: ({ columnKey, sortValue }) => {
        sortValue ? setSort(`${columnKey},${sortValue}`) : setSort("");
      }
    },
    {
      title: (
        <Box data-testid="registrationPools.fixedCostTitle" component="span" sx={{ textWrap: "nowrap" }}>
          {t("glossary.fixedCost")} (<ADAicon />)
        </Box>
      ),
      key: poolType === POOL_TYPE.REGISTRATION ? "fixedCost" : "pu.fixedCost",
      render: (pool) => <Box data-testid="registrationPools.fixedCostValue">{formatADAFull(pool.cost)}</Box>,
      sort: ({ columnKey, sortValue }) => {
        sortValue ? setSort(`${columnKey},${sortValue}`) : setSort("");
      }
    },
    {
      title: (
        <Box component={"span"} data-testid="registrationPools.marginTitle">
          {t("glossary.margin")}
        </Box>
      ),
      key: poolType === POOL_TYPE.REGISTRATION ? "margin" : "pu.margin",
      render: (pool) => <Box data-testid="registrationPools.marginValue">{formatPercent(pool.margin)}</Box>,
      sort: ({ columnKey, sortValue }) => {
        sortValue ? setSort(`${columnKey},${sortValue}`) : setSort("");
      }
    }
  ];
  if (!Object.values(POOL_TYPE).includes(poolType)) return <NoRecord />;

  return (
    <RegistrationContainer>
      <Card
        title={poolType === POOL_TYPE.REGISTRATION ? t("glossary.poolCertificate") : t("glossary.poolDeregistration")}
      >
        {!data?.error && (
          <TimeDuration>
            <FormNowMessage time={data?.lastUpdated} />
          </TimeDuration>
        )}
      </Card>
      <Box>
        <Table
          data-testid="registrationPools.table"
          data={data?.data || []}
          columns={columns}
          total={{ title: "Total Transactions", count: data?.total || 0 }}
          pagination={{
            ...pageInfo,
            onChange: (page, size) => {
              history.replace({ search: stringify({ ...pageInfo, page, size }) });
              mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            },
            total: data?.total || 0
          }}
          tableWrapperProps={{ sx: (theme) => ({ [theme.breakpoints.between("sm", "md")]: { minHeight: "60vh" } }) }}
        />
      </Box>
    </RegistrationContainer>
  );
};

export default RegistrationPools;
