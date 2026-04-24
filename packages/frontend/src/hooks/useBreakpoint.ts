import { useTheme, useMediaQuery } from "@mui/material";

export const SAMSUNG_FOLD_SMALL_WIDTH = 355;

export interface BreakpointState {
  isMobile: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  isDesktop: boolean;
}

export const useBreakpoint = (): BreakpointState => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const isLaptop = useMediaQuery(theme.breakpoints.down("lg"));
  return {
    isMobile,
    isTablet,
    isLaptop,
    isDesktop: !isLaptop
  };
};

export const useIsGalaxyFoldSmall = (): boolean => {
  return useMediaQuery(`(max-width:${SAMSUNG_FOLD_SMALL_WIDTH}px)`);
};
