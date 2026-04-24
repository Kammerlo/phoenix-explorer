import { Box, useTheme } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import { useBreakpoint } from "src/hooks/useBreakpoint";
import {
  CardanoBlueDarkmodeLogo,
  CardanoBlueLogo,
  LogoDarkmodeFullIcon,
  LogoFullIcon,
  MenuIconComponent,
  SearchIcon
} from "src/commons/resources";
import { routers } from "src/commons/routers";
import { setOnDetailView, setSidebar } from "src/stores/system";
import { setTheme } from "src/stores/theme";

import CustomIcon from "../../CustomIcon";
import TopSearch from "../Sidebar/TopSearch";
import HeaderSearch from "./HeaderSearch";
import ProviderSwitcher from "../../ProviderSwitcher";
import {
  ButtonSideBar,
  HeaderBox,
  HeaderContainer,
  HeaderLogo,
  HeaderLogoLink,
  HeaderMain,
  HeaderSearchContainer,
  HeaderTop,
  NetworkContainer,
  SearchButton,
  SideBarRight,
  SwitchMode,
  Title,
  WrapButtonSelect
} from "./styles";
import { RootState } from "src/stores/types";

const Header: React.FC = () => {
  const location = useLocation();
  const { isMobile } = useBreakpoint();

  const home = location.pathname === "/";
  const { sidebar } = useSelector(({ system }: RootState) => system);
  const { theme: themeMode } = useSelector(({ theme }: RootState) => theme);
  const logoSrc = isMobile
    ? themeMode === "dark"
      ? LogoDarkmodeFullIcon
      : LogoFullIcon
    : themeMode === "dark"
    ? CardanoBlueDarkmodeLogo
    : CardanoBlueLogo;
  const providerConfig = useSelector((state: RootState) => state.provider?.config);
  const [openSearch, setOpenSearch] = React.useState(false);
  const [openProvider, setOpenProvider] = useState(false);
  const handleToggle = () => setSidebar(!sidebar);
  const theme = useTheme();

  const refElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (refElement.current && event.target instanceof Node && refElement.current.contains(event.target)) {
        setOpenSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenSearch = () => {
    setOpenSearch((prev) => !prev);
    setOnDetailView(false);
  };

  return (
    <HeaderContainer data-testid="header" role="banner">
      <HeaderBox home={home ? 1 : 0}>
        <HeaderMain home={home ? 1 : 0}>
          <Title home={home ? 1 : 0} data-testid="home-title">
            <Box
              display={"flex"}
              alignItems={"center"}
              justifyContent={"center"}
              flexDirection={isMobile ? "column" : "row"}
            ></Box>
          </Title>
          <HeaderSearchContainer home={+home}><HeaderSearch home={home} /></HeaderSearchContainer>
        </HeaderMain>
        <HeaderTop data-testid="header-top" ref={refElement}>
          <SideBarRight>
            <ButtonSideBar onClick={handleToggle} aria-label={sidebar ? "Close sidebar" : "Open sidebar"}>
              <CustomIcon icon={MenuIconComponent} height={18} fill={theme.palette.secondary.light} />
            </ButtonSideBar>
            {location.pathname !== routers.STAKING_LIFECYCLE && (
              <SearchButton onClick={handleOpenSearch} home={+home} aria-label="Open search">
                <SearchIcon fontSize={24} stroke={theme.palette.secondary.light} fill={theme.palette.secondary[0]} />
              </SearchButton>
            )}
            <WrapButtonSelect>
              <Box
                component="button"
                onClick={() => setOpenProvider(true)}
                aria-label="Switch data provider"
                sx={{
                  background: "none",
                  border: `1px solid ${theme.palette.primary.main}`,
                  borderRadius: "6px",
                  px: 1,
                  py: 0.25,
                  cursor: "pointer",
                  color: theme.palette.primary.main,
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  display: { xs: "none", md: "block" }
                }}
              >
                {providerConfig?.type ?? "GATEWAY"}
              </Box>
              <SwitchMode
                data-testid="theme-toggle"
                checked={themeMode === "dark"}
                disableRipple
                inputProps={{ "aria-label": themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode" }}
                onChange={(e) => {
                  setTheme(e.target.checked ? "dark" : "light");
                }}
              />
            </WrapButtonSelect>
          </SideBarRight>
          <HeaderLogoLink to="/" data-testid="header-logo" aria-label="Cardano Explorer Home">
            {!sidebar && <HeaderLogo src={logoSrc} alt="Cardano Blockchain Explorer logo" />}
          </HeaderLogoLink>
        </HeaderTop>
      </HeaderBox>

      <TopSearch open={openSearch} onClose={setOpenSearch} />
      <ProviderSwitcher open={openProvider} onClose={() => setOpenProvider(false)} />
    </HeaderContainer>
  );
};

export default Header;
