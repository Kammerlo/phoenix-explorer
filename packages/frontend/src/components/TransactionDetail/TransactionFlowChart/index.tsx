import React, { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Collapse, Tooltip, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";

import { details } from "src/commons/routers";
import { formatADAFull } from "src/commons/utils/helper";
import ADAicon from "src/components/commons/ADAIcon";
import CopyButton from "src/components/commons/CopyButton";
import { useBreakpoint } from "src/hooks/useBreakpoint";
import {
  MintingIcon,
  TransactionDelegationIcon,
  StakeCertificates,
  RewardsDistributionIcon,
  WithdrawalIcon,
  MetadataIconTx,
  ContractIcon,
  CollateralIcon,
  GitCommitIcon
} from "src/commons/resources";
import { TransactionDetail, Token, TRANSACTION_STATUS } from "@shared/dtos/transaction.dto";

import {
  FlowWrapper,
  FlowRow,
  SectionBox,
  ColumnHeader,
  CountBadge,
  Dot,
  UtxoCard,
  ContractTag,
  ChangeBadge,
  CardNumberBadge,
  CenterNode,
  StatusChip,
  FeeValue,
  TotalOutputBox,
  FeeCallout,
  BadgeChip,
  AddressLink,
  AmountText,
  TokenBadge,
  ShowMoreButton,
  MintSection,
  MintRow,
  MintAssetName,
  MintQuantity,
  CollateralSection,
  WithdrawalSection,
  WithdrawalRow,
  EmptyColumn
} from "./styles";

const MAX_VISIBLE = 5;
const MAX_VISIBLE_MOBILE = 3;

// ─── Helpers ─────────────────────────────────────────────

const truncate = (s: string, pre = 8, post = 6) =>
  s.length <= pre + post + 3 ? s : `${s.slice(0, pre)}...${s.slice(-post)}`;

/** Smooth cubic bezier from (x1,y1) to (x2,y2) with horizontal tangents */
function makeCurve(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

/** Collect contract addresses from data.contracts for highlighting */
function getContractAddresses(data: TransactionDetail): Set<string> {
  const set = new Set<string>();
  data.contracts?.forEach((c) => {
    if (c.address) set.add(c.address);
    if (c.stakeAddress) set.add(c.stakeAddress);
  });
  return set;
}

// ─── Hash Tooltip ─────────────────────────────────────────

const HashTooltip: React.FC<{ hash: string; label?: string; children: React.ReactElement }> = ({
  hash,
  label,
  children
}) => {
  const theme = useTheme();

  const content = (
    <Box sx={{ fontFamily: "monospace", fontSize: "0.7rem", wordBreak: "break-all", maxWidth: 380, lineHeight: 1.5 }}>
      {label && (
        <Box sx={{ fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5, opacity: 0.6 }}>
          {label}
        </Box>
      )}
      <Box display="flex" alignItems="flex-start" gap={0.75}>
        <Box sx={{ flex: 1 }}>{hash}</Box>
        <CopyButton text={hash} />
      </Box>
    </Box>
  );

  return (
    <Tooltip
      title={content}
      placement="top"
      arrow
      disableInteractive={false}
      leaveDelay={150}
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: theme.isDark ? "#1e1e2e" : "#fff",
            color: theme.palette.secondary.main,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.12)}`,
            p: 1.25,
            maxWidth: 420
          }
        },
        arrow: {
          sx: {
            color: theme.isDark ? "#1e1e2e" : "#fff",
            "&::before": { border: `1px solid ${theme.palette.divider}` }
          }
        }
      }}
    >
      {children}
    </Tooltip>
  );
};

// ─── SVG Connectors ───────────────────────────────────────

interface SvgPath {
  d: string;
  key: string;
}

const FlowConnectors: React.FC<{
  containerRef: React.RefObject<HTMLDivElement>;
  centerRef: React.RefObject<HTMLDivElement>;
  deps: unknown[];
}> = ({ containerRef, centerRef, deps }) => {
  const theme = useTheme();
  const [paths, setPaths] = useState<SvgPath[]>([]);
  const svgId = useRef(`fc-${Math.random().toString(36).slice(2)}`);

  const calculate = useCallback(() => {
    const container = containerRef.current;
    const center = centerRef.current;
    if (!container || !center) return;

    const cRect = container.getBoundingClientRect();
    const nRect = center.getBoundingClientRect();

    const centerLeft = nRect.left - cRect.left;
    const centerRight = nRect.right - cRect.left;
    const centerY = nRect.top + nRect.height / 2 - cRect.top;

    const next: SvgPath[] = [];

    container.querySelectorAll<HTMLElement>("[data-flow='input']").forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const x1 = r.right - cRect.left;
      const y1 = r.top + r.height / 2 - cRect.top;
      next.push({ d: makeCurve(x1, y1, centerLeft, centerY), key: `in-${i}` });
    });

    container.querySelectorAll<HTMLElement>("[data-flow='output']").forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const x2 = r.left - cRect.left;
      const y2 = r.top + r.height / 2 - cRect.top;
      next.push({ d: makeCurve(centerRight, centerY, x2, y2), key: `out-${i}` });
    });

    setPaths(next);
  }, [containerRef, centerRef]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    calculate();
    const ro = new ResizeObserver(calculate);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [calculate, ...deps]);

  const color = theme.palette.primary.light;
  const markerId = `${svgId.current}-arrow`;

  if (paths.length === 0) return null;

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 0
      }}
      aria-hidden="true"
    >
      <defs>
        <marker id={markerId} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <polygon points="0 0, 7 3.5, 0 7" fill={color} opacity={0.6} />
        </marker>
      </defs>
      {paths.map(({ d, key }) => (
        <path
          key={key}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="5 3"
          markerEnd={`url(#${markerId})`}
          opacity={0.6}
        />
      ))}
    </svg>
  );
};

