import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
  Box,
  CircularProgress,
  Tooltip,
  TooltipProps,
  Typography,
  styled,
  tooltipClasses,
  useTheme,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination
} from "@mui/material";
import { HiArrowLongLeft } from "react-icons/hi2";
import { t } from "i18next";

import DetailHeader, { DetailHeaderType } from "src/components/commons/DetailHeader";
import {
  DescriptonDrepIcon,
  CreateDrepIcon,
  ActiveVoteIcon,
  LiveStakeDrepIcon,
  DelegatorsDrepIcon,
  LifetimeVoteDrepIcon,
  VotesYesIcon,
  VotesAbstainIcon,
  VotesNoIcon
} from "src/commons/resources";
import { ActionMetadataModalConfirm } from "src/components/GovernanceVotes";
import { formatADA, formatADAFull, formatDateTimeLocal, formatPercent } from "src/commons/utils/helper";
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

import { StyledContainer, TitleCard, ValueCard } from "./styles";
import { ApiConnector } from "src/commons/connector/ApiConnector";
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
  const history = useHistory();
  const { width, isMobile } = useScreen();

  const [openModal, setOpenModal] = useState(false);
  const [data, setData] = useState<ApiReturnType<Drep>>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const apiConnector = ApiConnector.getApiConnector();

  useEffect(() => {
    const fetchDrepData = async () => {
      try {
        const result = await apiConnector.getDrep(drepId);
        setData(result);
      } catch (error) {
        console.error('Error fetching DRep data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDrepData();
  }, [drepId]);
  const listOverview = getDrepOverviewCards(data, theme, openModal, setOpenModal);

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
        type={DetailHeaderType.DREP}
        title={
          <TruncateSubTitleContainer mr={isMobile ? 2 : 0}>
            <DynamicEllipsisText
              value={data?.data.givenName || ""}
              sxFirstPart={{ maxWidth: width > 600 ? "calc(100% - 130px)" : "calc(100% - 70px)" }}
              postfix={5}
              isNoLimitPixel={true}
              isTooltip
            />
          </TruncateSubTitleContainer>
        }
        loading={false}
        listItem={listOverview}
        // subTitle={`Type: ${data?.data.type || ""}`}
        stakeKeyStatus={data?.data.status}
      />
      
      {/* Lifetime Votes Section */}
      <Box mt={3} p={3} bgcolor={theme.palette.background.paper} borderRadius={2}>
        <Box display={"flex"} alignItems="center" gap={1} mb={3}>
          <LifetimeVoteDrepIcon style={{ width: 26, height: 26 }} />
          <TitleCard display={"flex"} alignItems="center">
            {t("drep.lifetimeVotes")}
          </TitleCard>
        </Box>
        
        <VoteRate votes={data?.data.votes} loading={loading} />
      </Box>
      
      {/* Drep Details Tabs */}
      <DrepDetailsTabs drepId={drepId} />
      
      {/* <DrepAccordion /> */}
    </StyledContainer>
  );
};

export default DrepDetail;

// Helper function to create overview cards
const getDrepOverviewCards = (
  data: ApiReturnType<Drep> | null, 
  theme: any, 
  openModal: boolean, 
  setOpenModal: (open: boolean) => void
) => [
  {
    icon: DescriptonDrepIcon,
    sizeIcon: 26,
    title: (
      <TitleCard display={"flex"} alignItems="center">
        {t("drep.Anchor")}
      </TitleCard>
    ),
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
            position={"relative"}
            component={"span"}
            onClick={() => setOpenModal(true)}
            color={`${theme.palette.primary.main} !important`}
          >
            <DynamicEllipsisText
              value={data?.data.anchorUrl || ""}
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
            data?.data.anchorUrl ? (data?.data.anchorUrl.includes("http") ? data?.data.anchorUrl : `//${data.data.anchorUrl}`) : ""
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
        <ValueCard>{formatDateTimeLocal(data?.data.createdAt || "")}</ValueCard>
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
        {data?.data.activeVoteStake !== null ? `${formatADAFull(data?.data.activeVoteStake || 0)} ADA` : t("common.N/A")}{" "}
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
      <ValueCard>{data?.data.activeVoteStake !== null ? `${formatADA(data?.data.activeVoteStake || 0)} ADA` : t("common.N/A")} </ValueCard>
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
    value: <ValueCard>{data?.data.delegators} </ValueCard>
  }
];

// Drep Details Tabs Component
const DrepDetailsTabs = ({ drepId }: { drepId: string }) => {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box mt={3} bgcolor={theme.palette.background.paper} borderRadius={2}>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="drep details tabs"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTabs-indicator': {
            backgroundColor: theme.palette.primary.main,
          },
        }}
      >
        <Tab 
          label={t("glossary.delegators")}
          sx={{
            color: theme.palette.secondary.light,
            '&.Mui-selected': {
              color: theme.palette.primary.main
            }
          }}
        />
        <Tab 
          label={t("drep.votes")}
          sx={{
            color: theme.palette.secondary.light,
            '&.Mui-selected': {
              color: theme.palette.primary.main
            }
          }}
        />
      </Tabs>

      {tabValue === 0 && <DrepDelegatesTab drepId={drepId} />}
      {tabValue === 1 && <DrepVotesTab drepId={drepId} />}
    </Box>
  );
};

