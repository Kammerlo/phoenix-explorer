import { Collapse, ListItem } from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { BiChevronDown, BiChevronUp } from "react-icons/bi";
import { useSelector } from "react-redux";
import { Link, RouteComponentProps, withRouter } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useScreen } from "src/commons/hooks/useScreen";
import { footerMenus, menus } from "src/commons/menus";
import { isExternalLink } from "src/commons/utils/helper";
import { RootState } from "src/stores/types";
import { setSidebar } from "src/stores/system";

import FooterMenu from "../FooterMenu";
import {
  FooterMenuContainer,
  IconMenu,
  Menu,
  MenuIcon,
  MenuText,
  SidebarMenuContainer,
  StyledDivider,
  SubMenu,
  SubMenuText,
  itemStyle
} from "./styles";

interface MenuItem {
  title: string;
  key?: string;
  href?: string;
  children?: MenuItem[];
  icon?: string | React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  tooltip?: string;
  isSpecialPath?: boolean;
  hidden: boolean;
  collapsable?: boolean;
}

const SidebarMenu: React.FC<RouteComponentProps> = ({ history }) => {
  const { t } = useTranslation();
  const pathname = history.location.pathname;
  const { sidebar } = useSelector(({ system }: RootState) => system);
  const specialPath = useSelector(({ system }: RootState) => system.specialPath);
  const { isTablet } = useScreen();

  const isActiveMenu = (href: string, isSpecialPath?: boolean): boolean => {
    if ((href === "/" && pathname.includes("reset-password")) || (href === "/" && pathname.includes("verify-email")))
      return true;
    if (href === pathname) return true;
    if (pathname.split("/").length > 2 && href.includes(pathname.split("/")[1])) {
      if (isSpecialPath) return href === specialPath;
      return true;
    }
    return false;
  };

  const currentActive = useMemo(() => {
    const active = menus.findIndex(
      ({ href, children }) =>
        (href && isActiveMenu(href)) ||
        children?.find(({ href, isSpecialPath }) => href && isActiveMenu(href, isSpecialPath))
    );
    if (active + 1) return `menu-${active}`;

    const footerActive = footerMenus.findIndex(
      ({ href, children }) =>
        (href && isActiveMenu(href)) ||
        children?.find(({ href, isSpecialPath }) => href && isActiveMenu(href, isSpecialPath))
    );
    if (footerActive + 1) return `footer-${footerActive}`;

    return "";

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, specialPath]);

  const [active, setActive] = useState<string | null>(currentActive);

  useEffect(() => {
    setActive(sidebar ? active || currentActive : null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebar, specialPath, pathname]);

  useEffect(() => {
    if (pathname === "/") setActive(null);
  }, [pathname]);

  useEffect(() => {
    if (!sidebar && !isTablet) setSidebar(true);
    else if (sidebar && isTablet) setSidebar(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTablet]);

  useEffect(() => {
    if (isTablet) setSidebar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Handle menu item click
  const handleMenuClick = (item: string, collapsable: boolean = true) => {
    if (!collapsable) return; // Don't toggle if not collapsable
    setActive(!sidebar || item !== active ? item : currentActive);
    if (!sidebar) setSidebar(true);
  };

  // Get link props based on whether it's external or internal
  const getLinkProps = (href: string) =>
    isExternalLink(href)
      ? { component: "a" as const, href, target: "_blank" }
      : { component: Link, to: href };

  // Get menu item styles
  const getMenuItemStyles = (theme: any, isActive: boolean) => ({
    ...itemStyle(theme, sidebar),
    ...(isActive
      ? {
          backgroundColor: `${theme.palette.primary.main} !important`,
          color: theme.palette.secondary[0]
        }
      : { color: theme.palette.secondary.light }),
    fontWeight: "bold !important",
    ":hover": isActive
      ? { backgroundColor: `${theme.palette.primary.dark} !important` }
      : { backgroundColor: `${theme.palette.primary[200]} !important` }
  });

  // Get submenu item styles
  const getSubMenuItemStyles = (theme: any, isActive: boolean) => ({
    ...itemStyle(theme, sidebar),
    ...(isActive
      ? {
          backgroundColor: `${theme.palette.primary[200]} !important`,
          color: `${theme.palette.secondary.main} !important`
        }
      : { color: theme.palette.secondary.light }),
    paddingLeft: "70px",
    [theme.breakpoints.down("md")]: {
      paddingLeft: "60px"
    },
    ":hover": isActive
      ? { color: `#fff !important` }
      : { backgroundColor: `${theme.palette.primary[200]} !important` }
  });

  // Render a single menu item
  const renderMenuItem = (item: MenuItem, index: number, prefix: string) => {
    const { href, key, children, icon, tooltip, collapsable = true } = item;
    const title = t(key || "");
    const menuId = `${prefix}-${index}`;
    const isActive = href ? isActiveMenu(href) : menuId === currentActive;
    const isOpen = menuId === active;

    if (item.hidden) return null;

    return (
      <React.Fragment key={menuId}>
        <ListItem
          data-testid={`menu-button-${title.toLowerCase().replaceAll(" ", "_")}`}
          {...(href ? getLinkProps(href) : { component: "div" as const })}
          onClick={() => {
            if (href) {
              setActive(null);
            } else if (children?.length) {
              handleMenuClick(menuId, collapsable);
            }
          }}
          sx={(theme) => getMenuItemStyles(theme, isActive)}
        >
          {icon && (
            <MenuIcon src={icon.toString()} alt={title} iconOnly={+!sidebar} active={+isActive} />
          )}
          <MenuText primary={title} open={+sidebar} active={+isActive} disable={+!!tooltip} />
          {sidebar && children?.length && collapsable && (
            <IconMenu>
              {isOpen ? <BiChevronUp size={18} /> : <BiChevronDown size={18} />}
            </IconMenu>
          )}
        </ListItem>

        {children?.length && (
          <Collapse in={collapsable ? isOpen : sidebar} timeout="auto" unmountOnExit={collapsable}>
            <SubMenu disablePadding>
              {children.map((subItem, subIndex) => renderSubMenuItem(subItem, subIndex))}
            </SubMenu>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  // Render a submenu item
  const renderSubMenuItem = (subItem: MenuItem, subIndex: number) => {
    const { href, icon, isSpecialPath, key } = subItem;
    const title = t(key || "");
    
    if (subItem.hidden || !href) return null;

    const isActive = isActiveMenu(href, isSpecialPath);

    return (
      <ListItem
        data-testid={`submenu-button-${title.toLowerCase().replaceAll(" ", "_")}`}
        key={`submenu-${subIndex}`}
        {...getLinkProps(href)}
        sx={(theme) => getSubMenuItemStyles(theme, isActive)}
      >
        {icon && (
          <MenuIcon src={icon.toString()} alt={title} iconOnly={+!sidebar} active={+isActive} />
        )}
        <SubMenuText primary={title} open={+sidebar} active={+isActive} />
      </ListItem>
    );
  };

  return (
    <SidebarMenuContainer>
      <Menu>
        {menus.map((item, index) => renderMenuItem(item, index, "menu"))}
        <StyledDivider sidebar={+sidebar} />
        {footerMenus.map((item, index) => renderMenuItem(item, index, "footer"))}
      </Menu>
      <FooterMenuContainer>
        <FooterMenu />
      </FooterMenuContainer>
    </SidebarMenuContainer>
  );
};

export default withRouter(SidebarMenu);
