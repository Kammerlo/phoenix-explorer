import { Box, Grid, useTheme, useMediaQuery } from "@mui/material";
import React, { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  ArrowDownDarkIcon,
  ArrowDownIcon,
  ArrowUpDarkIcon,
  ArrowUpIcon,
  SummaryWalletDark,
  WalletRoundedIcon
} from "src/commons/resources";
import DynamicEllipsisText from "src/components/DynamicEllipsisText";
import { details } from "src/commons/routers";
import { formatADAFull, formatNumberDivByDecimals } from "src/commons/utils/helper";
import ADAicon from "src/components/commons/ADAIcon";
import DropdownTokens, { TokenLink } from "src/components/commons/DropdownTokens";

import { GridItem, Icon, TitleText, ValueText, WrapContainerGrid, WrapItemsInfo, WrapTokensInfo } from "./styles";
import {TransactionDetail} from "@shared/dtos/transaction.dto";

const SummaryItems = ({
  item,
  type,
  isFailed
}: {
  item: TransactionDetail["summary"]["stakeAddress"][number];
  type?: "up" | "down";
  isFailed?: boolean;
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const tokensSent = item.tokens?.filter((token) => token.assetQuantity < 0) ?? [];
  const tokensReceived = item.tokens?.filter((token) => token.assetQuantity > 0) ?? [];
  const hasTokens = tokensSent.length > 0 || tokensReceived.length > 0;
  const walletAddressRef = React.useRef<HTMLElement>(null);
  const iconRef = React.useRef<HTMLElement>(null);
  const [height, setHeight] = React.useState(0);
  const [heightImg, setHeightImg] = React.useState(0);
  const matches = useMediaQuery("(max-width: 1000px) and (min-width: 901px)");

  useLayoutEffect(() => {
    walletAddressRef.current && setHeight(walletAddressRef.current.clientHeight);
    iconRef.current && setHeightImg(iconRef.current.clientHeight);
  }, []);

  // Column sizes depend on whether tokens are present
  const colSize = hasTokens
    ? { xs: 12, sm: 6, md: 4, lg: 3 }
    : { xs: 12, sm: 6 };

  return (
    <WrapContainerGrid
      rowGap={2}
      container
      sx={{
        background: (theme) => theme.palette.secondary[0],
        px: 3,
        py: 2,
        mb: 1,
        [theme.breakpoints.down("sm")]: {
          px: 2
        }
      }}
    >
      {/* Wallet */}
      <Grid size={colSize}>
        <GridItem>
          <Icon src={theme.isDark ? SummaryWalletDark : WalletRoundedIcon} alt="wallet icon" />
          <Box ref={iconRef} display={"flex"} flexDirection={"column"} justifyContent={"center"} width={"100%"}>
            <TitleText data-testid="transactionMetadata.summary.walletTitle">{t("common.wallet")}</TitleText>
            <Box ref={walletAddressRef} display={"flex"} justifyContent="flex-start" alignItems={"center"}>
              <Box
                display={"flex"}
                justifyContent="flex-start"
                alignItems={"center"}
                flexWrap={"nowrap"}
                width={"100%"}
              >
                <Link
                  to={
                    item.address
                      ? item.address.startsWith("stake")
                        ? details.stake(item.address)
                        : details.address(item.address)
                      : ""
                  }
                  style={{ width: "100%" }}
                >
                  <Box
                    data-testid="transactionMetadata.summary.walletValue"
                    color={(theme) => theme.palette.primary.main}
                    fontWeight="bold"
                    fontFamily={"var(--font-family-text)"}
                    fontSize="14px"
                  >
                    <DynamicEllipsisText value={item.address} isCopy isTooltip />
                  </Box>
                </Link>
              </Box>
            </Box>
          </Box>
        </GridItem>
      </Grid>

      {/* ADA sent / received */}
      <Grid
        size={colSize}
        sx={{
          display: "flex",
          alignItems: "center",
          height: "fit-content"
        }}
      >
        <WrapItemsInfo
          paddingX={2}
          sx={{ width: "-webkit-fill-available" }}
        >
          <Icon
            src={
              item.value > 0
                ? theme.isDark ? ArrowUpDarkIcon : ArrowUpIcon
                : theme.isDark ? ArrowDownDarkIcon : ArrowDownIcon
            }
            height={heightImg}
            alt="send icon"
          />
          <Box display={"flex"} flexDirection={"column"} justifyContent={"center"}>
            <TitleText data-testid="transactionMetadata.summary.adaTitle">
              {type === "down" ? `${t("tab.adaSent")}` : `${t("tab.adaReceived")}`}
            </TitleText>
            {item.value !== 0 && (
              <Box display="flex" alignItems="center" sx={{ height: `${height}px` }}>
                <ValueText data-testid="transactionMetadata.summary.adaValue">
                  {type === "down"
                    ? `${formatADAFull(item.value).replace("-", "")}`
                    : `+${formatADAFull(item.value)}`}
                  <Box component={ADAicon} ml={1} display={"inline"} />
                </ValueText>
              </Box>
            )}
          </Box>
        </WrapItemsInfo>
      </Grid>

      {/* Tokens Sent — only render when there are tokens */}
      {tokensSent.length > 0 && (
        <Grid
          size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
          sx={{ display: "flex", alignItems: "center", height: "fit-content" }}
        >
          <WrapTokensInfo paddingX={2} sx={{ width: "-webkit-fill-available" }}>
            <Box display={"flex"}>
              <Icon
                src={theme.isDark ? ArrowDownDarkIcon : ArrowDownIcon}
                height={heightImg}
                alt="send icon"
              />
              <Box display={"flex"} flexDirection={"column"} justifyContent={"center"}>
                <TitleText data-testid="transactionMetadata.summary.tokensSentTitle">
                  {t("tab.tokensSent")}
                </TitleText>
                <Box display="flex" alignItems="center" sx={{ height: `${height}px` }}>
                  <ValueText data-testid="transactionMetadata.summary.tokensSentValue" alignSelf={"flex-start"}>
                    {tokensSent.length === 1
                      ? formatNumberDivByDecimals(
                          Math.abs(tokensSent[0]?.assetQuantity || 0),
                          tokensSent[0]?.metadata?.decimals || 0
                        )
                      : t("tab.multiple")}
                  </ValueText>
                </Box>
              </Box>
            </Box>
            {tokensSent.length === 1 && (
              <Box display={"flex"} alignItems={"center"} mt={1}>
                <TokenLink
                  token={tokensSent[0]}
                  isSummary={true}
                  truncateAddress={matches ? { firstPart: 8, lastPart: 6 } : undefined}
                  isSuccess={!isFailed}
                  sxBox={{ flexWrap: "nowrap", minWidth: matches ? "160px" : "100%" }}
                  sxTokenName={{ minWidth: matches ? "100px" : "165px" }}
                  sx={{ minWidth: matches ? "160px" : "100%", background: (theme) => theme.palette.primary[100] }}
                  hideValue
                />
              </Box>
            )}
            {tokensSent.length > 1 && (
              <Box display={"flex"} alignItems={"center"} mt={1}>
                <DropdownTokens
                  isSummary={true}
                  tokens={tokensSent}
                  type={type}
                  hideInputLabel
                  isSuccess={!isFailed}
                  sx={{ minWidth: "100%", background: (theme) => theme.palette.primary[100] }}
                />
              </Box>
            )}
          </WrapTokensInfo>
        </Grid>
      )}

      {/* Tokens Received — only render when there are tokens */}
      {tokensReceived.length > 0 && (
        <Grid
          size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
          sx={{ display: "flex", alignItems: "center", height: "fit-content" }}
        >
          <WrapTokensInfo paddingX={2} sx={{ width: "-webkit-fill-available" }}>
            <Box display={"flex"}>
              <Icon
                src={theme.isDark ? ArrowUpDarkIcon : ArrowUpIcon}
                height={heightImg}
                alt="send icon"
              />
              <Box display={"flex"} flexDirection={"column"} justifyContent={"center"}>
                <TitleText data-testid="transactionMetadata.summary.tokensReceivedTitle">
                  {t("tab.tokensReceived")}
                </TitleText>
                <Box display="flex" alignItems="center" sx={{ height: `${height}px` }}>
                  <ValueText data-testid="transactionMetadata.summary.tokensReceivedValue" alignSelf={"flex-start"}>
                    {tokensReceived.length === 1
                      ? `+${formatNumberDivByDecimals(
                          tokensReceived[0]?.assetQuantity || 0,
                          tokensReceived[0]?.metadata?.decimals || 0
                        )}`
                      : t("tab.multiple")}
                  </ValueText>
                </Box>
              </Box>
            </Box>
            {tokensReceived.length === 1 && (
              <Box display={"flex"} alignItems={"center"} mt={1}>
                <TokenLink
                  token={tokensReceived[0]}
                  isSummary={true}
                  isSuccess={!isFailed}
                  truncateAddress={matches ? { firstPart: 8, lastPart: 6 } : undefined}
                  sxBox={{ flexWrap: "nowrap", minWidth: matches ? "160px" : "100%" }}
                  sxTokenName={{ minWidth: matches ? "100px" : "165px" }}
                  sx={{ minWidth: matches ? "160px" : "100%", background: (theme) => theme.palette.primary[100] }}
                  hideValue
                />
              </Box>
            )}
            {tokensReceived.length > 1 && (
              <Box display={"flex"} alignItems={"center"} mt={1}>
                <DropdownTokens
                  tokens={tokensReceived}
                  type={type}
                  isSummary={true}
                  hideInputLabel
                  isSuccess={!isFailed}
                  sx={{
                    minWidth: "100%",
                    background: (theme) => theme.palette.primary[100],
                    color: theme.palette.secondary.main
                  }}
                />
              </Box>
            )}
          </WrapTokensInfo>
        </Grid>
      )}
    </WrapContainerGrid>
  );
};

interface SummaryProps {
  data: TransactionDetail["summary"] | null;
  isFailed?: boolean;
}
const Summary: React.FC<SummaryProps> = ({ data, isFailed }) => {
  return (
    <Box>
      {data?.stakeAddress?.map((tx, key) => {
        const type = tx.value >= 0 ? "up" : "down";
        return <SummaryItems key={key} item={tx} type={type} isFailed={isFailed} />;
      })}
    </Box>
  );
};

export default Summary;
