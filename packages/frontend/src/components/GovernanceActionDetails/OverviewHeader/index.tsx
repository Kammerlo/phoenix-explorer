import { Box, Grid, useTheme, Chip, Tooltip } from "@mui/material";
import { HiArrowLongLeft } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ActionIcon, DateIcon, FeedbackIcon } from "src/commons/resources";
import CustomIcon from "src/components/commons/CustomIcon";
import DynamicEllipsisText from "src/components/DynamicEllipsisText";
import { TruncateSubTitleContainer } from "src/components/share/styled";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import { formatDateTimeLocal } from "src/commons/utils/helper";
import { actionTypeListDrep } from "src/components/commons/CardGovernanceVotes";

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
  FixedSizeContainer
} from "./styles";
import { GovernanceActionDetail } from "@shared/dtos/GovernanceOverview";

interface Props {
  data: GovernanceActionDetail | null;
}

export default function OverviewHeader({ data }: Props) {
  const navigate = useNavigate();
  const theme = useTheme();
  const actionsType = actionTypeListDrep.find((el) => el.value === data?.actionType)?.text;
  const { t } = useTranslation();
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'expired':
        return 'error';
      case 'enacted':
        return 'info';
      default:
        return 'warning';
    }
  };

  const getEpochText = () => {
    if (data?.status !== "ACTIVE") {
      return `Epoch ${data?.expiredEpoch ?? data?.enactedEpoch}`;
    }
    return '';
  };

  return (
    <Box sx={{ marginBottom: "20px" }}>
      <Box width="100%" marginBottom={"48px"}>
        <HeaderDetailContainer>
          <Box sx={{ flex: 1 }}>
            <BackButton onClick={() => navigate(-1)}>
              <HiArrowLongLeft color={theme.palette.secondary.light} />
              <BackText>{t("common.back")}</BackText>
            </BackButton>

            <TitleContainer>
              <HeaderTitle>{data?.title}</HeaderTitle>
            </TitleContainer>
            {data?.txHash && (
              <SlotLeader>
                <Box sx={{ paddingTop: "1.5px", color: theme.palette.secondary.light, whiteSpace: "nowrap" }}>
                  {`${t("pool.actionId")}:`}
                </Box>
                <SlotLeaderValue>
                  <TruncateSubTitleContainer>
                    <DynamicEllipsisText value={`${data?.txHash}#${data.index}`} isCopy />
                  </TruncateSubTitleContainer>
                </SlotLeaderValue>
              </SlotLeader>
            )}
            {data?.anchorUrl && (
              <SlotLeader>
                <Box sx={{ paddingTop: "1.5px", color: theme.palette.secondary.light, whiteSpace: "nowrap" }}>
                  {"Anchor URL:"}
                </Box>
                <SlotLeaderValue>
                  <Box
                    component="a"
                    href={data.anchorUrl.includes("http") ? data.anchorUrl : `//${data.anchorUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    sx={{ color: theme.palette.primary.main, wordBreak: "break-all" }}
                  >
                    {data.anchorUrl}
                  </Box>
                </SlotLeaderValue>
              </SlotLeader>
            )}
            {data?.expiredEpoch != null && (
              <SlotLeader>
                <Box sx={{ paddingTop: "1.5px", color: theme.palette.secondary.light, whiteSpace: "nowrap" }}>
                  {"Expired Epoch:"}
                </Box>
                <SlotLeaderValue>{data.expiredEpoch}</SlotLeaderValue>
              </SlotLeader>
            )}
            {data?.enactedEpoch != null && (
              <SlotLeader>
                <Box sx={{ paddingTop: "1.5px", color: theme.palette.secondary.light, whiteSpace: "nowrap" }}>
                  {"Enacted Epoch:"}
                </Box>
                <SlotLeaderValue>{data.enactedEpoch}</SlotLeaderValue>
              </SlotLeader>
            )}
          </Box>

          <HeaderInfoSection>
            <DateSection>
              <CustomIcon
                icon={DateIcon as React.FunctionComponent<React.SVGAttributes<SVGElement>>}
                fill={theme.mode === "dark" ? theme.palette.primary.main : theme.palette.secondary.light}
                height={18}
                width={18}
              />
              <DatetimeTypeTooltip>{formatDateTimeLocal(data?.dateCreated ?? "")}</DatetimeTypeTooltip>
            </DateSection>
            
            <Tooltip title={getEpochText()} arrow placement="left">
              <StatusChip
                label={t(`glossary.${data?.status?.toLowerCase()}`) || data?.status}
                color={getStatusColor(data?.status || '')}
                variant="outlined"
              />
            </Tooltip>
          </HeaderInfoSection>
        </HeaderDetailContainer>
      </Box>
      <Grid spacing={3} container>
        <Grid size={{ sm: 12, md: 12, lg: 6 }}>
          <FixedSizeContainer>
            <StyledCard.Container sx={{ height: '100%' }}>
              <GovernanceActionTabs data={data} actionsType={actionsType} />
            </StyledCard.Container>
          </FixedSizeContainer>
        </Grid>
        <Grid size={{ sm: 12, md: 12, lg: 6 }}>
          <FixedSizeContainer>
            <StyledCard.Container sx={{ height: '100%' }}>
              <VoteChart voteData={data?.votesStats} />
            </StyledCard.Container>
          </FixedSizeContainer>
        </Grid>
      </Grid>
    </Box>
  );
}
