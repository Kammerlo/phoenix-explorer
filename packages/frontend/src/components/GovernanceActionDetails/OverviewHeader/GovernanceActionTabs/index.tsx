import { useState } from "react";
import { Box, Chip, Tab, Tabs, Typography, useTheme } from "@mui/material";
import { MdPerson } from "react-icons/md";
import { useTranslation } from "react-i18next";

import { GovernanceActionDetail } from "@shared/dtos/GovernanceOverview";

interface Props {
  data: GovernanceActionDetail | null;
  actionsType: string | undefined;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`gov-tabpanel-${index}`}
      aria-labelledby={`gov-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

function EmptyText({ message }: { message: string }) {
  return (
    <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
      {message}
    </Typography>
  );
}

function ContentText({ text }: { text?: string | null }) {
  const theme = useTheme();
  if (!text) return <EmptyText message="Not provided" />;
  return (
    <Typography
      variant="body2"
      sx={{
        color: theme.palette.secondary.main,
        lineHeight: 1.8,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {text}
    </Typography>
  );
}

export default function GovernanceActionTabs({ data, actionsType }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: "Abstract", content: <ContentText text={data?.abstract} /> },
    { label: "Motivation", content: <ContentText text={data?.motivation} /> },
    { label: "Rationale", content: <ContentText text={data?.rationale} /> },
    {
      label: "Authors",
      content:
        data?.authors && data.authors.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {data.authors.map((author, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <MdPerson size={16} color={theme.palette.secondary.light} />
                <Typography variant="body2" sx={{ color: theme.palette.secondary.main }}>
                  {author}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <EmptyText message="No authors listed" />
        ),
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Anchor hash badge */}
      {data?.anchorHash && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: theme.palette.secondary.light, display: "block", mb: 0.5 }}>
            Anchor Hash
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontFamily: "var(--font-family-text)",
              color: theme.palette.secondary.main,
              wordBreak: "break-all",
              fontSize: "12px",
            }}
          >
            {data.anchorHash}
          </Typography>
        </Box>
      )}

      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        variant="scrollable"
        scrollButtons={false}
        sx={{
          minHeight: 36,
          mb: 0,
          "& .MuiTab-root": {
            minHeight: 36,
            fontSize: "13px",
            textTransform: "none",
            fontWeight: 500,
            py: 0.5,
            px: 1.5,
            color: theme.palette.secondary.light,
            "&.Mui-selected": { color: theme.palette.primary.main, fontWeight: 700 },
          },
          "& .MuiTabs-indicator": { backgroundColor: theme.palette.primary.main },
        }}
      >
        {tabs.map((t, i) => (
          <Tab key={i} label={t.label} id={`gov-tab-${i}`} aria-controls={`gov-tabpanel-${i}`} />
        ))}
      </Tabs>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          maxHeight: 300,
          mt: 0,
          pr: 0.5,
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { background: theme.palette.primary[200] || "#ccc", borderRadius: "2px" },
        }}
      >
        {tabs.map((t, i) => (
          <TabPanel key={i} value={tab} index={i}>
            {t.content}
          </TabPanel>
        ))}
      </Box>
    </Box>
  );
}