// ─── UTXO Card ────────────────────────────────────────────

interface UtxoCardProps {
  address: string;
  value: number;
  tokens: Token[];
  side: "input" | "output" | "collateral";
  txHash?: string;
  index?: string;
  isContract?: boolean;
  cardNumber?: number;
  isChange?: boolean;
}

const UtxoCardItem: React.FC<UtxoCardProps> = ({
  address,
  value,
  tokens,
  side,
  txHash,
  index: utxoIndex,
  isContract,
  cardNumber,
  isChange
}) => {
  const { t } = useTranslation();
  const [showTokens, setShowTokens] = useState(false);

  const realTokens = tokens.filter(
    (tok) => tok.assetId !== "" && tok.assetId !== "lovelace" && tok.assetName !== "lovelace" && !!tok.policy?.policyId
  );

  return (
    <UtxoCard
      side={side}
      isContract={isContract ? 1 : 0}
      data-flow={side !== "collateral" ? side : undefined}
    >
      {/* address row: number + address + tags */}
      <Box display="flex" alignItems="center" gap={0.5} minWidth={0}>
        {cardNumber !== undefined && <CardNumberBadge>{cardNumber}</CardNumberBadge>}
        <HashTooltip hash={address} label="Address">
          <AddressLink flex={1} minWidth={0}>
            <Link to={details.address(address)}>{truncate(address)}</Link>
          </AddressLink>
        </HashTooltip>
        <CopyButton text={address} />
        {isContract && (
          <ContractTag>
            <ContractIcon fill="currentColor" />
            SC
          </ContractTag>
        )}
        {isChange && <ChangeBadge>{t("flow.change") || "Change"}</ChangeBadge>}
      </Box>

      {/* UTXO ref for inputs */}
      {side === "input" && txHash && (
        <HashTooltip hash={txHash} label="Source transaction">
          <Box
            fontSize="0.65rem"
            color="secondary.light"
            mt={0.25}
            sx={{ fontFamily: "var(--font-family-text), monospace", opacity: 0.7, display: "inline-block" }}
          >
            <Link
              to={details.transaction(txHash)}
              style={{ color: "inherit", textDecoration: "none" }}
              title="View source transaction"
            >
              {truncate(txHash, 6, 4)}#{utxoIndex}
            </Link>
          </Box>
        </HashTooltip>
      )}

      {/* ADA amount + token badge */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
        <AmountText side={side}>
          {side === "input" ? "-" : "+"}
          {formatADAFull(value)} <ADAicon />
        </AmountText>
        {realTokens.length > 0 && (
          <TokenBadge onClick={() => setShowTokens((p) => !p)}>
            +{realTokens.length} token{realTokens.length > 1 ? "s" : ""}
            {showTokens ? <IoChevronUp size={10} /> : <IoChevronDown size={10} />}
          </TokenBadge>
        )}
      </Box>

      <Collapse in={showTokens} timeout={150}>
        <Box mt={0.75} display="flex" flexDirection="column" gap={0.25}>
          {realTokens.map((tok, i) => (
            <Box
              key={`${tok.assetId}-${i}`}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              fontSize="0.68rem"
              sx={{ fontFamily: "var(--font-family-text), monospace" }}
            >
              <Box
                component={Link}
                to={details.token(tok.assetId)}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "55%",
                  color: "primary.main",
                  textDecoration: "none",
                  fontWeight: 600,
                  "&:hover": { textDecoration: "underline" }
                }}
              >
                {tok.metadata?.ticker || tok.assetName || truncate(tok.assetId, 6, 4)}
              </Box>
              <Box color="secondary.light" fontWeight={600}>
                {tok.assetQuantity >= 0 ? "+" : ""}
                {tok.assetQuantity.toLocaleString()}
              </Box>
            </Box>
          ))}
        </Box>
      </Collapse>
    </UtxoCard>
  );
};

