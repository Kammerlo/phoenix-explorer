import { Box, Tabs, Tab, styled } from "@mui/material";

export const TabsContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

export const HeaderSection = styled(Box)`
  padding: 16px 0;
  border-bottom: 1px solid ${(props) => props.theme.palette.primary[200]};
  margin-bottom: 16px;
`;

export const ActionTypeSection = styled(Box)`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

export const TitleSection = styled(Box)`
  margin-top: 8px;
`;

export const ContentSection = styled(Box)`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Allow flex shrinking */
`;

export const StyledTabs = styled(Tabs)`
  border-bottom: 1px solid ${(props) => props.theme.palette.primary[200]};
  
  & .MuiTabs-indicator {
    background-color: ${(props) => props.theme.palette.primary.main};
  }
  
  & .MuiTabs-scroller {
    overflow-x: auto !important;
  }
  
  & .MuiTabs-flexContainer {
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: ${(props) => props.theme.palette.primary[300]} ${(props) => props.theme.palette.primary[100]};
    
    &::-webkit-scrollbar {
      height: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: ${(props) => props.theme.palette.primary[100]};
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: ${(props) => props.theme.palette.primary[300]};
      border-radius: 3px;
      
      &:hover {
        background: ${(props) => props.theme.palette.primary[400]};
      }
    }
  }
  
  & .MuiTabs-scrollButtons {
    color: ${(props) => props.theme.palette.primary.main};
    
    &.Mui-disabled {
      opacity: 0.3;
    }
  }
`;

export const StyledTab = styled(Tab)`
  color: ${(props) => props.theme.palette.secondary.light};
  font-weight: 500;
  text-transform: none;
  font-size: 14px;
  min-width: 80px;
  padding: 8px 16px;
  
  &.Mui-selected {
    color: ${(props) => props.theme.palette.primary.main};
    font-weight: 600;
  }
  
  &:hover {
    color: ${(props) => props.theme.palette.primary.main};
  }
`;

export const TabContentBox = styled(Box)`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 4px;
  margin: 8px 0;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${(props) => props.theme.palette.primary[100]};
    border-radius: 4px;
    margin: 4px 0;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${(props) => props.theme.palette.primary[300]};
    border-radius: 4px;
    
    &:hover {
      background: ${(props) => props.theme.palette.primary[400]};
    }
  }
  
  /* Firefox scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: ${(props) => props.theme.palette.primary[300]} ${(props) => props.theme.palette.primary[100]};
`;

export const ContentText = styled(Box)`
  font-size: 14px;
  line-height: 1.6;
  color: ${(props) => props.theme.palette.secondary.main};
  white-space: pre-wrap;
  word-break: break-word;
  padding: 8px 12px;
  
  &:empty::before {
    content: "No content available";
    color: ${(props) => props.theme.palette.secondary.light};
    font-style: italic;
  }
`;

export const AuthorsList = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const AuthorItem = styled(Box)`
  padding: 8px 12px;
  background: ${(props) => props.theme.palette.primary[100]};
  border-radius: 6px;
  font-size: 14px;
  color: ${(props) => props.theme.palette.secondary.main};
  border-left: 3px solid ${(props) => props.theme.palette.primary.main};
`;