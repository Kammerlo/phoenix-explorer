import { useCallback, useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import qs from "qs";

import { authAxios, defaultAxios } from "src/commons/utils/axios";
import { cleanObject } from "src/commons/utils/helper";

interface Params {
  page?: number;
  size?: number;
  [key: string]: string | number | Date | string[] | boolean | undefined;
}

export interface FetchReturnType<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  statusError: number | undefined;
  initialized: boolean;
  total: number;
  totalPage: number;
  currentPage: number;
  isDataOverSize?: boolean | null;
  refresh: () => void;
  update: (callback: (data: T[]) => T[]) => void;
  lastUpdated?: number;
  query: Params;
}

const useFetchList = <T>(
  url: string,
  params: Params = {},
  isAuth?: boolean,
  key?: number | string
): FetchReturnType<T> => {
  const [data, setData] = useState<T[]>([]);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(params.page ?? 0);
  const [totalPage, setTotalPage] = useState(0);
  const [isDataOverSize, setIsDataOverSize] = useState<boolean | null>(null);
  const [total, setTotal] = useState(0);
  const [statusError, setStatusError] = useState<number | undefined>(undefined);
  const [query] = useState<Params>(cleanObject(params));
  const lastFetch = useRef<number>();

  const cleaned = cleanObject(params);
  const signature = JSON.stringify({ url, params: cleaned, key });

  const fetchData = useCallback(async () => {
    if (!url) {
      setInitialized(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setStatusError(undefined);
    const client = isAuth ? authAxios : defaultAxios;
    try {
      const qstr = qs.stringify(cleaned, { addQueryPrefix: true, skipNulls: true });
      const res = await client.get(`${url}${qstr}`);
      const body = res?.data;
      if (Array.isArray(body)) {
        setData(body);
        setTotal(body.length);
        setTotalPage(1);
        setCurrentPage(0);
      } else if (body && typeof body === "object") {
        const list = body.data ?? body.items ?? body.content ?? [];
        setData(Array.isArray(list) ? list : []);
        setTotal(body.total ?? body.totalElements ?? list.length ?? 0);
        setTotalPage(body.totalPage ?? body.totalPages ?? 0);
        setCurrentPage(body.currentPage ?? body.number ?? (cleaned.page as number) ?? 0);
        setIsDataOverSize(body.isDataOverSize ?? null);
      } else {
        setData([]);
      }
      lastFetch.current = Date.now();
    } catch (e) {
      const err = e as AxiosError;
      setError(err?.message || "Request failed");
      setStatusError(err?.response?.status);
      setData([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    statusError,
    initialized,
    total,
    totalPage,
    currentPage,
    refresh: fetchData,
    update: (cb) => setData((prev) => cb(prev)),
    lastUpdated: lastFetch.current,
    query,
    isDataOverSize
  };
};

export default useFetchList;
