import { Box, Tab, Tabs, useTheme } from "@mui/material";
// @ts-ignore
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  CollateralIcon,
  ContractIcon,
  GitCommitIcon,
  InstantaneousHistoryIcon,
  MetadataIconTx,
  MintingIcon,
  RewardsDistributionIcon,
  StakeCertificates,
  SummaryIcon,
  TransactionDelegationIcon,
  UtxoIcon,
  WithdrawalIcon
} from "src/commons/resources";
import ContractsList from "src/components/Contracts";
import { CustomNumberBadge } from "src/components/commons/CustomNumberBadge";

import Collaterals from "./Collaterals";
import Delegations from "./Delegations";
import InstantaneousRewards from "./InstantaneousRewards";
import MetadataDecoder from "../MetadataDecoder";
import Minting from "./Minting";
import PoolCertificate from "./PoolCertificate";
import StakeCertificate from "./StakeCertificate";
import Summary from "./Summary";
import TransactionSignatories from "./TransactionSignatories";
import UTXO from "./UTXOs";
import Withdrawals from "./Withdrawals";
import { TitleTab } from "./styles";
import { TRANSACTION_STATUS, TransactionDetail } from "@shared/dtos/transaction.dto";

interface TransactionMetadataProps {
  data: TransactionDetail | null | undefined;
  loading: boolean;
}

interface TTab {
  key: keyof TransactionDetail;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: React.ReactNode;
  children: React.ReactNode;
}