// Delegates Tab Component
const DrepDelegatesTab = ({ drepId }: { drepId: string }) => {
  const [delegatesData, setDelegatesData] = useState<ApiReturnType<DrepDelegates[]>>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const history = useHistory();
  const apiConnector = ApiConnector.getApiConnector();

  const fetchDelegates = async (page: number = 0, pageSize: number = 10) => {
    setLoading(true);
    try {
      const result = await apiConnector.getDrepDelegates(drepId, { 
        page: page + 1, 
        size: pageSize 
      });
      setDelegatesData(result);
    } catch (error) {
      console.error('Error fetching delegates:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDelegates(page, rowsPerPage);
  }, [page, rowsPerPage, drepId]);

  const handleDelegateClick = (address: string) => {
    history.push(`/address/${address}`);
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box p={3}>
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("common.address")}</TableCell>
              <TableCell align="right">{t("common.amountADA")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: rowsPerPage }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><CommonSkeleton variant="text" width="200px" /></TableCell>
                  <TableCell><CommonSkeleton variant="text" width="100px" /></TableCell>
                </TableRow>
              ))
            ) : (
              delegatesData?.data?.map((delegate, index) => (
                <TableRow 
                  key={index}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleDelegateClick(delegate.address)}
                >
                  <TableCell>
                    <DynamicEllipsisText
                      value={delegate.address}
                      sxFirstPart={{ maxWidth: "200px" }}
                      postfix={8}
                      isTooltip
                    />
                  </TableCell>
                  <TableCell align="right">
                    {formatADA(delegate.amount)} ADA
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={delegatesData?.total || 0}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />
    </Box>
  );
};

// Votes Tab Component
const DrepVotesTab = ({ drepId }: { drepId: string }) => {
  const [votesData, setVotesData] = useState<ApiReturnType<GovernanceActionListItem[]>>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const theme = useTheme();
  const history = useHistory();
  const apiConnector = ApiConnector.getApiConnector();

  const fetchVotes = async (page: number = 0, pageSize: number = 10) => {
    setLoading(true);
    try {
      const result = await apiConnector.getDrepVotes(drepId, { 
        page: page + 1, 
        size: pageSize 
      });
      setVotesData(result);
    } catch (error) {
      console.error('Error fetching votes:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVotes(page, rowsPerPage);
  }, [page, rowsPerPage, drepId]);

  const handleVoteClick = (txHash: string, index: number) => {
    // Prepare for future governance actions page
    history.push(`/governance-actions/${txHash}/${index}`);
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box p={3}>
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("glossary.txHash")}</TableCell>
              <TableCell align="center">{t("common.index")}</TableCell>
              <TableCell align="center">{t("common.vote")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: rowsPerPage }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><CommonSkeleton variant="text" width="200px" /></TableCell>
                  <TableCell><CommonSkeleton variant="text" width="50px" /></TableCell>
                  <TableCell><CommonSkeleton variant="text" width="80px" /></TableCell>
                </TableRow>
              ))
            ) : (
              votesData?.data?.map((vote, index) => (
                <TableRow 
                  key={index}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleVoteClick(vote.txHash, vote.index)}
                >
                  <TableCell>
                    <DynamicEllipsisText
                      value={vote.txHash}
                      sxFirstPart={{ maxWidth: "200px" }}
                      postfix={8}
                      isTooltip
                    />
                  </TableCell>
                  <TableCell align="center">
                    {vote.index}
                  </TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 0.5,
                        borderRadius: 1,
                        backgroundColor: 
                          vote.vote === 'yes' ? theme.palette.success[100] :
                          vote.vote === 'no' ? theme.palette.error[100] :
                          theme.palette.warning[100],
                        color:
                          vote.vote === 'yes' ? theme.palette.success[700] :
                          vote.vote === 'no' ? theme.palette.error[700] :
                          theme.palette.warning[700]
                      }}
                    >
                      {vote.vote === 'yes' && <VotesYesIcon />}
                      {vote.vote === 'no' && <VotesNoIcon />}
                      {vote.vote === 'abstain' && <VotesAbstainIcon />}
                      <Typography variant="body2" textTransform="capitalize">
                        {vote.vote}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={votesData?.total || 0}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />
    </Box>
  );
};



