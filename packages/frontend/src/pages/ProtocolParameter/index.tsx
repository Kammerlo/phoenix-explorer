import { Box, Container, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import GroupProtocoParameters from "src/components/ProtocolParameters/GroupProtocolParameters/GroupProtocolParameters";
import { ApiConnector } from "../../commons/connector/ApiConnector";
import { ApiReturnType } from "../../commons/connector/types/APIReturnType";
import { useHistory, useParams } from "react-router-dom";
import { TProtocolParam } from "../../types/protocol";
import NoRecord from "../../components/commons/NoRecord";
import {
  displayTooltipEconomic,
  displayTooltipGovernance,
  displayTooltipNetwork,
  displayTooltipTechnical
} from "../../components/ProtocolParameters/ExplainerText";
import { ContainerHeader, Header } from "./styles";

const ProtocolParameter: React.FC = () => {
  const { t } = useTranslation();

  const { histories } = useParams<{ histories?: "histories" }>();
  const history = useHistory();
  const [apiResponse, setApiResponse] = useState<ApiReturnType<TProtocolParam>>();
  const [loading, setLoading] = useState<boolean>(true);

  const apiConnector: ApiConnector = ApiConnector.getApiConnector();

  useEffect(() => {
    window.history.replaceState({}, document.title);
    document.title = `${t("common.protocolParameters")} | ${t("head.page.dashboard")}`;
    apiConnector.getCurrentProtocolParameters().then((response) => {
      setApiResponse(response);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const theme = useTheme();

  if (histories && histories !== "histories") return <NoRecord />;

  const Network = [
    { name: "maxBBSize", value: apiResponse?.data?.maxBBSize, icon: true },
    { name: "maxTxSize", value: apiResponse?.data?.maxTxSize, icon: true },
    { name: "maxBHSize", value: apiResponse?.data?.maxBHSize, icon: true },
    { name: "maxValSize", value: apiResponse?.data?.maxValSize, icon: true },
    {
      name: "maxTxExMem",
      value: apiResponse?.data?.maxTxExMem,
      time: apiResponse?.data?.maxTxExMem,
      icon: false
    },
    {
      name: "maxTxExSteps",
      value: apiResponse?.data?.maxTxExSteps,
      time: apiResponse?.data?.maxTxExSteps,
      icon: false
    },
    {
      name: "maxBlockExMem",
      value: apiResponse?.data?.maxBlockExMem,
      time: apiResponse?.data?.maxBlockExMem,
      icon: false
    },
    {
      name: "maxBlockExSteps",
      value: apiResponse?.data?.maxBlockExSteps,
      time: apiResponse?.data?.maxBlockExSteps,
      icon: false
    },
    {
      name: "maxCollateralInputs",
      value: apiResponse?.data?.maxCollateralInputs,
      time: apiResponse?.data?.maxCollateralInputs,
      icon: false
    }
  ];

  const Economic = [
    { name: "minFeeA", value: apiResponse?.data?.minFeeA, icon: true },
    { name: "minFeeB", value: apiResponse?.data?.minFeeB, icon: true },
    { name: "keyDeposit", value: apiResponse?.data?.keyDeposit, icon: false },
    { name: "poolDeposit", value: apiResponse?.data?.poolDeposit, icon: false },
    {
      name: "rho",
      value: apiResponse?.data?.rho,
      icon: false
    },
    {
      name: "tau",
      value: apiResponse?.data?.tau,
      icon: false
    },
    {
      name: "minPoolCost",
      value: apiResponse?.data?.minPoolCost,
      icon: false
    },
    {
      name: "coinsPerUTxOByte",
      value: apiResponse?.data?.coinsPerUTxOByte,
      icon: true
    },
    {
      name: "priceStep",
      value: apiResponse?.data?.priceStep,
      icon: false
    },
    {
      name: "priceMem",
      value: apiResponse?.data?.priceMem,
      icon: false
    }
  ];

  const Technical = [
    { name: "a0", value: apiResponse?.data?.a0, icon: false },
    { name: "eMax", value: apiResponse?.data?.eMax, icon: false },
    { name: "nOpt", value: apiResponse?.data?.nOpt, icon: false },
    { name: "costModels", value: apiResponse?.data?.costModels, icon: false },
    {
      name: "collateralPercentage",
      value: apiResponse?.data?.collateralPercentage,
      icon: false
    },
    {
      name: "protocolMajor",
      value: apiResponse?.data?.protocolMajor,
      icon: false
    },
    {
      name: "protocolMinor",
      value: apiResponse?.data?.protocolMinor,
      icon: false
    }
  ];

  const Governance = [
    {
      name: "govActionLifetime",
      value: apiResponse?.data?.govActionLifetime,
      icon: false
    },
    {
      name: "govActionDeposit",
      value: apiResponse?.data?.govActionDeposit,
      icon: true
    },
    { name: "drepDeposit", value: apiResponse?.data?.drepDeposit, icon: false },
    {
      name: "drepActivity",
      value: apiResponse?.data?.drepActivity,
      icon: false
    },
    {
      name: "ccMinSize",
      value: apiResponse?.data?.ccMinSize,
      icon: false
    },
    {
      name: "ccMaxTermLength",
      value: apiResponse?.data?.ccMaxTermLength,
      icon: false
    }
  ];
  if (apiResponse?.error) return <NoRecord />;

  return (
    <Container>
      <Box marginBottom={"109px"} marginTop={"64px"}>
        <ContainerHeader>
          <Header>{t("common.protocolParameters")}</Header>
        </ContainerHeader>
        <GroupProtocoParameters loading={loading} data={displayTooltipNetwork} group={Network} type="network" />
        <GroupProtocoParameters loading={loading} group={Economic} data={displayTooltipEconomic} type="economic" />
        <GroupProtocoParameters loading={loading} group={Technical} data={displayTooltipTechnical} type="technical" />
        <GroupProtocoParameters
          loading={loading}
          data={displayTooltipGovernance}
          group={Governance}
          type="governance"
        />
      </Box>
    </Container>
  );
};

export default ProtocolParameter;