// ─── Center Node ──────────────────────────────────────────

const TransactionCenterNodeComponent = forwardRef<HTMLDivElement, { data: TransactionDetail }>(
  ({ data }, ref) => {
    const { t } = useTranslation();
    const theme = useTheme();

    const badges: { icon: React.FC<React.SVGProps<SVGSVGElement>>; label: string; count: number }[] = [];

    if ((data.contracts?.length ?? 0) > 0)
      badges.push({ icon: ContractIcon, label: t("glossary.contracts"), count: data.contracts!.length });
    if ((data.delegations?.length ?? 0) > 0)
      badges.push({ icon: TransactionDelegationIcon, label: t("tab.delegations"), count: data.delegations!.length });
    if ((data.mints?.length ?? 0) > 0)
      badges.push({ icon: MintingIcon, label: t("tab.minting"), count: data.mints!.length });
    if ((data.stakeCertificates?.length ?? 0) > 0)
      badges.push({ icon: StakeCertificates, label: t("tab.stakeCertificates"), count: data.stakeCertificates!.length });
    if ((data.poolCertificates?.length ?? 0) > 0)
      badges.push({
        icon: RewardsDistributionIcon,
        label: t("tab.poolCertificates"),
        count: data.poolCertificates!.length
      });
    if ((data.withdrawals?.length ?? 0) > 0)
      badges.push({ icon: WithdrawalIcon, label: t("tab.withdrawal"), count: data.withdrawals!.length });
    if ((data.signersInformation?.length ?? 0) > 0)
      badges.push({
        icon: GitCommitIcon,
        label: t("tab.signersInformation"),
        count: data.signersInformation!.length
      });

    const hasCollaterals =
      (data.collaterals?.collateralInputResponses?.length ?? 0) > 0 ||
      (data.collaterals?.collateralOutputResponses?.length ?? 0) > 0;
    if (hasCollaterals) badges.push({ icon: CollateralIcon, label: t("glossary.collateral"), count: 1 });

    const hasMetadata = (data.metadata?.length ?? 0) > 0;

    const metadataTooltip = hasMetadata ? (
      <Box sx={{ maxWidth: 360, maxHeight: 280, overflow: "auto", fontSize: "0.72rem", fontFamily: "monospace" }}>
        {data.metadata!.map((m, i) => (
          <Box key={i} mb={i < data.metadata!.length - 1 ? 1 : 0}>
            <Box fontWeight={700} color="primary.light" mb={0.25}>
              Label {m.label}
            </Box>
            <Box sx={{ whiteSpace: "pre-wrap", wordBreak: "break-all", opacity: 0.85, maxHeight: 120, overflow: "auto" }}>
              {typeof m.value === "string"
                ? m.value.length > 500
                  ? m.value.slice(0, 500) + "..."
                  : m.value
                : JSON.stringify(m.value, null, 2)?.slice(0, 500)}
            </Box>
          </Box>
        ))}
      </Box>
    ) : null;

    const successColor = theme.isDark
      ? theme.palette.success[300] || theme.palette.success.light
      : theme.palette.success[700] || theme.palette.success.dark;

    return (
      <CenterNode ref={ref}>
        {/* Status chip */}
        <StatusChip txStatus={data.tx.status}>{data.tx.status}</StatusChip>

        {/* Total Output — most prominent element, green-tinted */}
        <TotalOutputBox>
          <Box
            sx={{
              fontSize: "0.6rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "success.main",
              mb: 0.4
            }}
          >
            {t("flow.totalOutput")}
          </Box>
          <Box
            display="flex"
            alignItems="center"
            gap={0.5}
            sx={{ fontSize: "0.9rem", fontWeight: 700, color: successColor }}
          >
            {formatADAFull(data.tx.totalOutput)} <ADAicon />
          </Box>
        </TotalOutputBox>

        {/* Fee — separate callout below total output */}
        <FeeCallout>
          <Box
            sx={{
              fontSize: "0.65rem",
              fontWeight: 600,
              color: "secondary.light",
              textTransform: "uppercase",
              letterSpacing: "0.06em"
            }}
          >
            {t("flow.fee")}
          </Box>
          <FeeValue sx={{ color: "error.main", fontSize: "0.82rem" }}>
            {formatADAFull(data.tx.fee)} <ADAicon />
          </FeeValue>
        </FeeCallout>

        {/* Badge chips for contracts, delegations, etc. */}
        {(badges.length > 0 || hasMetadata) && (
          <Box display="flex" flexWrap="wrap" gap={0.5} justifyContent="center">
            {badges.map(({ icon: Icon, label, count }) => (
              <BadgeChip key={label}>
                <Icon fill={theme.palette.secondary.light} />
                {count > 1 ? `${count} ` : ""}
                {label}
              </BadgeChip>
            ))}
            {hasMetadata && (
              <Tooltip
                title={metadataTooltip}
                arrow
                placement="bottom"
                disableInteractive={false}
                leaveDelay={150}
                slotProps={{
                  tooltip: {
                    sx: {
                      bgcolor: theme.isDark ? "#1e1e2e" : "#fff",
                      color: theme.palette.secondary.main,
                      border: `1px solid ${theme.palette.divider}`,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                      p: 1.5,
                      maxWidth: 400
                    }
                  },
                  arrow: {
                    sx: {
                      color: theme.isDark ? "#1e1e2e" : "#fff",
                      "&::before": { border: `1px solid ${theme.palette.divider}` }
                    }
                  }
                }}
              >
                <Box>
                  <BadgeChip sx={{ cursor: "pointer" }}>
                    <MetadataIconTx fill={theme.palette.secondary.light} />
                    {(data.metadata?.length ?? 0) > 1 ? `${data.metadata!.length} ` : ""}
                    {t("glossary.metadata")}
                  </BadgeChip>
                </Box>
              </Tooltip>
            )}
          </Box>
        )}
      </CenterNode>
    );
  }
);

