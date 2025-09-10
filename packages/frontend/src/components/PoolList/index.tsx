import { Box, CircularProgress } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import usePageInfo from "src/commons/hooks/usePageInfo";
import { details } from "src/commons/routers";
import { formatADAFull, formatPercent, getShortHash } from "src/commons/utils/helper";
import ADAicon from "src/components/commons/ADAIcon";
import CustomTooltip from "src/components/commons/CustomTooltip";
import Table, { Column } from "src/components/commons/Table";
import {PoolOverview} from "@shared/dtos/pool.dto";

import { DelegationContainer, PoolName } from "./styles";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import { ApiReturnType } from "@shared/APIReturnType";
import { useHistory } from "react-router";

const DelegationLists: React.FC = () => {
  const { t } = useTranslation();
  const { pageInfo } = usePageInfo();
  const [ fetchData, setFetchData] = useState<ApiReturnType<PoolOverview[]>>();
  const history = useHistory<{ tickerNameSearch?: string; fromPath?: SpecialPath }>();
  const [loading, setLoading] = useState(true);

  const apiConnector = ApiConnector.getApiConnector();

  apiConnector.getPoolList(pageInfo).then((response) => {
    setFetchData(response);
    setLoading(false);
  });

  const columns: Column<PoolOverview>[] = [
    {
      title: <div data-testid="poolList.poolNameTitle">{t("glossary.pool")}</div>,
      key: "poolName",
      minWidth: "150px",
      render: (r, idx) => (
        <CustomTooltip
          title={
            r.tickerName ? (
              <div>
                <Box fontWeight={"bold"} component={"span"}>
                  Ticker:{" "}
                </Box>
                {r.tickerName}
              </div>
            ) : undefined
          }
        >
          <PoolName
            data-testid={`poolList.poolNameValue#${idx}`}
            to={{ pathname: details.delegation(r.poolId) }}
          >
            <Box
              component={"span"}
              textOverflow={"ellipsis"}
              display={(r.poolName || r.poolId || "").length > 20 ? "inline-block" : "inline"}
              width={"200px"}
              whiteSpace={"nowrap"}
              overflow={"hidden"}
            >
              {r.poolName || `${getShortHash(r.poolId)}`}
            </Box>
          </PoolName>
        </CustomTooltip>
      )
    },
    {
      title: (
        <Box component={"span"} data-testid="poolList.poolSizeTitle">
          {t("glossary.poolSize")} (<ADAicon />)
        </Box>
      ),
      key: "poolSize",
      minWidth: "120px",
      render: (r, idx) => (
        <Box component={"span"} data-testid={`poolList.poolSizeValue#${idx}`}>
          {r.poolSize != null ? formatADAFull(r.poolSize) : t("common.N/A")}
        </Box>
      )
    },
    {
      title: (
        <Box component={"span"} data-testid="poolList.declaredPledgeTitle">
          {t("glossary.declaredPledge")} (<ADAicon />)
        </Box>
      ),
      key: "pu.pledge",
      minWidth: "120px",
      render: (r, idx) => (
        <Box component={"span"} data-testid={`poolList.declaredPledgeValue#${idx}`}>
          {formatADAFull(r.pledge)}
        </Box>
      )
    },
    {
      title: (
        <Box component={"span"} data-testid="poolList.saturationTitle">
          {t("glossary.saturation")}
        </Box>
      ),
      minWidth: "120px",
      key: "saturation",
      render: (r, idx) =>
        r.saturation != null ? (
          <Box component={"span"} mr={1} data-testid={`poolList.saturationValue#${idx}`}>
            {formatPercent(r.saturation / 100) || `0%`}
          </Box>
        ) : (
          t("common.N/A")
        )
    },
    {
      title: (
        <Box component={"span"} data-testid="poolList.blockLifetimeTitle">
          {t("glossary.blocksLifetime")}
        </Box>
      ),
      minWidth: "100px",
      key: "lifetimeBlock",
      render: (r, idx) => (
        <Box component={"span"} data-testid={`poolList.blockLifetimeValue#${idx}`}>
          {r.lifetimeBlock || 0}
        </Box>
      )
    },
    {
      title: (
        <Box component={"span"} data-testid="poolList.votingPowerTitle">
          {t("votingPower")}
        </Box>
      ),
      key: "votingPower",
      minWidth: "120px",
      render: (r, idx) =>
        r.votingPower != null ? (
          <CustomTooltip data-testid={`poolList.votingPowerValue#${idx}`} title={`${r.votingPower * 100}%`}>
            <Box component={"span"}>{formatPercent(r.votingPower)}</Box>
          </CustomTooltip>
        ) : (
          t("common.N/A")
        )
    },
    {
      title: (
        <Box component={"span"} data-testid="poolList.participationRateTitle">
          {t("governanceParticipationRate")}
        </Box>
      ),
      key: "governanceParticipationRate",
      minWidth: "120px",
      render: (r, idx) => (
        <div data-testid={`poolList.participationRateValue#${idx}`}>
          {r.governanceParticipationRate != null ? `${formatPercent(r.governanceParticipationRate)}` : t("common.N/A")}
        </div>
      )
    }
  ];

  if (loading) return <CircularProgress />;

  return (
    <DelegationContainer>
      <Table
        {...fetchData}
        data-testid="delegationList.table"
        columns={columns}
        total={{ count: fetchData.total, title: "Total"}}
        onClickRow={(_, r: Delegators) => history.push(details.delegation(r.poolId))}
        pagination={{
          ...pageInfo,
          total: fetchData.total
        }}
      />
    </DelegationContainer>
  );
};

export default DelegationLists;
