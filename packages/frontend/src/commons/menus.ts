import { FaLinkedinIn, FaTelegramPlane, FaYoutube, FaGithub } from "react-icons/fa";
import { IconType } from "react-icons/lib";

import {
  BlockChainMenuIcon,
  BolnisiDashboard,
  BrowseIcon,
  DashboardIcon,
  GovernanceHome,
  OperationalIcon,
  ProtocolIcon,
  StakingLifecycleIcon,
  TwitterX,
  Catalyst
} from "./resources";
import { details, routers } from "./routers";
import { ApiConnector } from "./connector/ApiConnector";
import { FunctionEnum } from "./connector/types/FunctionEnum";

interface Menu {
  title: string;
  key?: string;
  href?: string;
  children?: Menu[];
  icon?: string | React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  tooltip?: string;
  isSpecialPath?: boolean;
  hidden: boolean;
  collapsable?: boolean;
}

interface Social {
  title: string;
  href: string;
  icon: IconType | string | React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
}

const supportedFunctions = ApiConnector.getApiConnector().getSupportedFunctions();

export const menus: Menu[] = [
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
      {
        title: "Epochs",
        key: "glossary.epochs",
        href: routers.EPOCH_LIST,
        hidden: !supportedFunctions.includes(FunctionEnum.EPOCH)
      },
      {
        title: "Blocks",
        key: "glossary.blocks",
        href: routers.BLOCK_LIST,
        hidden: !supportedFunctions.includes(FunctionEnum.BLOCK)
      },
      {
        title: "Transactions",
        key: "glossary.transactions",
        href: routers.TRANSACTION_LIST,
        hidden: !supportedFunctions.includes(FunctionEnum.TRANSACTION)
      },
      {
        title: "Native Tokens",
        key: "glossary.nativeTokens",
        href: routers.TOKEN_LIST,
        hidden: !supportedFunctions.includes(FunctionEnum.TOKENS)
      },
      {
        title: "Pools",
        key: "head.page.pool",
        href: routers.POOLS,
        isSpecialPath: true,
        hidden: !supportedFunctions.includes(FunctionEnum.POOL)
      },
      {
        title: "Delegated Representatives",
        key: "head.page.drep",
        href: routers.DREPS,
        isSpecialPath: true,
        hidden: !supportedFunctions.includes(FunctionEnum.DREP)
      }, 
      {
        title: "Governance Actions",
        key: "glossary.governanceActions",
        href: details.governanceActionList(),
        hidden: !supportedFunctions.includes(FunctionEnum.GOVERNANCE)
      }
    ]
  }
];

export const socials: Social[] = [
  { href: "https://github.com/Kammerlo/cardano-explorer", title: "GitHub", icon: FaGithub },
  { href: "https://projectcatalyst.io/funds/14/cardano-open-developers/phoenix-explorer-reviving-an-open-source-explorer", title: "Project Catalyst", icon: Catalyst },
];

export const footerMenus: Menu[] = [
  {
    title: "Discover Cardano",
    key: "glossary.discoverCardano",
    icon: BrowseIcon,
    hidden: false,
    children: [
      {
        href: "https://cardanofoundation.org/en/about-us/",
        title: "Cardano Foundation",
        key: "site.CF",
        hidden: false
      },
      { href: "https://docs.cardano.org/", title: "Cardano Docs", key: "site.cardanoDocs", hidden: false },
      {
        href: "https://cardanofoundation.org/academy/",
        title: "Cardano Academy",
        key: "site.cardanoAcademy",
        hidden: false
      },
      {
        href: "https://developers.cardano.org/",
        title: "Developer Portal",
        key: "site.developerPortal",
        hidden: false
      },
      { href: "https://cardanofoundation.org/en/news", title: "News and Blog", key: "site.newsAndBlog", hidden: false }
    ]
  }
];
