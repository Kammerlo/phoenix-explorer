import { useState } from "react";
import { Box, Chip, Skeleton, Typography, useTheme } from "@mui/material";
import { Link } from "react-router-dom";
import { styled } from "@mui/material/styles";

import { GovActionVote, VoteType } from "@shared/dtos/GovernanceOverview";
import { formatDateTimeLocal, getShortHash } from "src/commons/utils/helper";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import CustomTooltip from "src/components/commons/CustomTooltip";
import { Column } from "src/components/commons/Table";
import Table from "src/components/commons/Table";
import { details } from "src/commons/routers";

interface Props {
  votes: GovActionVote[];
  loading?: boolean;
}

const VOTES_PER_PAGE = 10;

const VoterLink = styled(Link)`
  color: ${(props) => props.theme.palette.primary.main};
  font-weight: 500;
  text-decoration: none;
  font-family: var(--font-family-text);
  &:hover {
    text-decoration: underline;
  }
`;

const VOTER_TYPE_LABELS: Record<VoteType, string> = {
  drep: "DRep",
  constitutional_committee: "Committee",
  spo: "SPO",
};

const VOTE_COLORS = {
  yes: "success",
  no: "error",
  abstain: "warning",
} as const;

function VoteChipInline({ vote }: { vote: "yes" | "no" | "abstain" }) {
  const theme = useTheme();
  const colorKey = VOTE_COLORS[vote] ?? "default";
  const colorValue = theme.palette[colorKey as "success" | "error" | "warning"]?.main ?? theme.palette.secondary.main;
  return (
    <Chip
      label={vote.charAt(0).toUpperCase() + vote.slice(1)}
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: "11px",
        height: "22px",
        backgroundColor: `${colorValue}18`,
        color: colorValue,
        border: `1px solid ${colorValue}50`,
        "& .MuiChip-label": { px: 1 },
      }}
    />
  );
}

function VoterTypeChipInline({ voterType }: { voterType: VoteType }) {
  const theme = useTheme();
  const colorMap: Record<VoteType, string> = {
    drep: theme.palette.info.main,
    constitutional_committee: theme.palette.secondary.main,
    spo: theme.palette.primary.main,
  };
  const color = colorMap[voterType] ?? theme.palette.secondary.main;
  return (
    <Chip
      label={VOTER_TYPE_LABELS[voterType] ?? voterType}
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: "11px",
        height: "22px",
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}50`,
        "& .MuiChip-label": { px: 1 },
      }}
    />
  );
}

function LoadingTable() {
  return (
    <Box>
      {Array.from({ length: 5 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 2fr 2fr",
            gap: 2,
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Skeleton variant="text" width="80%" height={20} />
          <Skeleton variant="rounded" width={60} height={22} />
          <Skeleton variant="rounded" width={50} height={22} />
          <Skeleton variant="text" width="70%" height={20} />
          <Skeleton variant="text" width="60%" height={20} />
        </Box>
      ))}
    </Box>
  );
}

export default function GovernanceVotesTable({ votes, loading = false }: Props) {
  const theme = useTheme();
  const [page, setPage] = useState(0);

  const getVoterLink = (vote: GovActionVote): string | null => {
    switch (vote.voterType) {
      case "drep": return details.drep(vote.voter);
      case "spo": return details.delegation(vote.voter);
      default: return null;
    }
  };

  const columns: Column<GovActionVote>[] = [
    {
      title: "Voter",
      key: "voter",
      minWidth: "180px",
      render: (v) => {
        const link = getVoterLink(v);
        const shortAddr = `${v.voter.slice(0, 10)}…${v.voter.slice(-8)}`;
        if (link) {
          return (
            <CustomTooltip title={v.voter}>
              <VoterLink to={link}>{shortAddr}</VoterLink>
            </CustomTooltip>
          );
        }
        return (
          <CustomTooltip title={v.voter}>
            <Box component="span" sx={{ fontSize: "14px", fontFamily: "var(--font-family-text)" }}>
              {shortAddr}
            </Box>
          </CustomTooltip>
        );
      },
    },
    {
      title: "Type",
      key: "voterType",
      minWidth: "100px",
      render: (v) => <VoterTypeChipInline voterType={v.voterType} />,
    },
    {
      title: "Vote",
      key: "vote",
      minWidth: "90px",
      render: (v) => <VoteChipInline vote={v.vote} />,
    },
    {
      title: "Vote Time",
      key: "voteTime",
      minWidth: "170px",
      render: (v) =>
        v.voteTime ? (
          <DatetimeTypeTooltip>{formatDateTimeLocal(String(v.voteTime))}</DatetimeTypeTooltip>
        ) : (
          <Box component="span" sx={{ color: "text.secondary" }}>
            —
          </Box>
        ),
    },
    {
      title: "Transaction",
      key: "txHash",
      minWidth: "170px",
      render: (v) => (
        <CustomTooltip title={v.txHash}>
          <Box
            component="span"
            sx={{ fontSize: "14px", fontFamily: "var(--font-family-text)", color: theme.palette.primary.main }}
          >
            {getShortHash(v.txHash)}
          </Box>
        </CustomTooltip>
      ),
    },
  ];

  return (
    <Box
      sx={{
        background: (t) => t.palette.secondary[0],
        borderRadius: 3,
        boxShadow: (t) => t.shadow.card,
        p: 3,
      }}
    >
      <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
        Votes {!loading && votes.length > 0 && `(${votes.length})`}
      </Typography>

      {loading ? (
        <LoadingTable />
      ) : (
        <Table
          columns={columns}
          data={votes.slice(page * VOTES_PER_PAGE, (page + 1) * VOTES_PER_PAGE)}
          total={{ count: votes.length, title: "Votes" }}
          rowKey={(r) => `${r.txHash}-${r.certIndex}`}
          pagination={{
            page,
            size: VOTES_PER_PAGE,
            total: votes.length,
            onChange: (p, _s) => setPage(p),
            hideLastPage: true,
          }}
          tableWrapperProps={{ sx: { overflowX: "auto" } }}
        />
      )}
    </Box>
  );
}
