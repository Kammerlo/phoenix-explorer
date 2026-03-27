export type SearchResultType =
  | "transaction"
  | "block"
  | "epoch"
  | "address"
  | "stake"
  | "pool"
  | "token"
  | "policy"
  | "drep"
  | "gov_action";

export interface SearchResult {
  type: SearchResultType;
  /** Primary identifier — hash, bech32 id, or number string */
  id: string;
  /** Secondary identifier — cert index for gov_action */
  extraId?: string;
  /** Optional human-readable label (pool ticker, token name, block height) */
  label?: string;
}