TransactionCenterNodeComponent.displayName = "TransactionCenterNode";

// ─── UTXO Column ──────────────────────────────────────────

interface ColumnProps {
  items: { address: string; value: number; txHash: string; index: string; tokens: Token[]; stakeAddress?: string }[];
  side: "input" | "output";
  contractAddrs: Set<string>;
  maxVisible: number;
  inputAddresses?: Set<string>;
}

const UtxoColumn: React.FC<ColumnProps> = ({ items, side, contractAddrs, maxVisible, inputAddresses }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? items : items.slice(0, maxVisible);
  const isInput = side === "input";

  const isChangeOutput = (address: string) =>
    !isInput && !!inputAddresses && inputAddresses.has(address);

  if (items.length === 0) {
    return (
      <SectionBox>
        <ColumnHeader sx={{ mb: 1.25 }}>
          <Dot color={isInput ? theme.palette.error.main : theme.palette.success.main} />
          {isInput ? t("flow.inputs") : t("flow.outputs")}
          <CountBadge>0</CountBadge>
        </ColumnHeader>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <EmptyColumn>{isInput ? "No inputs" : "No outputs"}</EmptyColumn>
        </Box>
      </SectionBox>
    );
  }

  return (
    <SectionBox>
      <ColumnHeader sx={{ mb: 1.25 }}>
        <Dot color={isInput ? theme.palette.error.main : theme.palette.success.main} />
        {isInput ? t("flow.inputs") : t("flow.outputs")}
        <CountBadge>{items.length}</CountBadge>
      </ColumnHeader>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {visible.map((item, i) => (
          <UtxoCardItem
            key={`${item.txHash}-${item.index}-${i}`}
            cardNumber={i + 1}
            address={item.address}
            value={item.value}
            tokens={item.tokens}
            side={side}
            txHash={isInput ? item.txHash : undefined}
            index={item.index}
            isContract={
              contractAddrs.has(item.address) ||
              (item.stakeAddress ? contractAddrs.has(item.stakeAddress) : false)
            }
            isChange={isChangeOutput(item.address)}
          />
        ))}

        {items.length > maxVisible && (
          <ShowMoreButton>
            <Button size="small" onClick={() => setExpanded((p) => !p)}>
              {expanded ? t("flow.showLess") : t("flow.showAll", { count: items.length })}
            </Button>
          </ShowMoreButton>
        )}
      </Box>
    </SectionBox>
  );
};

