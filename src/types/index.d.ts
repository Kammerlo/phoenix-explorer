type FilterParams =
  | "all"
  | "epochs"
  | "blocks"
  | "txs"
  | "tokens"
  | "stake-keys"
  | "addresses"
  | "contract"
  | "delegations/pool-detail-header"
  | "lifecycle"
  | "policies"
  | "dreps"
  | "delegations/pool-list?search="
  | "ADAHanlde";
interface SearchParams {
  filter?: FilterParams;
  search?: string;
}

type NETWORKS = import("../commons/utils/constants").NETWORKS;

type RootState = import("../stores/types").RootState;
