import { useCallback, useEffect, useRef, useState } from "react";
import axios, { AxiosError, AxiosInstance } from "axios";
import qs from "qs";

import { authAxios, defaultAxios } from "../utils/axios";
import { cleanObject } from "../utils/helper";

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
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [statusError, setStatusError] = useState<number | undefined>(undefined);
  const [query, setQuery] = useState<Params>(cleanObject(params));
  const lastFetch = useRef<number>();
  const lastKey = useRef<number | string | undefined>(key);

  return {
    data,
    loading,
    error,
    statusError,
    initialized,
    total,
    totalPage,
    currentPage,
    refresh: () => {},
    update: setData,
    lastUpdated: lastFetch.current,
    query,
    isDataOverSize
  };
};

export default useFetchList;