// ─── Minting / Withdrawals / Collaterals ──────────────────

const MintingSection: React.FC<{ data: TransactionDetail }> = ({ data }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const mints = data.mints;
  if (!mints || mints.length === 0) return null;
  const maxShow = 5;
  const visible = expanded ? mints : mints.slice(0, maxShow);
  return (
    <MintSection>
      <ColumnHeader sx={{ mb: 0.75 }}>
        <MintingIcon fill="currentColor" style={{ width: 14, height: 14 }} />
        {t("tab.minting")} ({mints.length})
      </ColumnHeader>
      {visible.map((m, i) => (
        <MintRow key={`${m.assetId}-${i}`}>
          <MintAssetName
            component={Link}
            to={details.token(m.assetId)}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
          >
            {m.metadata?.ticker || m.assetName || truncate(m.assetId, 8, 4)}
          </MintAssetName>
          <MintQuantity positive={m.assetQuantity >= 0 ? 1 : 0}>
            {m.assetQuantity >= 0 ? "+" : ""}
            {m.assetQuantity.toLocaleString()}
          </MintQuantity>
        </MintRow>
      ))}
      {mints.length > maxShow && (
        <ShowMoreButton>
          <Button size="small" onClick={() => setExpanded((p) => !p)}>
            {expanded ? t("flow.showLess") : t("flow.showAll", { count: mints.length })}
          </Button>
        </ShowMoreButton>
      )}
    </MintSection>
  );
};

const WithdrawalsSection: React.FC<{ data: TransactionDetail }> = ({ data }) => {
  const { t } = useTranslation();
  const withdrawals = data.withdrawals;
  if (!withdrawals || withdrawals.length === 0) return null;
  return (
    <WithdrawalSection>
      <ColumnHeader sx={{ mb: 0.75 }}>
        <WithdrawalIcon fill="currentColor" style={{ width: 14, height: 14 }} />
        {t("tab.withdrawal")} ({withdrawals.length})
      </ColumnHeader>
      {withdrawals.map((w, i) => (
        <WithdrawalRow key={`wd-${i}`}>
          <AddressLink sx={{ maxWidth: "55%", fontSize: "0.72rem" }}>
            <Link to={details.address(w.stakeAddressFrom)}>{truncate(w.stakeAddressFrom, 10, 6)}</Link>
          </AddressLink>
          <FeeValue sx={{ fontSize: "0.78rem" }}>
            {formatADAFull(w.amount)} <ADAicon />
          </FeeValue>
        </WithdrawalRow>
      ))}
    </WithdrawalSection>
  );
};

