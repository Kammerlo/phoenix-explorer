import { Box, ToggleButtonGroup, styled } from "@mui/material";

export const ChartContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 24px;
  background: ${(props) => props.theme.palette.secondary[0]};
  border-radius: 12px;
  box-shadow: ${(props) => props.theme.shadow.card};
`;

export const FilterContainer = styled(Box)`
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
`;

export const StyledToggleButtonGroup = styled(ToggleButtonGroup)`
  & .MuiToggleButton-root {
    padding: 8px 16px;
    border: 1px solid ${(props) => props.theme.palette.primary[200]};
    color: ${(props) => props.theme.palette.secondary.light};
    font-size: 14px;
    text-transform: none;
    
    &:hover {
      background-color: ${(props) => props.theme.palette.primary[100]};
    }
    
    &.Mui-selected {
      background-color: ${(props) => props.theme.palette.primary.main};
      color: ${(props) => props.theme.palette.secondary[0]};
      
      &:hover {
        background-color: ${(props) => props.theme.palette.primary.dark};
      }
    }
  }
`;

export const VoteStatsContainer = styled(Box)`
  display: flex;
  justify-content: space-around;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px 0;
  border-bottom: 1px solid ${(props) => props.theme.palette.primary[200]};
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 12px;
  }
`;

export const VoteStat = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 80px;
`;

export const VoteStatLabel = styled(Box)`
  font-size: 12px;
  color: ${(props) => props.theme.palette.secondary.light};
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const VoteStatValue = styled(Box)`
  font-size: 18px;
  font-weight: bold;
  color: ${(props) => props.theme.palette.secondary.main};
`;