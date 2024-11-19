/// <reference types="vite-plugin-svgr/client" />
import { useEffect, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { Box, useTheme } from "@mui/material";
import { HiArrowLongLeft } from "react-icons/hi2";
import { t } from "i18next";

import DetailHeader from "src/components/commons/DetailHeader";
import {
  DescriptonDrepIcon,
  CreateDrepIcon,
  ActiveVoteIcon,
  LiveStakeDrepIcon,
  DelegatorsDrepIcon,
  CCDetailVotingParticipation
} from "src/commons/resources";
import { DelegationCertificatesHistory } from "src/components/DelegationDetail/DelegationDetailList";
import { formatADA, formatADAFull, formatDateTimeLocal, formatPercent, getShortHash } from "src/commons/utils/helper";
import {
  BackButton,
  BackText,
  HeaderDetailContainer
} from "src/components/DelegationDetail/DelegationDetailInfo/styles";
import { CommonSkeleton } from "src/components/commons/CustomSkeleton";
import { TruncateSubTitleContainer } from "src/components/share/styled";
import DynamicEllipsisText from "src/components/DynamicEllipsisText";
import { useScreen } from "src/commons/hooks/useScreen";
import { ActionMetadataModalConfirm } from "src/components/GovernanceVotes";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import NoRecord from "src/components/commons/NoRecord";

import { StyledContainer, TitleCard, ValueCard } from "./styles";
import { ApiConnector } from "../../commons/connector/ApiConnector";
import { ApiReturnType } from "../../commons/connector/types/APIReturnType";

export const voteOption = [
  { title: "Action Type", value: "Default" },
  { title: "All", value: "ALL" },
  { title: "Motion of No-Confidence", value: "NO_CONFIDENCE" },
  { title: "Constitutional Committee Updates", value: "UPDATE_COMMITTEE" },
  { title: "Update to the Constitution", value: "NEW_CONSTITUTION" },
  { title: "Hard-Fork Initiation", value: "HARD_FORK_INITIATION_ACTION" },
  { title: "Protocol Parameter Changes", value: "PARAMETER_CHANGE_ACTION" },
  { title: "Treasury Withdrawals", value: "TREASURY_WITHDRAWALS_ACTION" },
  { title: "Info", value: "INFO_ACTION" }
];

const DrepDetail = () => {
  const { drepId } = useParams<{ drepId: string }>();
  const theme = useTheme();
  const history = useHistory();
  const { width, isMobile } = useScreen();
  const tableRef = useRef<HTMLDivElement>(null);
  const [typeVote, setTypeVote] = useState("Default");
  const [openModal, setOpenModal] = useState(false);
  const [fetchData, setFetchData] = useState<ApiReturnType<DrepOverview>>();
  const [loading, setLoading] = useState(true);

  const apiConnector: ApiConnector = ApiConnector.getApiConnector();

  useEffect(() => {
    apiConnector.getDrepOverview(drepId).then((data) => {
      setFetchData(data);
      setLoading(false);
    });
  }, []);

  const scrollEffect = () => {
    tableRef !== null &&
      tableRef.current &&
      tableRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  };

  const listOverview = [
    {
      icon: DescriptonDrepIcon,
      sizeIcon: 26,
      title: (
        <TitleCard display={"flex"} alignItems="center">
          {t("drep.des")}
        </TitleCard>
      ),
      value: (
        <ValueCard>
          <Box>
            <DynamicEllipsisText
              value={getShortHash(fetchData?.data?.anchorHash || "")}
              sxFirstPart={{ maxWidth: width > 600 ? "calc(100% - 60px)" : "calc(100% - 70px)" }}
              postfix={5}
              isNoLimitPixel={true}
              isTooltip={(fetchData?.data?.anchorHash && !!fetchData?.data?.anchorHash.length) || undefined}
            />
          </Box>
          {fetchData?.data?.anchorUrl && (
            <Box
              position={"relative"}
              component={"span"}
              onClick={() => setOpenModal(true)}
              color={`${theme.palette.primary.main} !important`}
            >
              <DynamicEllipsisText
                value={getShortHash(fetchData?.data?.anchorUrl || "")}
                sxFirstPart={{
                  maxWidth: "calc(100% - 60px)",
                  minWidth: 16
                }}
                customTruncateFold={[4, 4]}
                postfix={5}
                sxLastPart={{ direction: "inherit" }}
                sx={{ cursor: "pointer" }}
                isTooltip
                whiteSpace="normal"
              />
            </Box>
          )}
          <ActionMetadataModalConfirm
            open={openModal}
            onClose={() => setOpenModal(false)}
            anchorUrl={
              fetchData?.data?.anchorUrl
                ? fetchData?.data?.anchorUrl.includes("http")
                  ? fetchData?.data?.anchorUrl
                  : `//${fetchData?.data?.anchorUrl}`
                : ""
            }
          />
        </ValueCard>
      )
    },
    {
      icon: CreateDrepIcon,
      sizeIcon: 26,
      title: (
        <TitleCard display={"flex"} alignItems="center">
          {t("createdAt")}
        </TitleCard>
      ),
      value: (
        <DatetimeTypeTooltip>
          <ValueCard>{formatDateTimeLocal(fetchData?.data?.createdAt || "")}</ValueCard>
        </DatetimeTypeTooltip>
      )
    },
    {
      icon: ActiveVoteIcon,
      sizeIcon: 26,
      title: (
        <TitleCard display={"flex"} alignItems="center">
          {t("drep.activeVoteStake")}
        </TitleCard>
      ),
      value: (
        <ValueCard>
          {fetchData?.data?.activeVoteStake !== null
            ? `${formatADAFull(fetchData?.data?.activeVoteStake || 0)} ADA`
            : t("common.N/A")}{" "}
        </ValueCard>
      )
    },
    {
      icon: LiveStakeDrepIcon,
      sizeIcon: 26,
      title: (
        <TitleCard display={"flex"} alignItems="center">
          {t("drep.liveStake")}
        </TitleCard>
      ),
      value: (
        <ValueCard>
          {fetchData?.data?.liveStake !== null ? `${formatADA(fetchData?.data?.liveStake || 0)} ADA` : t("common.N/A")}{" "}
        </ValueCard>
      )
    },
    {
      icon: DelegatorsDrepIcon,
      sizeIcon: 26,
      title: (
        <TitleCard display={"flex"} alignItems="center">
          {t("glossary.delegators")}
        </TitleCard>
      ),
      value: <ValueCard>{fetchData?.data?.delegators} </ValueCard>
    },
    {
      icon: CCDetailVotingParticipation,
      sizeIcon: 26,
      title: (
        <TitleCard display={"flex"} alignItems="center">
          {t("drep.votingParticipation")}
        </TitleCard>
      ),
      value: (
        <ValueCard>
          {fetchData?.data?.votingParticipation !== null
            ? `${formatPercent(fetchData?.data?.votingParticipation)}`
            : t("common.N/A")}
        </ValueCard>
      )
    }
  ];
  if (fetchData?.error) return <NoRecord />;

  if (loading) {
    return (
      <StyledContainer>
        <HeaderDetailContainer>
          <BackButton onClick={history.goBack}>
            <HiArrowLongLeft color={theme.palette.secondary.light} />
            <BackText>{t("common.back")}</BackText>
          </BackButton>
          <Box borderRadius={4} overflow="hidden">
            <CommonSkeleton variant="rectangular" height={80} width="100%" />
          </Box>
          <Box mt={2} borderRadius={4} overflow="hidden">
            <CommonSkeleton variant="rectangular" height={250} width="100%" />
          </Box>
          <Box mt={4} borderRadius={4} overflow="hidden">
            <CommonSkeleton variant="rectangular" height={250} width="100%" />
          </Box>
        </HeaderDetailContainer>
      </StyledContainer>
    );
  }
  return (
    <StyledContainer>
      <DetailHeader
        type="DREP"
        title={
          <TruncateSubTitleContainer mr={isMobile ? 2 : 0}>
            <DynamicEllipsisText
              value={fetchData?.data?.drepId || ""}
              sxFirstPart={{ maxWidth: width > 600 ? "calc(100% - 130px)" : "calc(100% - 70px)" }}
              postfix={5}
              isNoLimitPixel={true}
              isTooltip
            />
          </TruncateSubTitleContainer>
        }
        loading={false}
        listItem={listOverview}
        subTitle={`Type: ${fetchData?.data?.type || ""}`}
        stakeKeyStatus={fetchData?.data?.status}
      />
      <DelegationCertificatesHistory
        loading={loading}
        initialized={true}
        data={fetchData?.data?.certHistory!}
        total={fetchData?.data?.certHistory!.length!}
        error={fetchData?.error!}
        statusError={0}
        scrollEffect={scrollEffect}
      />
      {/*<DrepAccordion />*/}
    </StyledContainer>
  );
};

export default DrepDetail;
