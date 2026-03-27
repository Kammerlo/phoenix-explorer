import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  useTheme,
  Tabs,
  Tab,
  LinearProgress,
  alpha
} from "@mui/material";
import { HiArrowLongLeft } from "react-icons/hi2";
import { t } from "i18next";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

import DetailHeader, { DetailHeaderType } from "src/components/commons/DetailHeader";
import {
  DescriptonDrepIcon,
  CreateDrepIcon,
  ActiveStakeDrepIcon,
  DelegatorsDrepIcon,
  LifetimeVoteDrepIcon,
  VotingPowerIcon,
  GovernanceIcon,
  DrepIdIcon,
  VotesYesIcon,
  VotesAbstainIcon,
  VotesNoIcon
} from "src/commons/resources";
import { ActionMetadataModalConfirm } from "src/components/GovernanceVotes";
import { formatADA, formatDateTimeLocal, formatPercent, numberWithCommas } from "src/commons/utils/helper";
import {
  BackButton,
  BackText,
  HeaderDetailContainer
} from "src/components/DelegationDetail/DelegationDetailInfo/styles";
import { CommonSkeleton } from "src/components/commons/CustomSkeleton";
import { TruncateSubTitleContainer } from "src/components/share/styled";
import DynamicEllipsisText from "src/components/DynamicEllipsisText";
import { useScreen } from "src/commons/hooks/useScreen";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import Table, { Column } from "src/components/commons/Table";
import ADAicon from "src/components/commons/ADAIcon";

