import { Box, BoxProps, alpha, useTheme } from "@mui/material";

export interface ResponsiveTableWrapperProps extends BoxProps {
  maxHeight?: number | string;
}

const ResponsiveTableWrapper: React.FC<ResponsiveTableWrapperProps> = ({
  children,
  maxHeight,
  sx,
  ...rest
}) => {
  const theme = useTheme();
  const scrollbarColor = theme.isDark
    ? alpha(theme.palette.secondary.light, 0.3)
    : theme.palette.primary[200] || "#e0e0e0";

  return (
    <Box
      {...rest}
      sx={{
        width: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        maxHeight,
        "&::-webkit-scrollbar": {
          height: 8,
          width: 8
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: scrollbarColor,
          borderRadius: 4
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: "transparent"
        },
        ...(sx || {})
      }}
    >
      {children}
    </Box>
  );
};

export default ResponsiveTableWrapper;
