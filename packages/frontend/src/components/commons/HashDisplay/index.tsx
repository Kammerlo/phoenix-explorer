import { Box, BoxProps, Typography } from "@mui/material";
import React from "react";

import CopyButton from "../CopyButton";
import CustomTooltip from "../CustomTooltip";

interface HashDisplayProps extends BoxProps {
  hash: string;
  /** Number of chars to show at start and end. Default 8 */
  truncate?: number;
  /** Show copy button. Default true */
  showCopy?: boolean;
  /** Font size. Default "body2" */
  variant?: "body1" | "body2" | "caption";
}

const HashDisplay: React.FC<HashDisplayProps> = ({
  hash,
  truncate = 8,
  showCopy = true,
  variant = "body2",
  ...boxProps
}) => {
  if (!hash) return null;

  const display =
    hash.length > truncate * 2 + 3
      ? `${hash.slice(0, truncate)}...${hash.slice(-truncate)}`
      : hash;

  return (
    <Box display="inline-flex" alignItems="center" gap={0.5} {...boxProps}>
      <CustomTooltip title={hash} placement="top">
        <Typography
          variant={variant}
          component="span"
          sx={{ fontFamily: "monospace", cursor: "default", wordBreak: "break-all" }}
        >
          {display}
        </Typography>
      </CustomTooltip>
      {showCopy && <CopyButton text={hash} />}
    </Box>
  );
};

export default HashDisplay;
