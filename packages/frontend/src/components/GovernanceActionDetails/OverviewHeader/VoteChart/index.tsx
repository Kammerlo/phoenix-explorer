import React, { useState, useMemo } from "react";
import { Box, useTheme, ToggleButton, ToggleButtonGroup } from "@mui/material";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useTranslation } from "react-i18next";

import { 
  FilterContainer,
  StyledToggleButtonGroup,
  VoteStatsContainer,
  VoteStat,
  VoteStatLabel,
  VoteStatValue
} from "src/components/GovernanceActionDetails/OverviewHeader/VoteChart/styles";
import { VoteData, VoteType } from "@shared/dtos/GovernanceOverview";

interface Props {
  voteData: VoteData;
}

export default function VoteChart({ voteData }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [selectedVoteTypes, setSelectedVoteTypes] = useState<VoteType[]>([]);
  // Calculate aggregated vote totals based on selected vote types
  const aggregatedVotes = useMemo(() => {
    if (selectedVoteTypes.length === 0) {
      // Show total of all vote types when none are selected
      const total = {
        yes: (voteData.committee?.yes || 0) + (voteData.drep?.yes || 0) + (voteData.spo?.yes || 0),
        no: (voteData.committee?.no || 0) + (voteData.drep?.no || 0) + (voteData.spo?.no || 0),
        abstain: (voteData.committee?.abstain || 0) + (voteData.drep?.abstain || 0) + (voteData.spo?.abstain || 0)
      };
      return total;
    }

    // Aggregate only selected vote types
    return selectedVoteTypes.reduce(
      (acc, voteType) => {
        const votes = voteData[voteType];
        if (votes) {
          acc.yes += votes.yes;
          acc.no += votes.no;
          acc.abstain += votes.abstain;
        }
        return acc;
      },
      { yes: 0, no: 0, abstain: 0 }
    );
  }, [selectedVoteTypes, voteData]);

  const totalVotes = aggregatedVotes.yes + aggregatedVotes.no + aggregatedVotes.abstain;

  const handleVoteTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newSelectedVoteTypes: VoteType[]
  ) => {
    setSelectedVoteTypes(newSelectedVoteTypes);
  };

  // Chart configuration
  const chartOptions: Highcharts.Options = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      height: 300,
    },
    title: {
      text: undefined
    },
    tooltip: {
      pointFormat: '<b>{point.y}</b> votes ({point.percentage:.1f}%)',
      backgroundColor: theme.palette.secondary[0],
      borderColor: theme.palette.primary[200],
      style: {
        color: theme.palette.secondary.main
      }
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b>: {point.y} ({point.percentage:.1f}%)',
          style: {
            color: theme.palette.secondary.main,
            fontSize: '12px',
            textOutline: 'none'
          }
        },
        showInLegend: true
      }
    },
    legend: {
      align: 'center',
      verticalAlign: 'bottom',
      itemStyle: {
        color: theme.palette.secondary.main,
        fontSize: '12px'
      }
    },
    series: [{
      type: 'pie',
      name: 'Votes',
      data: [
        {
          name: t('govAction.yes') || 'Yes',
          y: aggregatedVotes.yes,
          color: theme.palette.success.main
        },
        {
          name: t('govAction.no') || 'No',
          y: aggregatedVotes.no,
          color: theme.palette.error.main
        },
        {
          name: t('govAction.abstain') || 'Abstain',
          y: aggregatedVotes.abstain,
          color: theme.palette.warning.main
        }
      ].filter(item => item.y > 0) // Only show categories with votes
    }],
    credits: {
      enabled: false
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ fontSize: '18px', fontWeight: 'bold', color: theme.palette.secondary.main, mb: 2 }}>
          {t('govAction.voteDistribution') || 'Vote Distribution'}
        </Box>
        
        <FilterContainer>
          <StyledToggleButtonGroup
            value={selectedVoteTypes}
            onChange={handleVoteTypeChange}
            aria-label="vote type filter"
          >
            <ToggleButton value="committee" aria-label="committee">
              {t('govAction.committee') || 'Committee'}
            </ToggleButton>
            <ToggleButton value="drep" aria-label="drep">
              {t('govAction.drep') || 'DRep'}
            </ToggleButton>
            <ToggleButton value="spo" aria-label="spo">
              {t('govAction.spo') || 'SPO'}
            </ToggleButton>
          </StyledToggleButtonGroup>
        </FilterContainer>
      </Box>

      <VoteStatsContainer>
        <VoteStat>
          <VoteStatLabel>{t('govAction.totalVotes') || 'Total Votes'}</VoteStatLabel>
          <VoteStatValue>{totalVotes.toLocaleString()}</VoteStatValue>
        </VoteStat>
        <VoteStat>
          <VoteStatLabel>{t('govAction.yes') || 'Yes'}</VoteStatLabel>
          <VoteStatValue style={{ color: theme.palette.success.main }}>
            {aggregatedVotes.yes.toLocaleString()}
          </VoteStatValue>
        </VoteStat>
        <VoteStat>
          <VoteStatLabel>{t('govAction.no') || 'No'}</VoteStatLabel>
          <VoteStatValue style={{ color: theme.palette.error.main }}>
            {aggregatedVotes.no.toLocaleString()}
          </VoteStatValue>
        </VoteStat>
        <VoteStat>
          <VoteStatLabel>{t('govAction.abstain') || 'Abstain'}</VoteStatLabel>
          <VoteStatValue style={{ color: theme.palette.warning.main }}>
            {aggregatedVotes.abstain.toLocaleString()}
          </VoteStatValue>
        </VoteStat>
      </VoteStatsContainer>

      {totalVotes > 0 ? (
        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
      ) : (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: 300,
            color: theme.palette.secondary.light,
            fontSize: '16px'
          }}
        >
          {t('govAction.noVotesAvailable') || 'No votes available'}
        </Box>
      )}
    </Box>
  );
}