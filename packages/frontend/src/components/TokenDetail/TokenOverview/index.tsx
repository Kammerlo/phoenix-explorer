import React, { useState } from "react";
import { Box, Chip, Divider, Paper, Skeleton, Tooltip, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate, Link } from "react-router-dom";
import { HiArrowLongLeft } from "react-icons/hi2";
import { IoGlobeOutline } from "react-icons/io5";
import { MdContentCopy } from "react-icons/md";
import { useTranslation } from "react-i18next";
import BigNumber from "bignumber.js";

import { formatNumberTotalSupply, formatDateTimeLocal } from "src/commons/utils/helper";
import FormNowMessage from "src/components/commons/FormNowMessage";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import CopyButton from "src/components/commons/CopyButton";
import { details } from "src/commons/routers";
import { ITokenOverview } from "@shared/dtos/token.dto";
import ScriptModal from "../../ScriptModal";

BigNumber.config({ DECIMAL_PLACES: 40 });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateMiddle(str: string, start = 14, end = 8): string {
  if (!str || str.length <= start + end + 3) return str;
  return `${str.slice(0, start)}…${str.slice(-end)}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.75,
        borderRadius: 2,
        border: `1px solid ${
          theme.isDark
            ? alpha(theme.palette.secondary.light, 0.1)
            : theme.palette.primary[200] || "#e8edf2"
        }`,
        flex: "1 1 120px",
        minWidth: 110
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", mb: 0.5 }}
      >
        {label}
      </Typography>
      <Box sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary", wordBreak: "break-word" }}>
        {value}
      </Box>
    </Paper>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TokenOverviewSkeleton() {
  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 3, border: "1px solid", borderColor: "divider" }}>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Skeleton variant="circular" width={52} height={52} />
        <Box flex={1}>
          <Skeleton variant="text" width="35%" height={28} />
          <Skeleton variant="text" width="20%" height={18} />
        </Box>
      </Box>
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="50%" />
      <Box display="flex" gap={2} mt={2} flexWrap="wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={72} sx={{ flex: "1 1 120px", borderRadius: 2 }} />
        ))}
      </Box>
    </Paper>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TokenOverViewProps {
  data: ITokenOverview | null;
  loading: boolean;
  lastUpdated: number;
}

const TokenOverview: React.FC<TokenOverViewProps> = ({ data, loading, lastUpdated }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);
  const [logoError, setLogoError] = useState(false);

  if (loading) return <TokenOverviewSkeleton />;
  if (!data) return null;

  const decimals = data.metadata?.decimals || 0;
  const supplyFormatted = formatNumberTotalSupply(data.supply, decimals);

  return (
    <>
      {/* Back button */}
      <Box
        display="flex"
        alignItems="center"
        gap={0.75}
        mb={2.5}
        sx={{ cursor: "pointer", color: "secondary.light", "&:hover": { color: "text.primary" }, fontSize: "0.85rem", width: "fit-content" }}
        onClick={() => navigate(-1)}
      >
        <HiArrowLongLeft size={18} />
        Back
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          mb: 3,
          border: `1px solid ${
            theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e8edf2"
          }`
        }}
      >
        {/* Header row */}
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            {/* Logo */}
            {data.metadata?.logo && !logoError ? (
              <Box
                component="img"
                src={data.metadata.logo}
                onError={() => setLogoError(true)}
                alt=""
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `1px solid ${theme.palette.primary[200] || "#e8edf2"}`,
                  flexShrink: 0
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "primary.main",
                  flexShrink: 0
                }}
              >
                {(data.metadata?.ticker || data.displayName || "?").slice(0, 2).toUpperCase()}
              </Box>
            )}

            <Box>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="h5" fontWeight={800} color="text.primary" lineHeight={1.2}>
                  {data.displayName || data.name || "Unknown Token"}
                </Typography>
                {data.metadata?.ticker && (
                  <Chip
                    label={data.metadata.ticker}
                    size="small"
                    sx={{
                      height: 20,
                      fontWeight: 700,
                      fontSize: "0.68rem",
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: "primary.main",
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                    }}
                  />
                )}
                {data.tokenType && data.tokenType !== "unknown" && (
                  <Chip
                    label={data.tokenType}
                    size="small"
                    color={data.tokenType === "NFT" ? "secondary" : "default"}
                    sx={{ height: 20, fontWeight: 700, fontSize: "0.68rem" }}
                  />
                )}
              </Box>
              {/* Hex name / fingerprint */}
              <Box sx={{ fontSize: "0.72rem", color: "secondary.light", mt: 0.4, fontFamily: "monospace" }}>
                {data.fingerprint || data.name}
              </Box>
            </Box>
          </Box>

          <Box sx={{ fontSize: "0.78rem", color: "secondary.light" }}>
            <FormNowMessage time={lastUpdated} />
          </Box>
        </Box>

        {/* Description + URL */}
        {data.metadata?.description && (
          <Box
            sx={{
              mb: 1.5,
              px: 2,
              py: 1.25,
              borderRadius: 2,
              bgcolor: theme.isDark
                ? alpha(theme.palette.secondary.light, 0.05)
                : alpha(theme.palette.secondary.light, 0.06),
              fontSize: "0.82rem",
              color: "text.secondary",
              lineHeight: 1.6
            }}
          >
            {data.metadata.description}
          </Box>
        )}
        {data.metadata?.url && (
          <Box display="flex" alignItems="center" gap={1} mb={1.5}>
            <IoGlobeOutline size={14} color={theme.palette.secondary.light as string} />
            <Box
              component="a"
              href={data.metadata.url}
              target="_blank"
              rel="noreferrer"
              sx={{ fontSize: "0.82rem", color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
            >
              {data.metadata.url}
            </Box>
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Stats row */}
        <Box display="flex" flexWrap="wrap" gap={1.5} mb={2}>
          <StatCard label={t("common.totalSupply")} value={supplyFormatted} />
          {data.numberOfHolders != null && (
            <StatCard label="Holders" value={data.numberOfHolders.toLocaleString()} />
          )}
          {data.txCount != null && (
            <StatCard label="Transactions" value={data.txCount.toLocaleString()} />
          )}
          {data.mintOrBurnCount != null && (
            <StatCard label="Mint / Burn Ops" value={data.mintOrBurnCount.toLocaleString()} />
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Policy ID */}
        <Box mb={1}>
          <Box sx={{ fontSize: "0.72rem", color: "secondary.light", fontWeight: 600, mb: 0.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Policy ID
          </Box>
          <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
            <Box sx={{ fontFamily: "monospace", fontSize: "0.78rem", color: "text.primary", wordBreak: "break-all" }}>
              {truncateMiddle(data.policy || "", 20, 10)}
            </Box>
            <Tooltip title="Copy policy ID">
              <Box
                component="span"
                onClick={() => copyToClipboard(data.policy || "")}
                sx={{ cursor: "pointer", color: "secondary.light", display: "inline-flex", "&:hover": { color: "primary.main" } }}
              >
                <MdContentCopy size={13} />
              </Box>
            </Tooltip>
            {data.policy && (
              <Box
                component={Link}
                to={details.policyDetail(data.policy)}
                sx={{ fontSize: "0.75rem", color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
              >
                View Policy
              </Box>
            )}
            <Box
              component="span"
              onClick={() => setOpenModal(true)}
              sx={{ fontSize: "0.75rem", color: "secondary.light", cursor: "pointer", textDecoration: "underline", "&:hover": { color: "text.primary" } }}
            >
              Policy Script
            </Box>
          </Box>
        </Box>

        {/* Timestamps */}
        <Box display="flex" flexWrap="wrap" gap={3} mt={1.5}>
          {data.createdOn && (
            <Box>
              <Box sx={{ fontSize: "0.7rem", color: "secondary.light", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.3 }}>
                Created
              </Box>
              <DatetimeTypeTooltip>
                <Box sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                  {formatDateTimeLocal(data.createdOn)}
                </Box>
              </DatetimeTypeTooltip>
            </Box>
          )}
          {data.tokenLastActivity && (
            <Box>
              <Box sx={{ fontSize: "0.7rem", color: "secondary.light", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.3 }}>
                Last Activity
              </Box>
              <DatetimeTypeTooltip>
                <Box sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                  {formatDateTimeLocal(data.tokenLastActivity)}
                </Box>
              </DatetimeTypeTooltip>
            </Box>
          )}
        </Box>
      </Paper>

      <ScriptModal open={openModal} onClose={() => setOpenModal(false)} policy={data.policy || ""} />
    </>
  );
};

export default TokenOverview;
