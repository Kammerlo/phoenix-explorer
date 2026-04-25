import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Box, Chip, Divider, Paper, Skeleton, Tooltip, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { HiArrowLongLeft } from "react-icons/hi2";
import { MdContentCopy } from "react-icons/md";
import { useTranslation } from "react-i18next";

import { formatADAFull, getShortHash } from "src/commons/utils/helper";
import ADAicon from "src/components/commons/ADAIcon";
import FormNowMessage from "src/components/commons/FormNowMessage";
import CustomTooltip from "src/components/commons/CustomTooltip";
import { details } from "src/commons/routers";
import TokenAutocomplete from "src/components/TokenAutocomplete";

import { ApiConnector } from "../../../commons/connector/ApiConnector";
import { AddressDetail, StakeAddressDetail } from "@shared/dtos/address.dto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateMiddle(str: string, start = 14, end = 8): string {
  if (!str || str.length <= start + end + 3) return str;
  return `${str.slice(0, start)}…${str.slice(-end)}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, tooltip }: { label: React.ReactNode; value: React.ReactNode; tooltip?: React.ReactNode }) {
  const theme = useTheme();
  const labelEl = (
    <Box
      sx={{
        fontSize: "0.72rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "secondary.light",
        mb: 0.5,
        ...(tooltip ? { cursor: "help", borderBottom: "1px dashed", borderColor: "secondary.light", display: "inline-block", lineHeight: 1.4 } : {})
      }}
    >
      {label}
    </Box>
  );
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
        flex: "1 1 140px",
        minWidth: 120
      }}
    >
      {tooltip ? (
        <Tooltip arrow placement="top" title={tooltip}>{labelEl}</Tooltip>
      ) : labelEl}
      <Box sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary", wordBreak: "break-word" }}>
        {value}
      </Box>
    </Paper>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function AddressHeaderSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 3, border: "1px solid", borderColor: "divider" }}
    >
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Skeleton variant="circular" width={48} height={48} />
        <Box flex={1}>
          <Skeleton variant="text" width="50%" height={28} />
          <Skeleton variant="text" width="30%" height={16} />
        </Box>
      </Box>
      <Box display="flex" gap={1.5} mt={2} flexWrap="wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={72} sx={{ flex: "1 1 140px", borderRadius: 2 }} />
        ))}
      </Box>
    </Paper>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  data: AddressDetail | null | undefined;
  loading: boolean;
}

const AddressHeader: React.FC<Props> = ({ data, loading }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const [dataStake, setDataStake] = useState<StakeAddressDetail>();

  const apiConnector = ApiConnector.getApiConnector();

  useEffect(() => {
    if (data?.stakeAddress) {
      apiConnector.getWalletStakeFromAddress(data.stakeAddress).then((res) => {
        setDataStake(res.data!);
      });
    }
  }, [data]);

  if (loading) return <AddressHeaderSkeleton />;
  if (!data) return null;

  const isContract = data.isContract;

  return (
    <>
      {/* Back button */}
      <Box
        display="inline-flex"
        alignItems="center"
        gap={0.75}
        mb={2.5}
        sx={{
          cursor: "pointer",
          color: "secondary.light",
          "&:hover": { color: "text.primary" },
          fontSize: "0.85rem"
        }}
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
            theme.isDark
              ? alpha(theme.palette.secondary.light, 0.1)
              : theme.palette.primary[200] || "#e8edf2"
          }`
        }}
      >
        {/* Header row */}
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            {/* Avatar */}
            <Box
              sx={{
                width: 48,
                height: 48,
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
              {isContract ? "SC" : (data.address?.slice(0, 2) ?? "??").toUpperCase()}
            </Box>

            <Box>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Box
                  component="h2"
                  sx={{
                    m: 0,
                    fontSize: { xs: "1rem", sm: "1.25rem" },
                    fontWeight: 800,
                    color: "text.primary",
                    lineHeight: 1.2
                  }}
                >
                  {isContract ? "Smart Contract" : "Address"}
                </Box>
                {isContract && (
                  <Chip
                    label="Contract"
                    size="small"
                    color="secondary"
                    sx={{ height: 20, fontWeight: 700, fontSize: "0.68rem" }}
                  />
                )}
              </Box>
              {/* Address */}
              <Box
                display="flex"
                alignItems="center"
                gap={0.75}
                sx={{ mt: 0.4, fontFamily: "monospace", fontSize: "0.78rem", color: "secondary.light" }}
              >
                <Box sx={{ wordBreak: "break-all" }}>
                  {truncateMiddle(data.address, 20, 10)}
                </Box>
                <CustomTooltip title="Copy address">
                  <Box
                    component="span"
                    onClick={() => copyToClipboard(data.address)}
                    sx={{
                      cursor: "pointer",
                      color: "secondary.light",
                      display: "inline-flex",
                      "&:hover": { color: "primary.main" }
                    }}
                  >
                    <MdContentCopy size={13} />
                  </Box>
                </CustomTooltip>
              </Box>
            </Box>
          </Box>

          <Box sx={{ fontSize: "0.78rem", color: "secondary.light" }}>
            <FormNowMessage time={Date.now()} />
          </Box>
        </Box>

        {/* Script hash */}
        {data.scriptHash && (
          <Box
            sx={{
              mb: 1.5,
              px: 2,
              py: 1,
              borderRadius: 2,
              bgcolor: theme.isDark
                ? alpha(theme.palette.secondary.light, 0.05)
                : alpha(theme.palette.secondary.light, 0.06),
              fontSize: "0.78rem"
            }}
          >
            <Box component="span" sx={{ fontWeight: 600, color: "secondary.light", mr: 1 }}>
              Script Hash:
            </Box>
            <Box component="span" sx={{ fontFamily: "monospace", color: "text.secondary", wordBreak: "break-all" }}>
              {data.scriptHash}
            </Box>
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Stats row */}
        <Box display="flex" flexWrap="wrap" gap={1.5} mb={2}>
          <StatCard
            label={t("glossary.adaBalance")}
            value={
              <Box display="flex" alignItems="center" gap={0.5}>
                {formatADAFull(data.balance)} <ADAicon />
              </Box>
            }
          />
          <StatCard
            label={t("drawer.transactions")}
            value={(data.txCount || 0).toLocaleString()}
          />
          <StatCard
            label="Native Tokens"
            value={(data.tokens?.length || 0).toLocaleString()}
          />
          {dataStake && (
            <StatCard
              label="Live Stake"
              tooltip="Current observable stake (controlled amount on the stake key, including rewards). Differs from the active-epoch snapshot used for rewards."
              value={
                <Box display="flex" alignItems="center" gap={0.5}>
                  {formatADAFull(dataStake.totalStake)} <ADAicon />
                </Box>
              }
            />
          )}
        </Box>

        {/* Stake address section */}
        {data.stakeAddress && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Box mb={1}>
              <Box
                sx={{
                  fontSize: "0.72rem",
                  color: "secondary.light",
                  fontWeight: 600,
                  mb: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}
              >
                Stake Address
              </Box>
              <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
                <Box
                  component={Link}
                  to={details.stake(data.stakeAddress)}
                  sx={{
                    fontFamily: "monospace",
                    fontSize: "0.78rem",
                    color: "primary.main",
                    textDecoration: "none",
                    wordBreak: "break-all",
                    "&:hover": { textDecoration: "underline" }
                  }}
                >
                  {truncateMiddle(data.stakeAddress, 20, 10)}
                </Box>
                <CustomTooltip title="Copy stake address">
                  <Box
                    component="span"
                    onClick={() => copyToClipboard(data.stakeAddress)}
                    sx={{
                      cursor: "pointer",
                      color: "secondary.light",
                      display: "inline-flex",
                      "&:hover": { color: "primary.main" }
                    }}
                  >
                    <MdContentCopy size={13} />
                  </Box>
                </CustomTooltip>
              </Box>
            </Box>

            {/* Pool delegation */}
            {dataStake?.pool?.poolId && (
              <Box display="flex" flexWrap="wrap" gap={3} mt={1.5}>
                <Box>
                  <Box
                    sx={{
                      fontSize: "0.7rem",
                      color: "secondary.light",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      mb: 0.3
                    }}
                  >
                    {t("glossary.poolName")}
                  </Box>
                  <Box
                    component={Link}
                    to={details.delegation(dataStake.pool.poolId)}
                    sx={{
                      fontSize: "0.85rem",
                      color: "primary.main",
                      textDecoration: "none",
                      fontWeight: 600,
                      "&:hover": { textDecoration: "underline" }
                    }}
                  >
                    {dataStake.pool.poolName || (
                      <CustomTooltip title={dataStake.pool.poolId}>
                        <span>{getShortHash(dataStake.pool.poolId)}</span>
                      </CustomTooltip>
                    )}
                    {dataStake.pool.tickerName && (
                      <Chip
                        label={dataStake.pool.tickerName}
                        size="small"
                        sx={{
                          ml: 1,
                          height: 18,
                          fontWeight: 700,
                          fontSize: "0.65rem",
                          bgcolor: alpha(theme.palette.primary.main, 0.12),
                          color: "primary.main"
                        }}
                      />
                    )}
                  </Box>
                </Box>
                {dataStake.rewardAvailable != null && (
                  <Box>
                    <Box
                      sx={{
                        fontSize: "0.7rem",
                        color: "secondary.light",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        mb: 0.3
                      }}
                    >
                      {t("glossary.rewardBalance")}
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5} sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      {formatADAFull(dataStake.rewardAvailable)} <ADAicon />
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </>
        )}

        {/* Token autocomplete */}
        {data.tokens && data.tokens.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <TokenAutocomplete address={data.address} />
          </>
        )}
      </Paper>
    </>
  );
};

export default AddressHeader;
