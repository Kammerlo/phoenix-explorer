import { Box, BoxProps, Tooltip, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import React from "react";

import CopyButton from "../CopyButton";

interface HashDisplayProps extends BoxProps {
  hash: string;
  /** Number of chars to show at start and end. Default 8 */
  truncate?: number;
  /** Show inline copy button (in addition to copy in tooltip). Default false */
  showInlineCopy?: boolean;
  /** Font size variant. Default "body2" */
  variant?: "body1" | "body2" | "caption";
}

const HashDisplay: React.FC<HashDisplayProps> = ({
  hash,
  truncate = 8,
  showInlineCopy = false,
  variant = "body2",
  ...boxProps
}) => {
  const theme = useTheme();

  if (!hash) return null;

  const display =
    hash.length > truncate * 2 + 3
      ? `${hash.slice(0, truncate)}...${hash.slice(-truncate)}`
      : hash;

  const tooltipContent = (
    <Box
      sx={{
        fontFamily: "monospace",
        fontSize: "0.72rem",
        wordBreak: "break-all",
        maxWidth: 380,
        lineHeight: 1.5
      }}
    >
      <Box
        sx={{
          fontSize: "0.6rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          mb: 0.5,
          opacity: 0.65
        }}
      >
        Full hash
      </Box>
      <Box display="flex" alignItems="flex-start" gap={0.75}>
        <Box sx={{ flex: 1 }}>{hash}</Box>
        <CopyButton text={hash} />
      </Box>
    </Box>
  );

  return (
    <Box display="inline-flex" alignItems="center" gap={0.5} {...boxProps}>
      <Tooltip
        title={tooltipContent}
        placement="top"
        arrow
        disableInteractive={false}
        leaveDelay={150}
        slotProps={{
          tooltip: {
            sx: {
              bgcolor: theme.isDark ? "#1e1e2e" : "#fff",
              color: theme.palette.secondary.main,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.12)}`,
              p: 1.25,
              maxWidth: 420
            }
          },
          arrow: {
            sx: {
              color: theme.isDark ? "#1e1e2e" : "#fff",
              "&::before": { border: `1px solid ${theme.palette.divider}` }
            }
          }
        }}
      >
        <Typography
          variant={variant}
          component="span"
          sx={{
            fontFamily: "monospace",
            cursor: "default",
            wordBreak: "break-all",
            "&:hover": { opacity: 0.8 }
          }}
        >
          {display}
        </Typography>
      </Tooltip>
      {showInlineCopy && <CopyButton text={hash} />}
    </Box>
  );
};

export default HashDisplay;