import { StyledContainer, TitleCard, ValueCard } from "./styles";
import { ApiConnector } from "src/commons/connector/ApiConnector";
import PluginSlotRenderer from "src/plugins/PluginSlotRenderer";
import { ApiReturnType } from "@shared/APIReturnType";
import { Drep, DrepDelegates } from "@shared/dtos/drep.dto";
import { GovernanceActionListItem } from "@shared/dtos/GovernanceOverview";

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
  const navigate = useNavigate();
  const { width, isMobile } = useScreen();

  const [openModal, setOpenModal] = useState(false);
  const [data, setData] = useState<ApiReturnType<Drep>>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const apiConnector = ApiConnector.getApiConnector();
  const network = process.env.REACT_APP_NETWORK || "mainnet";

  useEffect(() => {
    document.title = `DRep Detail | Cardano Blockchain Explorer`;
    apiConnector
      .getDrep(drepId)
      .then((result) => setData(result))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [drepId]);

  const listOverview = getDrepOverviewCards(data, theme, openModal, setOpenModal);

  if (loading) {
    return (
      <StyledContainer>
        <HeaderDetailContainer>
          <BackButton onClick={() => navigate(-1)}>
            <HiArrowLongLeft color={theme.palette.secondary.light} />
            <BackText>{t("common.back")}</BackText>
          </BackButton>
          <Box borderRadius={4} overflow="hidden">
            <CommonSkeleton variant="rectangular" height={80} width="100%" />
          </Box>
          <Box mt={2} borderRadius={4} overflow="hidden">
            <CommonSkeleton variant="rectangular" height={280} width="100%" />
          </Box>
          <Box mt={3} borderRadius={4} overflow="hidden">
            <CommonSkeleton variant="rectangular" height={350} width="100%" />
          </Box>
        </HeaderDetailContainer>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer>
      <DetailHeader
        type={DetailHeaderType.DREP}
        title={
          <TruncateSubTitleContainer mr={isMobile ? 2 : 0}>
            <DynamicEllipsisText
              value={data?.data.givenName || data?.data.drepId || ""}
              sxFirstPart={{ maxWidth: width > 600 ? "calc(100% - 130px)" : "calc(100% - 70px)" }}
              postfix={5}
              isNoLimitPixel={true}
              isTooltip
            />
          </TruncateSubTitleContainer>
        }
        loading={false}
        listItem={listOverview}
        stakeKeyStatus={data?.data.status}
      />

      {/* Vote Distribution Section */}
      <Box mt={3} p={3} bgcolor={theme.palette.background.paper} borderRadius={2}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <LifetimeVoteDrepIcon style={{ width: 22, height: 22 }} />
            <TitleCard display="flex" alignItems="center">
              {t("drep.lifetimeVotes")}
            </TitleCard>
          </Box>
          {data?.data.votes?.total > 0 && (
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="secondary.light">
                Total Votes:
              </Typography>
              <Typography variant="body2" fontWeight={700} color="secondary.main">
                {data.data.votes.total.toLocaleString()}
              </Typography>
            </Box>
          )}
        </Box>
        <DrepVoteChart votes={data?.data.votes} />
      </Box>

      {/* Drep Details Tabs */}
      <DrepDetailsTabs drepId={drepId} />

      <PluginSlotRenderer slot="drep-detail" context={{ data: data?.data, network, apiConnector }} />
    </StyledContainer>
  );
};

export default DrepDetail;

// ─── Overview cards ──────────────────────────────────────────────────────────

const getDrepOverviewCards = (
  data: ApiReturnType<Drep> | null,
  theme: any,
  openModal: boolean,
  setOpenModal: (open: boolean) => void
) => [
  {
    icon: DrepIdIcon,
    sizeIcon: 26,
    title: <TitleCard display="flex" alignItems="center">DRep ID</TitleCard>,
    value: (
      <ValueCard>
        <DynamicEllipsisText
          value={data?.data.drepId || ""}
          sxFirstPart={{ maxWidth: "160px" }}
          postfix={8}
          isNoLimitPixel={true}
          isCopy={true}
          isTooltip={true}
        />
      </ValueCard>
    )
  },
  {
    icon: DescriptonDrepIcon,
    sizeIcon: 26,
    title: <TitleCard display="flex" alignItems="center">{t("drep.Anchor")}</TitleCard>,
    value: (
      <ValueCard>
        <Box sx={{ maxWidth: 200, wordBreak: "break-all", whiteSpace: "normal" }}>
          <DynamicEllipsisText
            value={`Hash: ${data?.data.anchorHash || ""}`}
            sxFirstPart={{ maxWidth: "100%" }}
            postfix={10}
            isNoLimitPixel={true}
            isCopy={true}
            isTooltip={!!data?.data.anchorHash?.length}
          />
        </Box>
        {data?.data.anchorUrl && (
          <Box
            position="relative"
            component="span"
            onClick={() => setOpenModal(true)}
            color={`${theme.palette.primary.main} !important`}
          >
            <DynamicEllipsisText
              value={data?.data.anchorUrl || ""}
              sxFirstPart={{ maxWidth: "calc(100% - 60px)", minWidth: 16 }}
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
            data?.data.anchorUrl
              ? data?.data.anchorUrl.includes("http")
                ? data?.data.anchorUrl
                : `//${data.data.anchorUrl}`
              : ""
          }
        />
      </ValueCard>
    )
  },
  {
    icon: CreateDrepIcon,
    sizeIcon: 26,
    title: <TitleCard display="flex" alignItems="center">{t("createdAt")}</TitleCard>,
    value: (
      <DatetimeTypeTooltip>
        <ValueCard>{formatDateTimeLocal(data?.data.createdAt || "")}</ValueCard>
      </DatetimeTypeTooltip>
    )
  },
  {
    icon: ActiveStakeDrepIcon,
    sizeIcon: 26,
    title: <TitleCard display="flex" alignItems="center">{t("drep.activeVoteStake")}</TitleCard>,
    value: (
      <ValueCard>
        {data?.data.activeVoteStake != null
          ? `${formatADA(data?.data.activeVoteStake || 0)} ADA`
          : t("common.N/A")}
      </ValueCard>
    )
  },
  {
    icon: DelegatorsDrepIcon,
    sizeIcon: 26,
    title: <TitleCard display="flex" alignItems="center">{t("glossary.delegators")}</TitleCard>,
    value: (
      <ValueCard>
        {data?.data.delegators != null ? numberWithCommas(data.data.delegators.toString(), 0) : "—"}
      </ValueCard>
    )
  },
  ...(data?.data.govParticipationRate !== undefined && data.data.govParticipationRate > 0
    ? [
        {
          icon: GovernanceIcon,
          sizeIcon: 26,
          title: <TitleCard display="flex" alignItems="center">Governance Participation</TitleCard>,
          value: <ValueCard>{formatPercent(data.data.govParticipationRate)}</ValueCard>
        }
      ]
    : []),
  ...(data?.data.votingPower !== undefined
    ? [
        {
          icon: VotingPowerIcon,
          sizeIcon: 26,
          title: <TitleCard display="flex" alignItems="center">Voting Power</TitleCard>,
          value: <ValueCard>{`${formatADA(data.data.votingPower)} ADA`}</ValueCard>
        }
      ]
    : []),
  ...(data?.data.updatedAt && data.data.updatedAt !== data.data.createdAt
    ? [
        {
          icon: CreateDrepIcon,
          sizeIcon: 26,
          title: <TitleCard display="flex" alignItems="center">Last Updated</TitleCard>,
          value: (
            <DatetimeTypeTooltip>
              <ValueCard>{formatDateTimeLocal(data.data.updatedAt)}</ValueCard>
            </DatetimeTypeTooltip>
          )
        }
      ]
    : [])
];

// ─── Vote Distribution Chart ──────────────────────────────────────────────────

const DrepVoteChart = ({
  votes
}: {
  votes?: { yes: number; no: number; abstain: number; total: number };
}) => {
  const theme = useTheme();

  if (!votes || votes.total === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={5}>
        <Typography color="secondary.light">No votes recorded yet</Typography>
      </Box>
    );
  }

  const { yes, no, abstain, total } = votes;
  const yesPercent = ((yes / total) * 100).toFixed(1);
  const noPercent = ((no / total) * 100).toFixed(1);
  const abstainPercent = ((abstain / total) * 100).toFixed(1);

  const yesColor = theme.palette.success[700];
  const noColor = theme.isDark ? theme.palette.error[700] : theme.palette.error[700];
  const abstainColor = theme.palette.warning[700];

  const chartOptions: Highcharts.Options = {
    chart: {
      type: "pie",
      backgroundColor: "transparent",
      height: 260,
      margin: [0, 0, 0, 0],
      spacing: [0, 0, 0, 0]
    },
    title: { text: undefined },
    tooltip: {
      pointFormat: "<b>{point.y}</b> votes ({point.percentage:.1f}%)",
      backgroundColor: theme.palette.secondary[0],
      borderColor: theme.palette.primary[200],
      style: { color: theme.palette.secondary.main }
    },
    plotOptions: {
      pie: {
        innerSize: "65%",
        dataLabels: { enabled: false },
        showInLegend: false,
        borderWidth: 2,
        borderColor: theme.palette.background.paper
      }
    },
    series: [
      {
        type: "pie",
        name: "Votes",
        data: [
          { name: "Yes", y: yes, color: yesColor },
          { name: "Abstain", y: abstain, color: abstainColor },
          { name: "No", y: no, color: noColor }
        ].filter((item) => item.y > 0)
      }
    ],
    credits: { enabled: false }
  };

  return (
    <Box
      display="flex"
      flexDirection={{ xs: "column", md: "row" }}
      alignItems={{ xs: "center", md: "flex-start" }}
      gap={4}
    >
      {/* Donut chart with center overlay */}
      <Box
        position="relative"
        flexShrink={0}
        sx={{ width: { xs: "100%", md: 260 }, maxWidth: 300 }}
      >
        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          sx={{ pointerEvents: "none" }}
        >
          <Typography variant="h5" fontWeight={700} color="secondary.main">
            {total.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="secondary.light" sx={{ mt: 0.25 }}>
            Total Votes
          </Typography>
        </Box>
      </Box>

      {/* Vote stats */}
      <Box
        flex={1}
        display="flex"
        flexDirection="column"
        justifyContent="center"
        gap={2.5}
        width="100%"
        minWidth={0}
      >
        <VoteStatBar
          icon={<VotesYesIcon style={{ width: 18, height: 18 }} />}
          label={t("common.yes")}
          count={yes}
          percent={yesPercent}
          color={yesColor}
        />
        <VoteStatBar
          icon={<VotesNoIcon style={{ width: 18, height: 18 }} />}
          label={t("common.no")}
          count={no}
          percent={noPercent}
          color={noColor}
        />
        <VoteStatBar
          icon={<VotesAbstainIcon style={{ width: 18, height: 18 }} />}
          label={t("common.abstain")}
          count={abstain}
          percent={abstainPercent}
          color={abstainColor}
        />
      </Box>
    </Box>
  );
};

const VoteStatBar = ({
  icon,
  label,
  count,
  percent,
  color
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  percent: string;
  color: string;
}) => (
  <Box>
    <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.75}>
      <Box display="flex" alignItems="center" gap={1}>
        {icon}
        <Typography variant="body2" fontWeight={500} color="secondary.main" textTransform="capitalize">
          {label}
        </Typography>
      </Box>
      <Box display="flex" alignItems="center" gap={0.75}>
        <Typography variant="body2" color="secondary.main" fontWeight={600}>
          {count.toLocaleString()}
        </Typography>
        <Typography variant="body2" color="secondary.light">
          ({percent}%)
        </Typography>
      </Box>
    </Box>
    <LinearProgress
      variant="determinate"
      value={parseFloat(percent)}
      sx={{
        height: 8,
        borderRadius: 4,
        bgcolor: (theme) => alpha(color, theme.isDark ? 0.2 : 0.15),
        "& .MuiLinearProgress-bar": {
          bgcolor: color,
          borderRadius: 4
        }
      }}
    />
  </Box>
);

// ─── Vote badge ───────────────────────────────────────────────────────────────

const VoteBadge = ({ vote }: { vote: "yes" | "no" | "abstain" }) => {
  const theme = useTheme();

  const config = {
    yes: {
      icon: <VotesYesIcon style={{ width: 14, height: 14 }} />,
      bg: theme.palette.success[100],
      color: theme.palette.success[700]
    },
    no: {
      icon: <VotesNoIcon style={{ width: 14, height: 14 }} />,
      bg: theme.palette.error[100],
      color: theme.palette.error[700]
    },
    abstain: {
      icon: <VotesAbstainIcon style={{ width: 14, height: 14 }} />,
      bg: theme.palette.warning[100],
      color: theme.palette.warning[700]
    }
  };

  const { icon, bg, color } = config[vote];

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        bgcolor: bg,
        color,
        width: "fit-content"
      }}
    >
      {icon}
      <Typography variant="body2" textTransform="capitalize" fontWeight={500} color="inherit">
        {vote}
      </Typography>
    </Box>
  );
};

