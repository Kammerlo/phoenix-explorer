import { Box, Chip, Grid, Tooltip, useTheme } from "@mui/material";
import { HiArrowLongLeft } from "react-icons/hi2";
import { MdOpenInNew } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import DynamicEllipsisText from "src/components/DynamicEllipsisText";
import { TruncateSubTitleContainer } from "src/components/share/styled";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import { formatDateTimeLocal } from "src/commons/utils/helper";

import VoteChart from "./VoteChart";
import GovernanceActionTabs from "./GovernanceActionTabs";
import {
  BackButton,
  BackText,
  HeaderDetailContainer,
  HeaderTitle,
  SlotLeader,
  SlotLeaderValue,
  StyledCard,
  TitleContainer,
  HeaderInfoSection,
  DateSection,
  StatusChip,
} from "./styles";
import { GovernanceActionDetail } from "@shared/dtos/GovernanceOverview";

const ACTION_TYPE_LABELS: Record<string, string> = {
  parameter_change: "Protocol Parameter Change",
  hard_fork_initiation: "Hard Fork Initiation",
  treasury_withdrawals: "Treasury Withdrawal",
  no_confidence: "No Confidence",
  new_committee: "Update Committee",
  update_committee: "Update Committee",
  new_constitution: "New Constitution",
  info_action: "Info",
  info: "Info",
};

function formatActionType(type?: string): string {
  if (!type) return "Unknown";
  return ACTION_TYPE_LABELS[type.toLowerCase()] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  data: GovernanceActionDetail | null;
}

export default function OverviewHeader({ data }: Props) {
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useTranslation();

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active": return "success";
      case "expired": return "error";
      case "enacted": return "info";
      default: return "warning";
    }
  };

  const statusLabel = data?.status
    ? data.status.charAt(0) + data.status.slice(1).toLowerCase()
    : "";

  const epochLabel = (() => {
    if (data?.enactedEpoch != null) return `Enacted at Epoch ${data.enactedEpoch}`;
    if (data?.expiredEpoch != null) return `Expired at Epoch ${data.expiredEpoch}`;
    return "";
  })();

  return (
    <Box sx={{ mb: 4 }}>
      {/* Back + meta row */}
      <HeaderDetailContainer>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <BackButton onClick={() => navigate(-1)}>
            <HiArrowLongLeft color={theme.palette.secondary.light} />
            <BackText>{t("common.back")}</BackText>
          </BackButton>

          {/* Action type badge */}
          <Box sx={{ mb: 1 }}>
            <Chip
              label={formatActionType(data?.actionType)}
              size="small"
              variant="outlined"
              sx={{
                fontWeight: 600,
                fontSize: "12px",
                color: theme.palette.primary.main,
                borderColor: theme.palette.primary.main,
              }}
            />
          </Box>

          <TitleContainer>
            <HeaderTitle>{data?.title || "Governance Action"}</HeaderTitle>
          </TitleContainer>

          {/* Action ID */}
          {data?.txHash && (
            <SlotLeader>
              <Box sx={{ color: theme.palette.secondary.light, whiteSpace: "nowrap", pt: "2px", fontSize: "14px" }}>
                Action ID:
              </Box>
              <SlotLeaderValue>
                <TruncateSubTitleContainer>
                  <DynamicEllipsisText value={`${data.txHash}#${data.index}`} isCopy />
                </TruncateSubTitleContainer>
              </SlotLeaderValue>
            </SlotLeader>
          )}

          {/* Anchor URL */}
          {data?.anchorUrl && (
            <SlotLeader>
              <Box sx={{ color: theme.palette.secondary.light, whiteSpace: "nowrap", pt: "2px", fontSize: "14px" }}>
                Anchor URL:
              </Box>
              <SlotLeaderValue>
                <Box
                  component="a"
                  href={data.anchorUrl.startsWith("http") ? data.anchorUrl : `//${data.anchorUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    color: theme.palette.primary.main,
                    wordBreak: "break-all",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {data.anchorUrl}
                  <MdOpenInNew size={14} />
                </Box>
              </SlotLeaderValue>
            </SlotLeader>
          )}

          {/* Deposit return address */}
          {data?.depositReturn && (
            <SlotLeader>
              <Box sx={{ color: theme.palette.secondary.light, whiteSpace: "nowrap", pt: "2px", fontSize: "14px" }}>
                Deposit Return:
              </Box>
              <SlotLeaderValue>
                <TruncateSubTitleContainer>
                  <DynamicEllipsisText value={data.depositReturn} isCopy />
                </TruncateSubTitleContainer>
              </SlotLeaderValue>
            </SlotLeader>
          )}
        </Box>

        {/* Right: date + status */}
        <HeaderInfoSection>
          {data?.dateCreated && (
            <DateSection>
              <DatetimeTypeTooltip>{formatDateTimeLocal(String(data.dateCreated))}</DatetimeTypeTooltip>
            </DateSection>
          )}
          <Tooltip title={epochLabel} arrow placement="left">
            <StatusChip
              label={statusLabel}
              color={getStatusColor(data?.status || "")}
              variant="outlined"
            />
          </Tooltip>
          {epochLabel && (
            <Box sx={{ fontSize: "12px", color: theme.palette.secondary.light, textAlign: "right" }}>
              {epochLabel}
            </Box>
          )}
        </HeaderInfoSection>
      </HeaderDetailContainer>

      {/* Two-column content: tabs + vote chart */}
      <Grid spacing={3} container sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <StyledCard.Container>
            <GovernanceActionTabs data={data} actionsType={formatActionType(data?.actionType)} />
          </StyledCard.Container>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <StyledCard.Container>
            <VoteChart voteData={data?.votesStats} />
          </StyledCard.Container>
        </Grid>
      </Grid>
    </Box>
  );
}