const CollateralsSection: React.FC<{ data: TransactionDetail }> = ({ data }) => {
  const { t } = useTranslation();
  const { isTablet } = useBreakpoint();
  const [open, setOpen] = useState(false);
  const colIn = data.collaterals?.collateralInputResponses ?? [];
  const colOut = data.collaterals?.collateralOutputResponses ?? [];
  if (colIn.length === 0 && colOut.length === 0) return null;
  return (
    <CollateralSection>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ cursor: "pointer" }}
        onClick={() => setOpen((p) => !p)}
      >
        <ColumnHeader sx={{ mb: 0 }}>
          <CollateralIcon fill="currentColor" style={{ width: 14, height: 14 }} />
          {t("flow.collaterals")} ({colIn.length + colOut.length})
        </ColumnHeader>
        {open ? <IoChevronUp size={14} /> : <IoChevronDown size={14} />}
      </Box>
      <Collapse in={open} timeout={150}>
        <Box
          display={isTablet ? "block" : "grid"}
          gridTemplateColumns={isTablet ? undefined : "1fr 1fr"}
          gap={2}
          mt={1.5}
        >
          {colIn.length > 0 && (
            <Box>
              <Box
                fontSize="0.65rem"
                fontWeight={700}
                color="secondary.light"
                mb={0.5}
                textTransform="uppercase"
                letterSpacing="0.06em"
              >
                {t("drawer.input")}
              </Box>
              {colIn.map((c, i) => (
                <UtxoCardItem
                  key={`cin-${i}`}
                  address={c.address}
                  value={c.value}
                  tokens={c.tokens}
                  side="collateral"
                  txHash={c.txHash}
                  index={c.index}
                />
              ))}
            </Box>
          )}
          {colOut.length > 0 && (
            <Box>
              <Box
                fontSize="0.65rem"
                fontWeight={700}
                color="secondary.light"
                mb={0.5}
                textTransform="uppercase"
                letterSpacing="0.06em"
              >
                {t("drawer.output")}
              </Box>
              {colOut.map((c, i) => (
                <UtxoCardItem
                  key={`cout-${i}`}
                  address={c.address}
                  value={c.value}
                  tokens={c.tokens}
                  side="collateral"
                />
              ))}
            </Box>
          )}
        </Box>
      </Collapse>
    </CollateralSection>
  );
};

// ─── Main Flow Chart ──────────────────────────────────────

interface Props {
  data: TransactionDetail | null | undefined;
}

const TransactionFlowChart: React.FC<Props> = ({ data }) => {
  const { isTablet } = useBreakpoint();
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  const contractAddrs = useMemo(() => (data ? getContractAddresses(data) : new Set<string>()), [data]);

  // Build the set of input addresses to detect change outputs
  const inputAddresses = useMemo(
    () => new Set((data?.utxOs?.inputs ?? []).map((i) => i.address)),
    [data]
  );

  if (!data) return null;

  const inputs = data.utxOs?.inputs ?? [];
  const outputs = data.utxOs?.outputs ?? [];
  const maxVisible = isTablet ? MAX_VISIBLE_MOBILE : MAX_VISIBLE;
  const isFailed = data.tx.status === TRANSACTION_STATUS.FAILED;

  return (
    <FlowWrapper failed={isFailed ? 1 : 0}>
      {/* ── Main flow row ── */}
      <FlowRow ref={containerRef}>
        {/* SVG connectors — only on desktop */}
        {!isTablet && (
          <FlowConnectors
            containerRef={containerRef}
            centerRef={centerRef}
            deps={[inputs.length, outputs.length]}
          />
        )}

        <UtxoColumn
          items={inputs}
          side="input"
          contractAddrs={contractAddrs}
          maxVisible={maxVisible}
        />

        <Box display="flex" alignItems="center" justifyContent="center" sx={{ zIndex: 1 }}>
          <TransactionCenterNodeComponent ref={centerRef} data={data} />
        </Box>

        <UtxoColumn
          items={outputs}
          side="output"
          contractAddrs={contractAddrs}
          maxVisible={maxVisible}
          inputAddresses={inputAddresses}
        />
      </FlowRow>

      {/* ── Additional sections ── */}
      <MintingSection data={data} />
      <WithdrawalsSection data={data} />
      <CollateralsSection data={data} />
    </FlowWrapper>
  );
};

export default TransactionFlowChart;
