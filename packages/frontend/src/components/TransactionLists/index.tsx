import React, { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Chip, Skeleton, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { formatADAFull, getShortHash } from "src/commons/utils/helper";
import { details } from "src/commons/routers";
import usePageInfo from "src/commons/hooks/usePageInfo";

import CustomTooltip from "../commons/CustomTooltip";
import ADAicon from "../commons/ADAIcon";
import FormNowMessage from "../commons/FormNowMessage";
import Table, { Column } from "../commons/Table";
import DatetimeTypeTooltip from "../commons/DatetimeTypeTooltip";
import { Actions, StyledLink, TimeDuration } from "./styles";
import { ApiReturnType } from "@shared/APIReturnType";
import { Transaction, TxTag } from "@shared/dtos/transaction.dto";
import NotAvailable from "../commons/NotAvailable";

// ─── Tag config ───────────────────────────────────────────

interface TagMeta {
  label: string;
  color: string;
  description: string;
}

const TAG_META: Record<TxTag, TagMeta> = {
  transfer:   { label: "Transfer",   color: "#3B82F6", description: "Standard ADA transfer between addresses" },
  token:      { label: "Token",      color: "#8B5CF6", description: "Involves native tokens (CIP-25 / CIP-68)" },
  mint:       { label: "Mint",       color: "#F59E0B", description: "Assets are minted or burned" },
  stake:      { label: "Stake",      color: "#06B6D4", description: "Delegation, stake registration, or reward withdrawal" },
  pool:       { label: "Pool",       color: "#6366F1", description: "Stake pool registration or retirement" },
  script:     { label: "Script",     color: "#F97316", description: "Plutus smart contract execution" },
  governance: { label: "Governance", color: "#A855F7", description: "On-chain governance action or vote" },
};

const TAG_ORDER: TxTag[] = ["transfer", "script", "token", "mint", "stake", "pool", "governance"];

// ─── Tag chip ─────────────────────────────────────────────

const TxTagChip: React.FC<{ tag: TxTag }> = ({ tag }) => {
  const meta = TAG_META[tag];
  if (!meta) return null;
  return (
    <CustomTooltip title={meta.description}>
      <Chip
        label={meta.label}
        size="small"
        sx={{
          height: 18,
          fontSize: "0.62rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
          cursor: "default",
          bgcolor: alpha(meta.color, 0.12),
          color: meta.color,
          border: `1px solid ${alpha(meta.color, 0.3)}`,
          "& .MuiChip-label": { px: 0.8 }
        }}
      />
    </CustomTooltip>
  );
};

// ─── Column header tooltip listing all tags ───────────────

const TAG_COLUMN_TOOLTIP = (
  <Box sx={{ fontSize: "0.75rem", lineHeight: 1.8 }}>
    <Box sx={{ fontWeight: 700, mb: 0.5 }}>Transaction types</Box>
    {TAG_ORDER.map((tag) => (
      <Box key={tag} display="flex" gap={0.75} alignItems="baseline">
        <Box
          component="span"
          sx={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: TAG_META[tag].color,
            flexShrink: 0,
            mt: "2px"
          }}
        />
        <Box component="span">
          <Box component="span" sx={{ fontWeight: 700, color: TAG_META[tag].color }}>
            {TAG_META[tag].label}
          </Box>
          {" — "}
          {TAG_META[tag].description}
        </Box>
      </Box>
    ))}
  </Box>
);

// ─── Skeleton loading ─────────────────────────────────────

const SKELETON_COUNT = 12;

