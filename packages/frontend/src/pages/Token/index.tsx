import { stringify } from "qs";
// @ts-ignore
import React, {useEffect, useRef, useState} from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {Box, CircularProgress} from "@mui/material";

import { details } from "src/commons/routers";
import { formatDateTimeLocal, formatNumberTotalSupply, getShortHash } from "src/commons/utils/helper";
import Card from "src/components/commons/Card";
import Table, { Column } from "src/components/commons/Table";
import FormNowMessage from "src/components/commons/FormNowMessage";
import CustomTooltip from "src/components/commons/CustomTooltip";
import usePageInfo from "src/commons/hooks/usePageInfo";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";

import { AssetName, Logo, StyledContainer, TimeDuration } from "./styles";
import {ApiReturnType} from "@shared/APIReturnType";
import {ApiConnector} from "../../commons/connector/ApiConnector";
import {ITokenOverview} from "@shared/dtos/token.dto";

const Tokens = () => {
  const { t } = useTranslation();

  const { search } = useLocation();
  const history = useHistory();
  const { pageInfo, setSort } = usePageInfo();

  const queries = new URLSearchParams(search);

  const mainRef = useRef(document.querySelector("#main"));

  const [fetchData, setFetchData] = useState<ApiReturnType<ITokenOverview[]>>();
  const [loading, setLoading] = useState<boolean>(true);
  const apiConnector = ApiConnector.getApiConnector();

  function updateData(page: number) {
    pageInfo.page = page;
    setLoading(true);
    apiConnector.getTokensPage(pageInfo).then((data: ApiReturnType<ITokenOverview[]>) => {
      setFetchData(data);
      setLoading(false);
    });
  }



  useEffect(() => {
    window.history.replaceState({}, document.title);
    document.title = `Native Tokens | Cardano Blockchain Explorer`;
  }, []);

  useEffect(() => {
    updateData(0);
  }, []);

  const columns: Column<ITokenOverview>[] = [
    // {
    //   title: <Box data-testid="tokens.table.title.icon">{t("glossary.icon")}</Box>,
    //   key: "icon",
    //   minWidth: "50px",
    //   render: (r) => (r?.metadata?.logo ? <Logo src={`${r.metadata?.logo}`} alt="icon" /> : "")
    // },
    {
      title: <Box data-testid="tokens.table.title.assetName">{t("glossary.assetName")}</Box>,
      key: "assetName",
      minWidth: "100px",
      render: (r, idx) =>
        r.displayName && r.displayName.length > 20 ? (
          <CustomTooltip placement={"top"} title={r.displayName}>
            <AssetName data-testid={`token.assetName#${idx}`} to={details.token(r?.fingerprint ?? "")}>
              {getShortHash(r.displayName || "")}
            </AssetName>
          </CustomTooltip>
        ) : (
          <AssetName
            data-testid={`token.assetName#${idx}`}
            to={details.token(r?.fingerprint ?? "")}
            data-policy={`${r?.policy}${r?.name}`}
          >
            {r.displayName || getShortHash(r.fingerprint || "")}
          </AssetName>
        )
    },
    // {
    //   title: <Box data-testid="tokens.table.title.scriptHash">{t("glossary.scriptHash")}</Box>,
    //   key: "policy",
    //   minWidth: "100px",
    //   render: (r, idx) => (
    //     <CustomTooltip title={r.policy}>
    //       <AssetName
    //         to={r.policyIsNativeScript ? details.nativeScriptDetail(r.policy) : details.smartContract(r.policy)}
    //         data-testid={`token.scriptHash#${idx}`}
    //       >
    //         {getShortHash(r.policy)}
    //       </AssetName>
    //     </CustomTooltip>
    //   )
    // },
    {
      title: (
        <Box data-testid="tokens.table.title.totalSupply" component={"span"}>
          {t("common.totalSupply")}
        </Box>
      ),
      key: "supply",
      minWidth: "150px",
      render: (r) => {
        const decimalToken = r?.metadata?.decimals || 0;
        return formatNumberTotalSupply(r?.supply, decimalToken);
      },
      sort: ({ columnKey, sortValue }) => {
        sortValue ? setSort(`${columnKey},${sortValue}`) : setSort("");
      }
    },
    // {
    //   title: (
    //     <Box data-testid="tokens.table.title.createdAt" component={"span"}>
    //       {t("createdAt")}
    //     </Box>
    //   ),
    //   key: "time",
    //   minWidth: "150px",
    //   render: (r) => <DatetimeTypeTooltip>{formatDateTimeLocal(r.createdOn || "")}</DatetimeTypeTooltip>,
    //   sort: ({ columnKey, sortValue }) => {
    //     sortValue ? setSort(`${columnKey},${sortValue}`) : setSort("");
    //   }
    // }
  ];

  const toTokenDetail = (_: React.MouseEvent<Element, MouseEvent>, r: ITokenOverview) => {
    if (!r.fingerprint) return;
    history.push(details.token(r.fingerprint ?? ""));
  };

  if (loading) return <CircularProgress />;

  return (
    <StyledContainer>
      <Card title={t("glossary.nativeTokens")}>
        <Table
          {...fetchData}
          data={fetchData.data}
          columns={columns}
          total={{ title: "Total", count: fetchData.total }}
          pagination={{
            ...pageInfo,
            total: fetchData.total,
            onChange: (page, size) => {
              mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              history.replace({
                search: stringify({ ...pageInfo, page, size, tokenName: queries.get("tokenName") || "" })
              });
            },
            hideLastPage: true
          }}
          onClickRow={toTokenDetail}
          rowKey="fingerprint"
          showTabView
          tableWrapperProps={{ sx: (theme) => ({ [theme.breakpoints.between("sm", "md")]: { minHeight: "60vh" } }) }}
        />
      </Card>
    </StyledContainer>
  );
};

export default Tokens;
