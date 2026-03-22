import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Box, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";

import {
  TimeIconComponent,
  TotalOutput,
  ExchageAltIcon,
  CubeIconComponent,
  SlotIcon,
  TooltipIcon
} from "src/commons/resources";
import { formatADAFull, formatNameBlockNo } from "src/commons/utils/helper";
import { MAX_SLOT_EPOCH } from "src/commons/utils/constants";
import { details } from "src/commons/routers";
import { RootState } from "src/stores/types";
import DetailHeader from "src/components/commons/DetailHeader";
import CustomTooltip from "src/components/commons/CustomTooltip";
import ADAicon from "src/components/commons/ADAIcon";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";

import { StyledLink, TitleCard } from "./styles";
import {TransactionDetail} from "@shared/dtos/transaction.dto";

interface Props {
  data: TransactionDetail | null | undefined;
  loading: boolean;
}

const TransactionOverview: React.FC<Props> = ({ data, loading }) => {
  const { t } = useTranslation();

  const blockNo = useSelector(({ system }: RootState) => system.blockNo);
  const epochNo = useSelector(({ system }: RootState) => system.currentEpoch?.no);

  const [lastUpdated, setLastUpdated] = useState<number>();

  useEffect(() => {
    if (data) setLastUpdated(Date.now());
  }, [data, blockNo]);

  const listOverview = [
    {
      icon: TimeIconComponent,
      title: (
        <Box data-testid="transactionOverview.createdAtTitle" display={"flex"} alignItems="center">
          <TitleCard mr={1}>{t("createdAt")}</TitleCard>
        </Box>
      ),
      value: (
        <DatetimeTypeTooltip data-testid="transactionOverview.createdAtValue">{data?.tx?.time}</DatetimeTypeTooltip>
      )
    },
    {
      icon: TotalOutput,
      title: (
        <Box data-testid="transactionOverview.totalOutputTitle" display={"flex"} alignItems="center">
          <TitleCard mr={1}>{t("glossary.totalOutput")}</TitleCard>
        </Box>
      ),
      value: (
        <Box data-testid="transactionOverview.totalOutputValue" component={"span"}>
          {formatADAFull(data?.tx?.totalOutput)} <ADAicon />
        </Box>
      )
    },
    {
      icon: ExchageAltIcon,
      title: (
        <Box display={"flex"} alignItems="center">
          <TitleCard mr={1} data-testid="transactionOverview.transactionFeesTitle">
            {t("glossary.transactionfees")}
          </TitleCard>
        </Box>
      ),
      value: (
        <Box data-testid="transactionOverview.transactionFeesValue" component={"span"}>
          {formatADAFull(data?.tx?.fee)} <ADAicon />
        </Box>
      )
    },
    {
      icon: CubeIconComponent,
      title: (
        <Box display={"flex"} alignItems="center">
          <TitleCard data-testid="transactionOverview.blockTitle" height={24} mr={1}>
            {t("glossary.block")}
          </TitleCard>
        </Box>
      ),
      value: (() => {
        const { blockName, tooltip } = formatNameBlockNo(data?.tx?.blockNo, data?.tx?.epochNo);
        return (
          <StyledLink data-testid="transactionOverview.blockValue" to={details.block(data?.tx?.blockNo || 0)}>
            <CustomTooltip title={tooltip}>
              <span>{blockName}</span>
            </CustomTooltip>
          </StyledLink>
        );
      })()
    },
    {
      icon: SlotIcon,
      title: (
        <Box data-testid="transactionOverview.slotTitle" display={"flex"} alignItems="center">
          <TitleCard mr={1}>{t("common.slot")}</TitleCard>
          <CustomTooltip
            title={
              <Box sx={{ textAlign: "left" }}>
                <p>Slot: {t("common.explainSlot")}</p>
                <p>Absolute slot: {t("common.absoluteSlot")}</p>
              </Box>
            }
          >
            <span>
              <TooltipIcon />
            </span>
          </CustomTooltip>
        </Box>
      ),
      value: (
        <Box data-testid="transactionOverview.slotValue">
          {data?.tx?.epochSlot ?? "—"}{" "}
          {data?.tx?.slotNo ? (
            <Box component="span" sx={{ color: "secondary.light", fontSize: "0.85em" }}>
              / {data.tx.slotNo}
            </Box>
          ) : null}
        </Box>
      )
    }
  ];

  return (
    <DetailHeader
      data-testid="transactionOverview.detailHeader"
      type="TRANSACTION"
      bookmarkData={data?.tx.hash || ""}
      title={t("glossary.transactionDetailTitle")}
      hash={data?.tx.hash}
      transactionStatus={data?.tx.status}
      epoch={
        data && {
          no: data.tx.epochNo,
          slot: epochNo === data.tx.epochNo ? data.tx.epochSlot : MAX_SLOT_EPOCH
        }
      }
      listItem={listOverview}
      loading={loading}
      lastUpdated={lastUpdated}
    />
  );
};

export default TransactionOverview;
