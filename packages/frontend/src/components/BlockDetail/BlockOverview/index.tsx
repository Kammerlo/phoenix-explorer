import React from "react";
import { Box, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { Link } from "react-router-dom";

import {
  TimeIconComponent,
  SlotIcon,
  BlockProducerIcon,
  TooltipIcon,
  ExchageIcon,
  ExchageAltIcon,
  OutputIcon
} from "src/commons/resources";
import { formatADAFull, formatNameBlockNo } from "src/commons/utils/helper";
import { MAX_SLOT_EPOCH } from "src/commons/utils/constants";
import ADAicon from "src/components/commons/ADAIcon";
import DetailHeader, { DetailHeaderType } from "src/components/commons/DetailHeader";
import CustomTooltip from "src/components/commons/CustomTooltip";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import { BlockFillBarFull } from "src/components/commons/BlockFillBar";
import { details } from "src/commons/routers";

import { TitleCard } from "./styles";
import { StyledLink } from "src/components/share/styled";
import { Block } from "@shared/dtos/block.dto";

interface BlockOverviewProps {
  data: Block | null | undefined;
  loading: boolean;
  lastUpdated?: number;
}

// ─── Stat card used in the visual section ────────────────

const StatCard: React.FC<{
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}> = ({ icon: Icon, label, value, sub }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e0e0e0"}`,
        background: theme.palette.secondary[0],
        display: "flex",
        flexDirection: "column",
        gap: 0.5
      }}
    >
      <Box display="flex" alignItems="center" gap={0.75} sx={{ mb: 0.5 }}>
        <Icon
          fill={theme.palette.secondary.light}
          style={{ width: 14, height: 14, flexShrink: 0 }}
        />
        <Box sx={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "secondary.light" }}>
          {label}
        </Box>
      </Box>
      <Box sx={{ fontSize: "1.1rem", fontWeight: 700, color: "secondary.main", lineHeight: 1.2 }}>
        {value}
      </Box>
      {sub && (
        <Box sx={{ fontSize: "0.7rem", color: "secondary.light", mt: 0.25 }}>
          {sub}
        </Box>
      )}
    </Box>
  );
};

// ─── Fill card ────────────────────────────────────────────

const FillCard: React.FC<{ size?: number }> = ({ size }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e0e0e0"}`,
        background: theme.palette.secondary[0]
      }}
    >
      <BlockFillBarFull size={size} />
    </Box>
  );
};

// ─── Navigation row ───────────────────────────────────────

const BlockNav: React.FC<{ prev?: string; next?: string; blockNo: number }> = ({ prev, next, blockNo }) => {
  const theme = useTheme();

  const navBtn = (to: string, icon: React.ReactNode, label: string) => (
    <Box
      component={Link}
      to={to}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.5,
        py: 0.6,
        borderRadius: 1.5,
        border: `1px solid ${theme.isDark ? alpha(theme.palette.secondary.light, 0.15) : theme.palette.primary[200] || "#e0e0e0"}`,
        fontSize: "0.78rem",
        fontWeight: 600,
        color: theme.palette.primary.main,
        textDecoration: "none",
        transition: "all 0.15s",
        "&:hover": {
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          borderColor: theme.palette.primary.main
        }
      }}
    >
      {icon}
      {label}
    </Box>
  );

  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" mt={2}>
      <Box>
        {prev
          ? navBtn(details.block(prev), <IoChevronBack size={14} />, "Previous block")
          : <Box sx={{ fontSize: "0.78rem", color: "secondary.light", opacity: 0.5 }}>Genesis block</Box>
        }
      </Box>
      <Box
        sx={{
          fontSize: "0.78rem",
          color: "secondary.light",
          fontFamily: "monospace",
          fontWeight: 600
        }}
      >
        Block #{blockNo.toLocaleString()}
      </Box>
      <Box>
        {next
          ? navBtn(details.block(next), <IoChevronForward size={14} />, "Next block")
          : <Box sx={{ fontSize: "0.78rem", color: "secondary.light", opacity: 0.5 }}>Latest block</Box>
        }
      </Box>
    </Box>
  );
};

// small helper to avoid hooks-in-non-component issue
const t_ = (s: string) => s;

// ─── Main component ───────────────────────────────────────

