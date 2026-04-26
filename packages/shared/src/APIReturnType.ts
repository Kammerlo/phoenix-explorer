export interface ApiReturnType<T> {
  data: T | null;
  error?: string | null;
  total?: number;
  /** Set when `total` cannot be known cheaply (e.g. Blockfrost-backed lists). */
  totalUnknown?: boolean;
  totalPage?: number;
  currentPage?: number;
  lastUpdated: number;
  pageSize?: number;
}