const TransactionMetadata: React.FC<TransactionMetadataProps> = ({ data }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  const _dataProposing = data?.contracts?.map((item) => ({
    ...item,
    purpose: "PROPOSING",
    governanceAction: "Treasury Withdrawal",
    submissionDate: "03/19/2024 15:40:11",
    expireDate: "04/19/2024 15:40:11",
    proposalPolicy: "1234567443445141436541256435236342",
    governanceActionMetadata: "1111111111111111111111111111111111",
    voterType: "DRep",
    vote: "YES",
    dRepId: "12345678901234567890123456789012345678912551324456932154",
    proposalLink: "https://hornan7.github.io/proposal.txt"
  }));
  const _dataVoting = data?.contracts?.map((item) => ({
    ...item,
    purpose: "VOTING",
    governanceAction: "Treasury Withdrawal",
    submissionDate: "03/19/2024 15:40:11",
    expireDate: "04/19/2024 15:40:11",
    proposalPolicy: "1234567443445141436541256435236342",
    governanceActionMetadata: "1111111111111111111111111111111111",
    voterType: "DRep",
    vote: "YES",
    dRepId: "312413245213123456789012345678901234567890123456789125513244569321543332143543535345"
  }));
  const _data = _dataProposing?.concat(_dataVoting);
  const dataContract = _data?.concat(data?.contracts);

  const tabs: TTab[] = [
    {
      key: "summary",
      icon: SummaryIcon,
      label: <Box pl={"5px"}>{t("drawer.summary")}</Box>,
      children: <Summary data={data?.summary || null} isFailed={data?.tx.status === TRANSACTION_STATUS.FAILED} />
    },
    {
      key: "utxOs",
      icon: UtxoIcon,
      label: t("tab.utxos"),
      children: (
        <UTXO data={data?.utxOs} fee={data?.tx.fee || 0} isFailed={data?.tx.status === TRANSACTION_STATUS.FAILED} />
      )
    },
    {
      key: "contracts",
      icon: ContractIcon,
      label: (
        <Box display={"flex"} alignItems={"center"} data-testid="contract-tab">
          {t("glossary.contracts")}
          <CustomNumberBadge value={dataContract?.length} />
        </Box>
      ),
      children: <ContractsList data={dataContract} />
    },
    {
      key: "collaterals",
      icon: CollateralIcon,
      label: (
        <Box display={"flex"} alignItems={"center"}>
          {t("glossary.collateral")}
          <CustomNumberBadge
            value={
              data?.collaterals?.collateralInputResponses?.length ===
              data?.collaterals?.collateralOutputResponses?.length
                ? 1
                : data?.collaterals?.collateralInputResponses?.length
            }
          />
        </Box>
      ),
      children: <Collaterals data={data?.collaterals} />
    },
    {
      key: "withdrawals",
      icon: WithdrawalIcon,
      label: (
        <Box display={"flex"} alignItems={"center"}>
          {t("tab.withdrawal")}
          <CustomNumberBadge value={data?.withdrawals?.length} />
        </Box>
      ),
      children: <Withdrawals data={data?.withdrawals} />
    },
    {
      key: "delegations",
      icon: TransactionDelegationIcon,
      label: (
        <Box display={"flex"} alignItems={"center"}>
          {t("tab.delegations")}
          <CustomNumberBadge value={data?.delegations?.length} />
        </Box>
      ),
      children: <Delegations data={data?.delegations} />
    },
    {
      key: "mints",
      icon: MintingIcon,
      label: <Box pl={"1px"}>{t("tab.minting")}</Box>,
      children: <Minting data={data?.mints} />
    },
    {
      key: "poolCertificates",
      icon: RewardsDistributionIcon,
      label: (
        <Box display={"flex"} alignItems={"center"}>
          {t("tab.poolCertificates")}
          <CustomNumberBadge value={data?.poolCertificates?.length} />
        </Box>
      ),
      children: <PoolCertificate data={data?.poolCertificates} />
    },
    {
      key: "stakeCertificates",
      icon: StakeCertificates,
      label: (
        <Box display={"flex"} alignItems={"center"}>
          {t("tab.stakeCertificates")}
          <CustomNumberBadge value={data?.stakeCertificates?.length} />
        </Box>
      ),
      children: <StakeCertificate data={data?.stakeCertificates} />
    },
    {
      key: "instantaneousRewards",
      icon: InstantaneousHistoryIcon,
      label: (
        <Box display={"flex"} alignItems={"center"}>
          {t("glossary.instantaneousRewards")}
          <CustomNumberBadge value={data?.instantaneousRewards?.length} />
        </Box>
      ),
      children: <InstantaneousRewards data={data?.instantaneousRewards} />
    },
    {
      key: "signersInformation",
      icon: GitCommitIcon,
      label: t("tab.signersInformation"),
      children: <TransactionSignatories data={data?.signersInformation} />
    },
    {
      key: "metadata",
      icon: MetadataIconTx,
      label: <Box data-testid="metadata-tab">{t("glossary.metadata")}</Box>,
      children: <MetadataDecoder txData={data} />
    }
  ];

  const items = tabs.filter((item) => {
    if (!data) return false;
    if (item.key === "summary" || item.key === "utxOs" || item.key === "metadata") return true;
    if (item.key === "collaterals") {
      const c = data.collaterals;
      return (c?.collateralInputResponses?.length ?? 0) > 0 || (c?.collateralOutputResponses?.length ?? 0) > 0;
    }
    if (item.key === "contracts") return (dataContract?.length ?? 0) > 0;
    const value = data[item.key];
    return Array.isArray(value) ? value.length > 0 : !!value;
  });
  const safeTab = Math.min(activeTab, Math.max(0, items.length - 1));

  if (items.length === 0) return null;

  return (
    <Box mt={4}>
      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          borderRadius: "12px 12px 0 0",
          background: theme.palette.secondary[0],
          boxShadow: "0px 4px 4px rgba(0,0,0,0.05)"
        }}
      >
        <Tabs
          value={safeTab}
          onChange={(_e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": { minHeight: 64, textTransform: "none" },
            "& .MuiTabs-indicator": { backgroundColor: theme.palette.primary.main }
          }}
        >
          {items.map(({ key, icon: Icon, label }, idx) => (
            <Tab
              key={key}
              data-testid={`transactionMetadata.${key}`}
              icon={
                <Icon
                  fill={safeTab === idx ? theme.palette.primary.main : theme.palette.secondary.light}
                  style={{ width: 20, height: 20 }}
                />
              }
              iconPosition="start"
              label={<TitleTab active={+(safeTab === idx)}>{label}</TitleTab>}
              sx={{ gap: 1 }}
            />
          ))}
        </Tabs>
      </Box>
      {items.map(({ key, children }, idx) => (
        <Box
          key={key}
          role="tabpanel"
          hidden={safeTab !== idx}
          data-testid={`transactionMetadata.${key}Value`}
          sx={{
            background: theme.palette.secondary[0],
            borderRadius: "0 0 12px 12px",
            boxShadow: "0px 4px 4px rgba(0,0,0,0.05)",
            p: 3
          }}
        >
          {safeTab === idx && children}
        </Box>
      ))}
    </Box>
  );
};

export default TransactionMetadata;
