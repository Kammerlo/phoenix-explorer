import { Box, Chip, TableCell, TableRow, styled } from "@mui/material";

export const TableContainer = styled(Box)`
  width: 100%;
  background: ${(props) => props.theme.palette.secondary[0]};
  border-radius: 12px;
  box-shadow: ${(props) => props.theme.shadow.card};
  padding: 24px;
`;

export const TableTitle = styled(Box)`
  font-size: 20px;
  font-weight: 700;
  color: ${(props) => props.theme.palette.secondary.main};
  margin-bottom: 24px;
`;

export const StyledTableRow = styled(TableRow)`
  &:nth-of-type(odd) {
    background-color: ${(props) => props.theme.palette.primary[100]}20;
  }
  
  &:hover {
    background-color: ${(props) => props.theme.palette.primary[200]}30;
  }
`;

export const StyledTableCell = styled(TableCell)`
  border-bottom: 1px solid ${(props) => props.theme.palette.primary[200]};
  color: ${(props) => props.theme.palette.secondary.main};
  font-size: 14px;
  padding: 12px 16px;
`;

export const HeaderTableCell = styled(TableCell)`
  border-bottom: 2px solid ${(props) => props.theme.palette.primary[300]};
  color: ${(props) => props.theme.palette.secondary.main};
  font-size: 14px;
  font-weight: 600;
  padding: 16px;
  background-color: ${(props) => props.theme.palette.primary[100]}40;
`;

export const VoterLink = styled(Box)`
  color: ${(props) => props.theme.palette.primary.main};
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
    color: ${(props) => props.theme.palette.primary.dark};
  }
`;

export const VoteChip = styled(Chip)<{ voteType: 'yes' | 'no' | 'abstain' }>`
  font-weight: 600;
  font-size: 12px;
  height: 24px;
  
  ${(props) => {
    switch (props.voteType) {
      case 'yes':
        return `
          background-color: ${props.theme.palette.success.main}20;
          color: ${props.theme.palette.success.main};
          border: 1px solid ${props.theme.palette.success.main}40;
        `;
      case 'no':
        return `
          background-color: ${props.theme.palette.error.main}20;
          color: ${props.theme.palette.error.main};
          border: 1px solid ${props.theme.palette.error.main}40;
        `;
      case 'abstain':
        return `
          background-color: ${props.theme.palette.warning.main}20;
          color: ${props.theme.palette.warning.main};
          border: 1px solid ${props.theme.palette.warning.main}40;
        `;
      default:
        return '';
    }
  }}
`;

export const VoterTypeChip = styled(Chip)<{ voterType: string }>`
  font-size: 11px;
  height: 20px;
  margin-left: 8px;
  
  ${(props) => {
    switch (props.voterType) {
      case 'drep':
        return `
          background-color: ${props.theme.palette.info.main}20;
          color: ${props.theme.palette.info.main};
        `;
      case 'constitutional_committee':
        return `
          background-color: ${props.theme.palette.secondary.main}20;
          color: ${props.theme.palette.secondary.main};
        `;
      case 'spo':
        return `
          background-color: ${props.theme.palette.primary.main}20;
          color: ${props.theme.palette.primary.main};
        `;
      default:
        return '';
    }
  }}
`;

export const PaginationContainer = styled(Box)`
  display: flex;
  justify-content: center;
  margin-top: 24px;
`;