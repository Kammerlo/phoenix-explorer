import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Box, Chip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import {
  TimeIconComponent,
  TotalOutput,
  ExchageAltIcon,
  TooltipIcon,
  ActionTypeIcon
} from "src/commons/resources";
import { formatADAFull, formatDateTimeLocal, formatNameBlockNo } from "src/commons/utils/helper";
import { MAX_SLOT_EPOCH } from "src/commons/utils/constants";
import { details } from "src/commons/routers";
import { RootState } from "src/stores/types";
import DetailHeader from "src/components/commons/DetailHeader";
import CustomTooltip from "src/components/commons/CustomTooltip";
import ADAicon from "src/components/commons/ADAIcon";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";

import { StyledLink, TitleCard } from "./styles";
import { TransactionDetail, TxTag } from "@shared/dtos/transaction.dto";

// ─── Tag config ────────────────────────────────────────────────────────────────

const TAG_META: Record<TxTag, { label: string; color: string }> = {
  transfer:   { label: "Transfer",   color: "#3B82F6" },
  token:      { label: "Token",      color: "#8B5CF6" },
  mint:       { label: "Mint",       color: "#F59E0B" },
  stake:      { label: "Stake",      color: "#06B6D4" },
  pool:       { label: "Pool",       color: "#6366F1" },
  script:     { label: "Script",     color: "#F97316" },
  governance: { label: "Governance", color: "#A855F7" },
};

const TAG_ORDER: TxTag[] = ["transfer", "script", "token", "mint", "stake", "pool", "governance"];

function deriveTagsFromDetail(data: TransactionDetail | null | undefined): TxTag[] {
  if (!data) return [];

  // Prefer pre-computed tags from the gateway (same logic as the list view)
  if (data.tx.tags?.length) return TAG_ORDER.filter((t) => data.tx.tags!.includes(t));

  // Fallback: derive from populated arrays (for connectors that don't compute tags)
  const tags: TxTag[] = [];
  if ((data.contracts?.length ?? 0) > 0) tags.push("script");
  if ((data.mints?.length ?? 0) > 0 || (data.utxOs?.outputs?.some((o) => (o.tokens?.length ?? 0) > 0) ?? false)) tags.push("token");
  if ((data.mints?.length ?? 0) > 0) tags.push("mint");
  if ((data.delegations?.length ?? 0) > 0 || (data.withdrawals?.length ?? 0) > 0 || (data.stakeCertificates?.length ?? 0) > 0 || (data.instantaneousRewards?.length ?? 0) > 0) tags.push("stake");
  if ((data.poolCertificates?.length ?? 0) > 0) tags.push("pool");
  if (tags.length === 0) tags.push("transfer");

  return TAG_ORDER.filter((t) => tags.includes(t));
}

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

  const txTags = useMemo(() => deriveTagsFromDetail(data), [data]);

  const listOverview = [
    {
      icon: ActionTypeIcon,
      title: (
        <Box display="flex" alignItems="center">
          <TitleCard mr={1}>Type</TitleCard>
        </Box>
      ),
      value: (
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {txTags.map((tag) => {
            const meta = TAG_META[tag];
            return (
              <Chip
                key={tag}
                label={meta.label}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  bgcolor: alpha(meta.color, 0.12),
                  color: meta.color,
                  border: `1px solid ${alpha(meta.color, 0.3)}`,
                  "& .MuiChip-label": { px: 0.9 }
                }}
              />
            );
          })}
        </Box>
      )
    },
    {
      icon: TimeIconComponent,
      title: (
        <Box data-testid="transactionOverview.createdAtTitle" display={"flex"} alignItems="center">
          <TitleCard mr={1}>{t("createdAt")}</TitleCard>
        </Box>
      ),
      value: (
        <DatetimeTypeTooltip data-testid="transactionOverview.createdAtValue">{formatDateTimeLocal(String(data?.tx?.time ?? ""))}</DatetimeTypeTooltip>
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
            <Box
              component="span"
              sx={{ display: "inline-flex", alignItems: "center", cursor: "help", lineHeight: 1 }}
            >
              <TooltipIcon style={{ pointerEvents: "none" }} />
            </Box>
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
