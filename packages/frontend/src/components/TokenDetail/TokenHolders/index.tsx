import React, { MouseEvent } from "react";
import { useHistory } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";

import { formatADAFull, getShortHash, numberWithCommas, truncateDecimals } from "src/commons/utils/helper";
import { details } from "src/commons/routers";
import { ApiReturnType } from "@shared/APIReturnType";
import { TokenHolder } from "@shared/dtos/token.dto";
import CustomTooltip from "../../commons/CustomTooltip";
import Table, { Column } from "../../commons/Table";
import Card from "../../commons/Card";
import { StyledLink } from "../../TransactionLists/styles";
import NotAvailable from "../../commons/NotAvailable";

interface TokenHoldersProps {
  tokenHolders: ApiReturnType<TokenHolder[]>;
  updateData?: (page: number) => void;
  loading: boolean;
  paginated?: boolean;
}

const TokenHolders: React.FC<TokenHoldersProps> = ({ 
  tokenHolders, 
  loading, 
  updateData, 
  paginated = true 
}) => {
  const { t } = useTranslation();
  const history = useHistory();

  const onClickRow = (e: MouseEvent<Element, globalThis.MouseEvent>, r: TokenHolder) => {
    if (e.target instanceof HTMLAnchorElement || (e.target instanceof Element && e.target.closest("a"))) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    history.push(details.address(r.address));
  };

  const { error } = tokenHolders || {};
  const columns: Column<TokenHolder>[] = [
    {
      title: <Box data-testid="tokenholders.table.title.address">{t("glossary.address")}</Box>,
      key: "address",
      minWidth: 120,
      render: (r, index) => (
        <CustomTooltip title={r.address}>
          <StyledLink to={details.address(r.address)} data-testid={`tokenholders.table.value.address#${index}`}>
            {getShortHash(r.address)}
          </StyledLink>
        </CustomTooltip>
      )
    },
    {
        title: <Box data-testid="tokenholders.table.title.amount">{t("glossary.amount")}</Box>,
      key: "amount",
      minWidth: 120,
      render: (r, index) => (
        <Box data-testid={`tokenholders.table.value.amount#${index}`}>
          {r.amount ? numberWithCommas(r.amount) : <NotAvailable />}
        </Box>
      )
    },
    {
        title: <Box data-testid="tokenholders.table.title.ratio">{t("glossary.ratio")}</Box>,
      key: "ratio",
      minWidth: 80,
      render: (r, index) => (
        <Box data-testid={`tokenholders.table.value.ratio#${index}`}>
              {r.ratio ? `${truncateDecimals(r.ratio, 2)}%` : <NotAvailable />}
        </Box>
      )
    }
  ];

  if (loading) return <CircularProgress />;

  return (
    <Card title="Token Holders" data-testid="token-holders-title">
      <Table
        columns={columns}
        data={tokenHolders?.data || []}
        loading={loading}
        error={error}
        {...(paginated && updateData && tokenHolders
          ? {
              pagination: {
                page: tokenHolders.currentPage,
                total: tokenHolders.total,
                onChange: (page) => {
                  updateData(page);
                },
                hideLastPage: true
              }
            }
          : undefined
        )}
        onClickRow={onClickRow}
        rowKey="address"
        data-testid="token-holders-table"
      />
    </Card>
  );
};

export default TokenHolders;