// ─── Tabs container ───────────────────────────────────────────────────────────

const DrepDetailsTabs = ({ drepId }: { drepId: string }) => {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();

  return (
    <Box mt={3} bgcolor={theme.palette.background.paper} borderRadius={2}>
      <Tabs
        value={tabValue}
        onChange={(_e, newValue) => setTabValue(newValue)}
        sx={{
          borderBottom: 1,
          borderColor: (theme) =>
            theme.isDark ? alpha(theme.palette.secondary.light, 0.1) : theme.palette.primary[200] || "#e0e0e0",
          px: 2,
          "& .MuiTabs-indicator": { backgroundColor: theme.palette.primary.main }
        }}
      >
        <Tab
          label={t("glossary.delegators")}
          sx={{
            color: theme.palette.secondary.light,
            textTransform: "none",
            fontWeight: 500,
            "&.Mui-selected": { color: theme.palette.primary.main }
          }}
        />
        <Tab
          label={t("drep.votes")}
          sx={{
            color: theme.palette.secondary.light,
            textTransform: "none",
            fontWeight: 500,
            "&.Mui-selected": { color: theme.palette.primary.main }
          }}
        />
      </Tabs>

      {tabValue === 0 && <DrepDelegatesTab drepId={drepId} />}
      {tabValue === 1 && <DrepVotesTab drepId={drepId} />}
    </Box>
  );
};

