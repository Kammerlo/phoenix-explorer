import { FaGithub } from "react-icons/fa";
import { IconType } from "react-icons/lib";

import {
  BlockChainMenuIcon,
  BrowseIcon,
  DashboardIcon,
  ProtocolIcon,
  TwitterX
} from "./resources";
import { details, routers } from "./routers";
import { ApiConnector } from "./connector/ApiConnector";
import { Capability } from "./connector/types/Capability";
import { MenuItem, filterMenusByCapabilities } from "./connector/capabilities/filterMenus";

export type Menu = MenuItem;

interface Social {
  title: string;
  href: string;
  icon: IconType | string | React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
}

/** Sidebar menus, gated by the connector's declared capabilities. */
export function buildMenus(connector: ApiConnector): Menu[] {
  const raw: Menu[] = [
    {
      title: "Dashboard",
      key: "page.dashboard",
      icon: DashboardIcon,
      href: routers.HOME,
      hidden: false
    },
    {
      title: "Blockchain",
      key: "glossary.blockchain",
      icon: BlockChainMenuIcon,
      hidden: false,
      collapsable: false,
      children: [
        { title: "Epochs",       key: "glossary.epochs",       href: routers.EPOCH_LIST,           hidden: false, capability: "getEpochs" satisfies Capability },
        { title: "Blocks",       key: "glossary.blocks",       href: routers.BLOCK_LIST,           hidden: false, capability: "getBlocksPage" satisfies Capability },
        { title: "Transactions", key: "glossary.transactions", href: routers.TRANSACTION_LIST,     hidden: false, capability: "getTransactions" satisfies Capability },
        { title: "Native Tokens", key: "glossary.nativeTokens", href: routers.TOKEN_LIST,          hidden: false, capability: "getTokensPage" satisfies Capability },
        { title: "Pools",        key: "head.page.pool",        href: routers.POOLS, isSpecialPath: true, hidden: false, capability: "getPoolList" satisfies Capability },
        { title: "Delegated Representatives", key: "head.page.drep", href: routers.DREPS, isSpecialPath: true, hidden: false, capability: "getDreps" satisfies Capability },
        { title: "Governance Actions", key: "glossary.governanceActions", href: details.governanceActionList(), hidden: false, capability: "getGovernanceOverviewList" satisfies Capability }
      ]
    }
  ];
  return filterMenusByCapabilities(raw, (c) => connector.has(c));
}

export function buildFooterMenus(connector: ApiConnector): Menu[] {
  const raw: Menu[] = [
    { title: "Plugins",  key: "glossary.plugins",  icon: ProtocolIcon, href: routers.PLUGINS, hidden: false },
    { title: "Protocol Parameters", key: "glossary.protocolParameters", icon: ProtocolIcon, href: routers.PROTOCOL_PARAMETERS, hidden: false, capability: "getCurrentProtocolParameters" satisfies Capability },
    {
      title: "Discover Cardano", key: "glossary.discoverCardano", icon: BrowseIcon, hidden: false,
      children: [
        { href: "https://cardanofoundation.org/en/about-us/", title: "Cardano Foundation", key: "site.CF", hidden: false },
        { href: "https://docs.cardano.org/", title: "Cardano Docs", key: "site.cardanoDocs", hidden: false },
        { href: "https://cardanofoundation.org/academy/", title: "Cardano Academy", key: "site.cardanoAcademy", hidden: false },
        { href: "https://developers.cardano.org/", title: "Developer Portal", key: "site.developerPortal", hidden: false },
        { href: "https://cardanofoundation.org/en/news", title: "News and Blog", key: "site.newsAndBlog", hidden: false }
      ]
    }
  ];
  return filterMenusByCapabilities(raw, (c) => connector.has(c));
}

export const socials: Social[] = [
  { href: "https://github.com/Kammerlo/phoenix-explorer", title: "GitHub", icon: FaGithub },
  { href: "https://x.com/kammerlo91", title: "Twitter", icon: TwitterX }
];
