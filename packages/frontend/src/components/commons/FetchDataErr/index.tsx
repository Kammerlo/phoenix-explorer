import React from "react";
import { Box, BoxProps, Button, Container, styled, Typography, useTheme } from "@mui/material";

import { FetchDataErrLight, FetchDataErrDark } from "src/commons/resources";

const FetchDataErrContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 96px 0px 120px;
  opacity: 0;
  animation: fetchErrReveal 360ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  @keyframes fetchErrReveal {
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

const Image = styled("img")(({ theme }) => ({
  width: "auto",
  height: 180,
  userSelect: "none",
  pointerEvents: "none",
  filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.04))",
  [theme.breakpoints.down("sm")]: {
    height: 140
  }
}));

interface FetchDataErrProps extends BoxProps {
  onRetry?: () => void;
  message?: React.ReactNode;
  hint?: React.ReactNode;
}

const FetchDataErr = React.forwardRef<HTMLDivElement, FetchDataErrProps>(
  ({ onRetry, message, hint, ...props }, ref) => {
    const theme = useTheme();
    return (
      <FetchDataErrContainer component={Container} className="no-record" ref={ref} {...props}>
        <Image src={theme.isDark ? FetchDataErrDark : FetchDataErrLight} alt="" />
        <Typography
          variant="body1"
          sx={{ mt: 2.5, fontWeight: 600, color: theme.palette.secondary.main, textAlign: "center" }}
        >
          {message ?? "We couldn't reach the chain"}
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
          {hint ?? "The data provider may be slow or temporarily unavailable. Give it a moment, then try again."}
        </Typography>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outlined"
            color="primary"
            size="small"
            sx={{ mt: 2.5, borderRadius: 999, px: 3, textTransform: "none", fontWeight: 600 }}
          >
            Try again
          </Button>
        )}
      </FetchDataErrContainer>
    );
  }
);

FetchDataErr.displayName = "FetchDataErr";

export default FetchDataErr;
