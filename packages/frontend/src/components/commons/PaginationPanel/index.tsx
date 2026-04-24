import { ApiReturnType } from "@shared/APIReturnType";

export interface PaginationPanelProps {
  page?: number;
  size?: number;
  total?: number;
  onChange?: (page: number, size: number) => void;
  hideLastPage?: boolean;
  handleCloseDetailView?: () => void;
}

export const buildPaginationConfig = <T,>(
  fetchData: ApiReturnType<T[]> | undefined,
  fallbackSize: number,
  onChange: (page: number, size: number) => void,
  extras?: Partial<PaginationPanelProps>
): PaginationPanelProps => ({
  page: fetchData?.currentPage || 0,
  size: fetchData?.pageSize || fallbackSize,
  total: fetchData?.total || 0,
  onChange,
  hideLastPage: true,
  ...extras
});
