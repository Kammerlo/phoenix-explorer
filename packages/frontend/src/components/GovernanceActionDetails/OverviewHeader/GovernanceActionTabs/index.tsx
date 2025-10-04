import React, { useState } from "react";
import { Box, Tab, Tabs, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";

import { ActionIcon } from "src/commons/resources";
import CustomIcon from "src/components/commons/CustomIcon";
import { GovernanceActionDetail } from "@shared/dtos/GovernanceOverview";

import {
  TabsContainer,
  HeaderSection,
  ActionTypeSection,
  TitleSection,
  ContentSection,
  TabContentBox,
  StyledTabs,
  StyledTab,
  ContentText,
  AuthorsList,
  AuthorItem
} from "src/components/GovernanceActionDetails/OverviewHeader/GovernanceActionTabs/styles";

interface Props {
  data: GovernanceActionDetail | null;
  actionsType: string | undefined;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`governance-tabpanel-${index}`}
      aria-labelledby={`governance-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `governance-tab-${index}`,
    'aria-controls': `governance-tabpanel-${index}`,
  };
}

export default function GovernanceActionTabs({ data, actionsType }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [value, setValue] = useState(0); // Default to abstract tab

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <TabsContainer>
      {/* Always visible header section */}
      <HeaderSection>
        <ActionTypeSection>
          <CustomIcon
            icon={ActionIcon as React.FunctionComponent<React.SVGAttributes<SVGElement>>}
            fill={theme.mode === "dark" ? theme.palette.primary.main : theme.palette.secondary.light}
            height={24}
            width={24}
          />
          <Box>
            <Box sx={{ fontSize: '14px', color: theme.palette.secondary.light, mb: 0.5 }}>
              {t("govAction.actionType") || "Action Type"}
            </Box>
            <Box sx={{ fontSize: '18px', fontWeight: 'bold', color: theme.palette.secondary.main }}>
              {actionsType}
            </Box>
          </Box>
        </ActionTypeSection>
        
        {data?.title && (
          <TitleSection>
            <Box sx={{ fontSize: '14px', color: theme.palette.secondary.light, mb: 0.5 }}>
              {t("govAction.title") || "Title"}
            </Box>
            <Box sx={{ fontSize: '16px', fontWeight: '600', color: theme.palette.secondary.main }}>
              {data.title}
            </Box>
          </TitleSection>
        )}
      </HeaderSection>

      {/* Tabs section */}
      <ContentSection>
        <StyledTabs 
          value={value} 
          onChange={handleChange} 
          aria-label="governance action tabs"
          variant="scrollable"
          scrollButtons={false}
          allowScrollButtonsMobile={false}
        >
          <StyledTab label={t("govAction.abstract") || "Abstract"} {...a11yProps(0)} />
          <StyledTab label={t("govAction.rationale") || "Rationale"} {...a11yProps(1)} />
          <StyledTab label={t("govAction.motivation") || "Motivation"} {...a11yProps(2)} />
          <StyledTab label={t("govAction.authors") || "Authors"} {...a11yProps(3)} />
        </StyledTabs>

        <TabContentBox>
          <TabPanel value={value} index={0}>
            <ContentText>
              {data?.abstract || t("govAction.noAbstractAvailable") || "No abstract available"}
            </ContentText>
          </TabPanel>

          <TabPanel value={value} index={1}>
            <ContentText>
              {data?.rationale || t("govAction.noRationaleAvailable") || "No rationale available"}
            </ContentText>
          </TabPanel>

          <TabPanel value={value} index={2}>
            <ContentText>
              {data?.motivation || t("govAction.noMotivationAvailable") || "No motivation available"}
            </ContentText>
          </TabPanel>

          <TabPanel value={value} index={3}>
            {data?.authors && Array.isArray(data.authors) && data.authors.length > 0 ? (
              <AuthorsList>
                {data.authors.map((author, index) => (
                  <AuthorItem key={index}>
                    {author}
                  </AuthorItem>
                ))}
              </AuthorsList>
            ) : (
              <ContentText>
                {t("govAction.noAuthorsAvailable") || "No authors available"}
              </ContentText>
            )}
          </TabPanel>
        </TabContentBox>
      </ContentSection>
    </TabsContainer>
  );
}