// ─── Delegates tab ────────────────────────────────────────────────────────────

const DrepDelegatesTab = ({ drepId }: { drepId: string }) => {
  const [delegatesData, setDelegatesData] = useState<ApiReturnType<DrepDelegates[]>>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const apiConnector = ApiConnector.getApiConnector();

  useEffect(() => {
    setLoading(true);
    apiConnector
      .getDrepDelegates(drepId, { page, size: pageSize })
      .then((result) => setDelegatesData(result))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, pageSize, drepId]);

  const columns: Column<DrepDelegates>[] = [
    {
      title: t("common.address"),
      key: "address",
      minWidth: "280px",
      render: (r) => (
        <DynamicEllipsisText
          value={r.address}
          sxFirstPart={{ maxWidth: "220px" }}
          postfix={8}
          isTooltip
        />
      )
    },
    {
      title: (
        <Box component="span">
          {t("common.amountADA")} (<ADAicon />)
        </Box>
      ),
      key: "amount",
      minWidth: "150px",
      render: (r) => (
        <Box component="span" sx={{ whiteSpace: "nowrap" }}>
          {formatADA(r.amount)} <ADAicon />
        </Box>
      )
    }
  ];

  return (
    <Box p={2}>
      <Table
        data={delegatesData?.data}
        loading={loading}
        columns={columns}
        total={{ count: delegatesData?.total || 0, title: t("glossary.delegators") }}
        onClickRow={(_e, r) => navigate(`/address/${r.address}`)}
        rowKey="address"
        tableWrapperProps={{ sx: { overflowX: "auto" } }}
        pagination={{
          page,
          size: pageSize,
          total: delegatesData?.total || 0,
          onChange: (newPage, newSize) => {
            setPage(newPage);
            setPageSize(newSize);
          }
        }}
      />
    </Box>
  );
};

