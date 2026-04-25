import React from "react";
import { Box, BoxProps, Container, styled, Typography, useTheme } from "@mui/material";

import { EmptyDarkIcon, EmptyIcon } from "src/commons/resources";

const NoRecordContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 96px 0px 120px;
  opacity: 0;
  animation: noRecordReveal 360ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  @keyframes noRecordReveal {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    opacity: 1;
    transform: none;
    animation: none;
  }
`;

const Image = styled("img")`
  width: auto;
  height: 180px;
  user-select: none;
  pointer-events: none;
  filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.04));
  ${({ theme }) => theme.breakpoints.down("sm")} {
    height: 140px;
  }
`;

interface NoRecordProps extends BoxProps {
  message?: React.ReactNode;
  hint?: React.ReactNode;
}

const NoRecord = React.forwardRef<HTMLDivElement, NoRecordProps>(({ message, hint, ...props }, ref) => {
  const theme = useTheme();
  return (
    <NoRecordContainer component={Container} className="no-record" ref={ref} {...props}>
      <Image src={theme.isDark ? EmptyDarkIcon : EmptyIcon} alt="" />
      <Typography
        variant="body1"
        sx={{
          mt: 2.5,
          fontWeight: 600,
          color: theme.palette.secondary.main,
          textAlign: "center"
        }}
      >
        {message ?? "Nothing here yet"}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          mt: 0.5,
          color: theme.palette.secondary.light,
          maxWidth: 360,
          textAlign: "center"
        }}
      >
        {hint ?? "Try a different filter, or check back in a moment — the chain is always moving."}
      </Typography>
    </NoRecordContainer>
  );
});

NoRecord.displayName = "NoRecord";

export default NoRecord;
