export const routers = {
  HOME: "/",
  BLOCK_LIST: "/blocks",
  BLOCK_DETAIL: "/block/:blockId",
  TRANSACTION_LIST: "/transactions",
  TRANSACTION_DETAIL: "/transaction/:trxHash",
  EPOCH_LIST: "/epochs",
  EPOCH_DETAIL: "/epoch/:epochId",
  POOLS: "/pools",
  DREPS: "/dreps",
  POOL_DETAIL: "/pool/:poolId",
  ADDRESS_DETAIL: "/address/:address",
  TOKEN_LIST: "/tokens",
  TOKEN_DETAIL: "/token/:tokenId",
  STAKE_DETAIL: "/stake-address/:stakeId",
  CONTRACT_DETAIL: "/contracts/:address",
  SMART_CONTRACT: "/smart-contract/:address",
  NATIVE_SCRIPTS_AND_SC: "/native-scripts-sc",
  NATIVE_SCRIPT_DETAIL: "/native-script/:id",
  POLICY_DETAIL: "/policy/:policyId",
  STAKING_LIFECYCLE: "/staking-lifecycle/:tab?",
  DELEGATOR_LIFECYCLE: "/staking-lifecycle/delegator/:stakeId/:mode?/:tab?/:txHash?",
  SPO_LIFECYCLE: "/staking-lifecycle/spo/:poolId/:mode?/:tab?/:txHash?",
  REPORT_GENERATED_STAKING_DETAIL: "/staking-lifecycle/staking-report-generated/:reportId",
  REPORT_GENERATED_POOL_DETAIL: "/staking-lifecycle/pool-report-generated/:reportId",
  GOVERNANCE_ACTION_LIST: "/governance-actions",
  GOVERNANCE_ACTION: "/governance-action/:txHash/:index",
  CONSTITUIONAL_COMMITTEES: "/constitutional-committees",
  CONSTITUIONAL_COMMITTEE_DETAIL: "/constitutional-committee/:CCid",
  DREP_DETAILS: "/drep/:drepId",
  NOT_FOUND: "/*"
} as const;

export const details = {
  block: (blockId?: number | string) => routers.BLOCK_DETAIL.replace(":blockId", `${blockId ?? ""}`),
  transaction: (trxHash?: string) => routers.TRANSACTION_DETAIL.replace(":trxHash", trxHash ?? ""),
  epoch: (epochId?: number | string) => routers.EPOCH_DETAIL.replace(":epochId", `${epochId ?? ""}`),
  delegation: (poolId?: number | string) => routers.POOL_DETAIL.replace(":poolId", `${poolId}`),
  address: (address?: string) => routers.ADDRESS_DETAIL.replace(":address", address ?? ""),
  token: (tokenId?: string) => routers.TOKEN_DETAIL.replace(":tokenId", tokenId ?? ""),
  stake: (stakeId?: string) => routers.STAKE_DETAIL.replace(":stakeId", stakeId ?? ""),
  policyDetail: (policyId?: string) => routers.POLICY_DETAIL.replace(":policyId", policyId ?? ""),
  contract: (address?: string) => routers.CONTRACT_DETAIL.replace(":address", address ?? ""),
  smartContract: (address?: string) => routers.SMART_CONTRACT.replace(":address", address ?? ""),
  nativeScriptsAndSC: () => routers.NATIVE_SCRIPTS_AND_SC,
  nativeScriptDetail: (id?: string) => routers.NATIVE_SCRIPT_DETAIL.replace(":id", id ?? ""),
  staking: (stakeId: string, mode = "timeline", tab = "registration", txHash?: string) =>
    routers.DELEGATOR_LIFECYCLE.replace(":stakeId", stakeId)
      .replace(":mode?", mode)
      .replace(":tab?", tab)
      .replace(":txHash?", txHash ?? ""),
  spo: (poolId: string, mode = "timeline", tab = "registration", txHash?: string) =>
    routers.SPO_LIFECYCLE.replace(":poolId", poolId)
      .replace(":mode?", mode)
      .replace(":tab?", tab)
      .replace(":txHash?", txHash ?? ""),
  generated_staking_detail: (reportId: string) =>
    routers.REPORT_GENERATED_STAKING_DETAIL.replace(":reportId", reportId),
  generated_pool_detail: (reportId: string) =>
    routers.REPORT_GENERATED_POOL_DETAIL.replace(":reportId", reportId),
  drep: (drepId: string) => routers.DREP_DETAILS.replace(":drepId", drepId ?? ""),
  constitutionalCommittees: () => routers.CONSTITUIONAL_COMMITTEES,
  governanceActionList: () => routers.GOVERNANCE_ACTION_LIST,
  governanceAction: (txHash: string, index: string) =>
    routers.GOVERNANCE_ACTION.replace(":txHash", txHash).replace(":index", index),
  constitutionalCommitteeDetail: (id: string) =>
    routers.CONSTITUIONAL_COMMITTEE_DETAIL.replace(":CCid", id ?? "")
};

export const listRouters = [
  routers.BLOCK_LIST,
  routers.TRANSACTION_LIST,
  routers.EPOCH_LIST,
  routers.POOLS,
  routers.TOKEN_LIST
];
