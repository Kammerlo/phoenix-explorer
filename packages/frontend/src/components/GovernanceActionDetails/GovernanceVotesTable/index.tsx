import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableHead,
  Pagination,
  Box,
  useTheme
} from "@mui/material";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { GovActionVote } from "@shared/dtos/GovernanceOverview";
import { formatDateTimeLocal } from "src/commons/utils/helper";
import DatetimeTypeTooltip from "src/components/commons/DatetimeTypeTooltip";
import { details } from "src/commons/routers";

import {
  TableContainer,
  TableTitle,
  StyledTableRow,
  StyledTableCell,
  HeaderTableCell,
  VoterLink,
  VoteChip,
  VoterTypeChip,
  PaginationContainer
} from "./styles";

interface Props {
  votes: GovActionVote[];
}

const VOTES_PER_PAGE = 10;

export default function GovernanceVotesTable({ votes }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const history = useHistory();
  const [page, setPage] = useState(1);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleVoterClick = (vote: GovActionVote) => {
    switch (vote.voterType) {
      case 'drep':
        history.push(details.drep(vote.voter));
        break;
    // TODO add route for committee member details
    //   case 'constitutional_committee':
    //     history.push(details.constitutionalCommitteeDetail(vote.voter));
    //     break;
      case 'spo':
        history.push(details.delegation(vote.voter));
        break;
    }
  };

  const getVoterTypeLabel = (voterType: string): string => {
    switch (voterType) {
      case 'drep':
        return 'DRep';
      case 'constitutional_committee':
        return 'Committee';
      case 'spo':
        return 'SPO';
      default:
        return voterType;
    }
  };

  const getVoteLabel = (vote: string): string => {
    return vote.charAt(0).toUpperCase() + vote.slice(1);
  };

  // Calculate pagination
  const totalPages = Math.ceil(votes.length / VOTES_PER_PAGE);
  const startIndex = (page - 1) * VOTES_PER_PAGE;
  const endIndex = startIndex + VOTES_PER_PAGE;
  const paginatedVotes = useMemo(() => {
    return votes.slice(startIndex, endIndex);
  }, [votes, startIndex, endIndex]);

  if (!votes || votes.length === 0) {
    return (
      <TableContainer>
        <TableTitle>{t("govAction.votes") || "Votes"}</TableTitle>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 200,
          color: theme.palette.secondary.light,
          fontSize: '16px'
        }}>
          {t("govAction.noVotesAvailable") || "No votes available"}
        </Box>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      <TableTitle>
        {t("govAction.votes") || "Votes"} ({votes.length})
      </TableTitle>
      
      <Table>
        <TableHead>
          <StyledTableRow>
            <HeaderTableCell>{t("govAction.voter") || "Voter"}</HeaderTableCell>
            <HeaderTableCell>{t("govAction.voterType") || "Type"}</HeaderTableCell>
            <HeaderTableCell>{t("govAction.vote") || "Vote"}</HeaderTableCell>
            <HeaderTableCell>{t("govAction.voteTime") || "Vote Time"}</HeaderTableCell>
            <HeaderTableCell>{t("govAction.txHash") || "Transaction"}</HeaderTableCell>
          </StyledTableRow>
        </TableHead>
        <TableBody>
          {paginatedVotes.map((vote, index) => (
            <StyledTableRow key={`${vote.txHash}-${vote.certIndex}-${index}`}>
              <StyledTableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <VoterLink onClick={() => handleVoterClick(vote)}>
                    {vote.voter.slice(0, 8)}...{vote.voter.slice(-8)}
                  </VoterLink>
                </Box>
              </StyledTableCell>
              <StyledTableCell>
                    <VoterTypeChip
                        voterType={vote.voterType}
                        label={getVoterTypeLabel(vote.voterType)}
                        variant="outlined"
                    />
              </StyledTableCell>
              <StyledTableCell>
                <VoteChip
                  voteType={vote.vote}
                  label={getVoteLabel(vote.vote)}
                  variant="outlined"
                />
              </StyledTableCell>
              <StyledTableCell>
                <DatetimeTypeTooltip>
                          {formatDateTimeLocal(vote?.voteTime)}
                </DatetimeTypeTooltip>
              </StyledTableCell>
              <StyledTableCell>
                <Box sx={{ 
                  color: theme.palette.primary.main,
                  fontSize: '14px',
                  fontFamily: 'monospace'
                }}>
                  {vote.txHash.slice(0, 8)}...{vote.txHash.slice(-8)}
                </Box>
              </StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <PaginationContainer>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
            showFirstButton
            showLastButton
          />
        </PaginationContainer>
      )}
    </TableContainer>
  );
}