// ─── Votes tab ────────────────────────────────────────────────────────────────

const DrepVotesTab = ({ drepId }: { drepId: string }) => {
  const [votesData, setVotesData] = useState<ApiReturnType<GovernanceActionListItem[]>>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const apiConnector = ApiConnector.getApiConnector();

  useEffect(() => {
    setLoading(true);
    apiConnector
      .getDrepVotes(drepId, { page, size: pageSize })
      .then((result) => setVotesData(result))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, pageSize, drepId]);

  const columns: Column<GovernanceActionListItem>[] = [
    {
      title: t("glossary.txHash"),
      key: "txHash",
      minWidth: "240px",
      render: (r) => (
        <DynamicEllipsisText
          value={r.txHash}
          sxFirstPart={{ maxWidth: "180px" }}
          postfix={8}
          isTooltip
        />
      )
    },
    {
      title: t("common.index"),
      key: "index",
      minWidth: "80px",
      render: (r) => (
        <Typography variant="body2" color="secondary.main">
          {r.index}
        </Typography>
      )
    },
    {
      title: t("common.vote"),
      key: "vote",
      minWidth: "130px",
      render: (r) => (r.vote ? <VoteBadge vote={r.vote} /> : <Box color="secondary.light">—</Box>)
    }
  ];

  return (
    <Box p={2}>
      <Table
        data={votesData?.data}
        loading={loading}
        columns={columns}
        total={{ count: votesData?.total || 0, title: t("drep.votes") }}
        onClickRow={(_e, r) => navigate(`/governance-action/${r.txHash}/${r.index}`)}
        rowKey="txHash"
        tableWrapperProps={{ sx: { overflowX: "auto" } }}
        pagination={{
          page,
          size: pageSize,
          total: votesData?.total || 0,
          onChange: (newPage, newSize) => {
            setPage(newPage);
            setPageSize(newSize);
          }
        }}
      />
    </Box>
  );
};