export const VoteRate = ({
  votes,
  loading
}: {
  votes: {yes: number; no: number; abstain: number; total: number}
  loading: boolean;
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Box borderRadius={4} overflow="hidden" height={150}>
        <CommonSkeleton variant="rectangular" height={250} width="100%" />
      </Box>
    );
  }

  return (
    <Box display="flex" alignItems="end" justifyContent="center" gap={4} flexWrap={"wrap"} width="100%" minHeight={150}>
      <VoteBar
        percentage={votes.total > 0 ? formatPercent((votes.yes) / votes.total) : 0}
        color={theme.palette.success[700]}
        numberVote={votes.yes}
        icon={<VotesYesIcon />}
        label={t("common.yes")}
        showDataTooltip={true}
      />
      <VoteBar
        percentage={votes.total > 0 ? formatPercent((votes.abstain) / votes.total) : 0}
        color={theme.palette.warning[700]}
        numberVote={votes.abstain}
        icon={<VotesAbstainIcon />}
        label={t("common.abstain")}
        showDataTooltip={true}
      />
      <VoteBar
        percentage={
          votes.total > 0
            ? formatPercent(
                (100 -
                  (+formatPercent(votes.yes / votes.total).split("%")[0] +
                    +formatPercent(votes.abstain / votes.total).split("%")[0])) /
                  100
              )
            : 0
        }
        color={theme.isDark ? theme.palette.error[100] : theme.palette.error[700]}
        numberVote={votes.no}
        icon={<VotesNoIcon />}
        label={t("common.no")}
        showDataTooltip={true}
      />
    </Box>
  );
};

const VoteBar = ({
  percentage,
  color,
  icon,
  label,
  numberVote,
  showDataTooltip
}: {
  percentage: string | number;
  numberVote: number;
  color: string;
  icon?: JSX.Element;
  label: string;
  showDataTooltip: boolean;
}) => (
  <Box display="flex" flexDirection="column" alignItems="center">
    <Typography fontSize="10px" fontWeight={400}>
      {!percentage ? "0%" : percentage}
    </Typography>
    <LightTooltip
      title={
        <Box height="39px" display="flex" alignItems="center" gap="8px">
          {icon}
          <Typography fontSize="12px" fontWeight={600}>
            {showDataTooltip ? numberVote : t("common.na")} ({percentage})
          </Typography>
        </Box>
      }
      placement="top"
    >
      <Box
        sx={{ background: color, borderRadius: "4px" }}
        height={`${
          +(percentage.toString()?.split("%")[0] || 0) === 0 ? 0.5 : +percentage.toString().split("%")[0] + 1
        }px`}
        width="80px"
      />
    </LightTooltip>
    <Typography fontSize="14px" fontWeight={400} pt="4px" textTransform="uppercase">
      {label}
    </Typography>
  </Box>
);

const LightTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.primary[100],
    color: "rgba(0, 0, 0, 0.87)",
    fontSize: 11,
    border: `1px solid ${theme.palette.primary[200]}`
  }
}));