const SkeletonRows: React.FC = () => {
  const theme = useTheme();
  return (
    <Box>
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: 2,
            py: 1.5,
            borderBottom: `1px solid ${theme.isDark ? alpha(theme.palette.secondary.light, 0.08) : theme.palette.primary[200] || "#f0f0f0"}`
          }}
        >
          <Box sx={{ flex: 2, minWidth: 0 }}>
            <Skeleton variant="text" width="52%" height={16} />
            <Skeleton variant="text" width="32%" height={12} sx={{ mt: 0.4 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="55%" height={16} />
          </Box>
          {/* Tags skeleton: 1–2 pill shapes */}
          <Box display="flex" gap={0.5} sx={{ flex: 1.2 }}>
            <Skeleton variant="rounded" width={52} height={18} sx={{ borderRadius: "9px" }} />
            <Skeleton variant="rounded" width={40} height={18} sx={{ borderRadius: "9px" }} />
          </Box>
          <Box sx={{ flex: 1.3, minWidth: 0 }}>
            <Skeleton variant="text" width="70%" height={16} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="55%" height={16} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// ─── Component ────────────────────────────────────────────

interface TransactionListProps {
  underline?: boolean;
  showTabView?: boolean;
  transactions: ApiReturnType<Transaction[]>;
  updateData?: (page: number) => void;
  loading: boolean;
  paginated?: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  loading,
  updateData,
  paginated = false
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pageInfo } = usePageInfo();

  const onClickRow = (e: MouseEvent<Element, globalThis.MouseEvent>, r: Transaction) => {
    if (e.target instanceof HTMLAnchorElement || (e.target instanceof Element && e.target.closest("a"))) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    navigate(details.transaction(r.hash));
  };

  const columns: Column<Transaction>[] = [
    {
      title: (
        <Box sx={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {t("glossary.txhash")}
        </Box>
      ),
      key: "hash",
      minWidth: 140,
      render: (r, index) => (
        <Box>
          <CustomTooltip title={r.hash}>
            <StyledLink
              data-testid={`transaction.table.value.txhash#${index}`}
              to={details.transaction(r.hash)}
              style={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.85rem" }}
            >
              {getShortHash(r.hash)}
            </StyledLink>
          </CustomTooltip>
          <Box sx={{ fontSize: "0.72rem", color: "secondary.light", mt: 0.3 }}>
            <DatetimeTypeTooltip>{r.time}</DatetimeTypeTooltip>
          </Box>
        </Box>
      )
    },
    {
      title: (
        <Box sx={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {t("glossary.block")}
        </Box>
      ),
      key: "block",
      minWidth: 80,
      render: (r) => (
        <Box>
          <StyledLink
            to={details.block(r.blockNo || r.blockHash)}
            style={{ fontWeight: 700, fontSize: "0.85rem" }}
          >
            {r.blockNo?.toLocaleString()}
          </StyledLink>
          <Box sx={{ fontSize: "0.72rem", color: "secondary.light", mt: 0.3 }}>
            <StyledLink to={details.epoch(r.epochNo)} style={{ color: "inherit" }}>
              Epoch {r.epochNo}
            </StyledLink>
          </Box>
        </Box>
      )
    },
    {
      title: (
        <CustomTooltip title={TAG_COLUMN_TOOLTIP} disableInteractive={false} leaveDelay={200}>
          <Box
            sx={{
              fontSize: "0.78rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "help",
              borderBottom: "1px dashed",
              borderColor: "secondary.light",
              display: "inline-block",
              lineHeight: 1.4
            }}
          >
            Type
          </Box>
        </CustomTooltip>
      ),
      key: "tags",
      minWidth: 100,
      render: (r) => {
        // Fallback: tags may be absent when backend hasn't been restarted yet
        const tags: TxTag[] = r.tags?.length ? r.tags : ["transfer"];
        const ordered = TAG_ORDER.filter((t) => tags.includes(t));
        return (
          <Box display="flex" flexWrap="wrap" gap={0.4}>
            {ordered.map((tag) => (
              <TxTagChip key={tag} tag={tag} />
            ))}
          </Box>
        );
      }
    },
    {
      title: (
        <Box sx={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {t("glossary.totalOutputInAda")}
        </Box>
      ),
      key: "totalOutput",
      minWidth: 120,
      render: (r) => (
        <Box display="inline-flex" alignItems="center" gap={0.35} sx={{ fontWeight: 700, fontSize: "0.88rem" }}>
          <span>{formatADAFull(r.totalOutput)}</span>
          <ADAicon />
        </Box>
      )
    },
    {
      title: (
        <Box sx={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {t("common.fees")}
        </Box>
      ),
      key: "fee",
      minWidth: 100,
      render: (r) => (
        <Box
          display="inline-flex"
          alignItems="center"
          gap={0.35}
          sx={{ fontSize: "0.82rem", color: "secondary.light", fontWeight: 500 }}
        >
          <span>{formatADAFull(r.fee)}</span>
          <ADAicon />
        </Box>
      )
    }
  ];

  if (transactions?.error) return <NotAvailable />;

  return (
    <>
      {!transactions?.error && (
        <Actions>
          <TimeDuration>
            <FormNowMessage time={transactions?.lastUpdated || 0} />
          </TimeDuration>
        </Actions>
      )}

      {loading ? (
        <SkeletonRows />
      ) : (
        <Table
          data={transactions?.data || []}
          columns={columns}
          onClickRow={onClickRow}
          rowKey="hash"
          total={paginated ? { title: t("common.totalTransactions"), count: transactions?.total || 0 } : undefined}
          tableWrapperProps={{
            sx: (theme) => ({
              minHeight: "60vh",
              [theme.breakpoints.down("md")]: { minHeight: "50vh" },
              [theme.breakpoints.down("sm")]: { minHeight: "40vh" }
            })
          }}
          pagination={
            paginated && updateData
              ? {
                  ...pageInfo,
                  total: transactions?.total || 0,
                  page: transactions?.currentPage || 0,
                  size: transactions?.pageSize || pageInfo.size,
                  onChange: (page) => updateData(page),
                  hideLastPage: true
                }
              : undefined
          }
        />
      )}
    </>
  );
};

export default TransactionList;
