import { Box, useTheme, useMediaQuery, List } from "@mui/material";
import { t } from "i18next";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import { useScreen } from "src/commons/hooks/useScreen";
import { RootState } from "src/stores/types";
import { setOnDetailView, setSidebar } from "src/stores/system";

import StyledModal from "../StyledModal";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ToggleSidebar from "./ToggleSidebar";
import ToastNotifications from "../ToastNotifications";
import { BackDrop, Drawer, Layout, Main, MainContainer } from "./styles";

interface Props {
  children: React.ReactNode;
}
const CustomLayout: React.FC<Props> = ({ children }) => {
  const { sidebar } = useSelector(({ system }: RootState) => system);
  const [openNoticeModal, setOpenNoticeModal] = useState<boolean>(false);
  const location = useLocation();

  const { isTablet } = useScreen();
  const theme = useTheme();
  const mainRef = useRef<HTMLDivElement | null>(null);
  const matchesBreakpoint = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    setOnDetailView(false);
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (sidebar) {
      setOnDetailView(false);
    }
  }, [sidebar]);

  const handleToggle = () => {
    setSidebar(!sidebar);
  };

  return (
    <Layout sidebar={+sidebar}>
      <BackDrop isShow={+sidebar} onClick={handleToggle} />
      <Drawer
        variant="permanent"
        data-testid="sidebar"
        open={sidebar}
        ModalProps={{ keepMounted: true }}
        anchor={isTablet ? "right" : "left"}
        role="navigation"
        aria-label="Main navigation"
      >
        <ToggleSidebar handleToggle={handleToggle} />
        <Sidebar />
      </Drawer>
      <MainContainer id="main">
        <Main
          ref={mainRef}
          open={sidebar ? 1 : 0}
          bgcolor={
            theme.isDark ? "#131316" : "#F6F9FF"
          }
        >
          <Header />
          <Box flexGrow={matchesBreakpoint ? 1 : undefined}>{children}</Box>
          {/* {matchesBreakpoint && <Footer />} */}
        </Main>
        {/* {!matchesBreakpoint && <Footer />} */}
        <NoticeModal open={openNoticeModal} handleCloseModal={() => setOpenNoticeModal(false)} />
      </MainContainer>
      <ToastNotifications />
    </Layout>
  );
};

export default CustomLayout;

const NoticeModal = ({ ...props }: { open: boolean; handleCloseModal: () => void }) => {
  const theme = useTheme();
  return (
    <StyledModal {...props} title={t("notice.title")}>
      <Box
        bgcolor={theme.isDark ? theme.palette.secondary[100] : theme.palette.secondary[0]}
        color={theme.palette.secondary.main}
        borderRadius={3}
      >
        <List
          sx={{
            padding: "16px 40px"
          }}
        >
          <li
            style={{
              listStyle: "disc"
            }}
          >
            {t("notice.value.a")}
          </li>
          <li
            style={{
              listStyle: "disc",
              margin: "16px 0"
            }}
          >
            {t("notice.value.b")}
          </li>
          <li
            style={{
              listStyle: "circle",
              margin: "0px 0 0px 20px"
            }}
          >
            {t("notice.value.b1")}
          </li>
          <li
            style={{
              listStyle: "circle",
              margin: "16px 0 16px 20px"
            }}
          >
            {t("notice.value.b2")}
          </li>
        </List>
      </Box>
    </StyledModal>
  );
};