const BlockOverview: React.FC<BlockOverviewProps> = ({ data, loading, lastUpdated }) => {
  const { t } = useTranslation();
  const { currentEpoch } = useSelector(({ system }: RootState) => system);

  const slotTooltip = (
    <Box sx={{ textAlign: "left" }}>
      <p>Slot: {t("common.explainSlot")}</p>
      <p>Absolute slot: {t("common.absoluteSlot")}</p>
    </Box>
  );

  // Lean 3-tile header
  const listOverview = [
    {
      icon: TimeIconComponent,
      title: (
        <Box display="flex" alignItems="center">
          <TitleCard mr={1} data-testid="block.detail.overview.title.createAt">
            {t("createdAt")}
          </TitleCard>
        </Box>
      ),
      value: (
        <DatetimeTypeTooltip>
          <Box data-testid="block.detail.overview.value.createAt">{data?.time || ""}</Box>
        </DatetimeTypeTooltip>
      )
    },
    {
      icon: SlotIcon,
      title: (
        <Box display="flex" alignItems="center">
          <TitleCard mr={1} data-testid="block.detail.overview.title.slot">
            {t("common.slot")}
          </TitleCard>
          <CustomTooltip title={slotTooltip}>
            <span><TooltipIcon /></span>
          </CustomTooltip>
        </Box>
      ),
      value: (
        <Box data-testid="block.detail.overview.value.slot">
          {data?.epochSlotNo ?? "—"}
          {data?.slotNo ? (
            <Box component="span" sx={{ color: "secondary.light", fontSize: "0.85em" }}>
              {" "}/ {data.slotNo}
            </Box>
          ) : null}
        </Box>
      )
    },
    {
      icon: BlockProducerIcon,
      title: (
        <Box display="flex" alignItems="center">
          <TitleCard mr={1} data-testid="block.detail.overview.title.producer">
            {t("glossary.blockproducer")}
          </TitleCard>
        </Box>
      ),
      value: data?.slotLeader ? (
        <Box data-testid="block.detail.overview.value.producer">
          <StyledLink to={details.delegation(data.slotLeader)}>
            {data.poolTicker
              ? `[${data.poolTicker}]`
              : data.poolName || `${data.slotLeader.slice(0, 10)}...`}
          </StyledLink>
        </Box>
      ) : (
        <Box sx={{ color: "secondary.light" }}>—</Box>
      )
    }
  ];

  return (
    <Box mb={3}>
      {/* ── Lean header: hash + epoch + 3 tiles ── */}
      <DetailHeader
        loading={loading}
        listItem={listOverview}
        type={DetailHeaderType.BLOCK}
        hash={data?.hash}
        bookmarkData={`${data?.blockNo || data?.hash}`}
        title={<Box data-testid="block.detail.header">{t("head.page.blockDetails")}</Box>}
        lastUpdated={lastUpdated}
        epoch={
          data && {
            no: data.epochNo,
            slot: currentEpoch?.no === data.epochNo ? data.epochSlotNo : MAX_SLOT_EPOCH
          }
        }
      />

      {/* ── Visual stats panel ── */}
      {!loading && data && (
        <Box
          display="grid"
          gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr", md: "2fr 1fr 1fr 1fr" }}
          gap={1.5}
          mt={1.5}
        >
          {/* Fill — spans wider on desktop */}
          <FillCard size={data.size} />

          <StatCard
            icon={ExchageIcon}
            label={data.txCount !== 1 ? t("glossary.transactions") : t("glossary.transaction")}
            value={
              <Box display="flex" alignItems="baseline" gap={0.5}>
                <span>{data.txCount.toLocaleString()}</span>
                {data.txCount > 0 && (
                  <Box component="span" sx={{ fontSize: "0.72rem", fontWeight: 500, color: "secondary.light" }}>
                    txs
                  </Box>
                )}
              </Box>
            }
          />

          <StatCard
            icon={ExchageAltIcon}
            label={t("glossary.transactionfees")}
            value={
              <Box display="flex" alignItems="center" gap={0.25} sx={{ flexWrap: "wrap" }}>
                {formatADAFull(data.totalFees)} <ADAicon />
              </Box>
            }
          />

          <StatCard
            icon={OutputIcon}
            label={t("glossary.totalOutputInAda")}
            value={
              <Box display="flex" alignItems="center" gap={0.25} sx={{ flexWrap: "wrap" }}>
                {formatADAFull(data.totalOutput)} <ADAicon />
              </Box>
            }
          />
        </Box>
      )}

      {/* ── Block navigation ── */}
      {!loading && data && (
        <BlockNav
          prev={data.previousBlock}
          next={data.nextBlock}
          blockNo={data.blockNo}
        />
      )}
    </Box>
  );
};

export default BlockOverview;
