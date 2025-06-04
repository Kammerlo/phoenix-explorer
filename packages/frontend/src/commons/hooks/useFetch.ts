import axios, { AxiosError, AxiosInstance } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

import { defaultAxios, authAxios } from "../utils/axios";

interface FetchReturnType<T> {
  data: T | null;
  update: (data: T | null) => void;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  refresh: () => void;
  lastUpdated?: number;
  statusError?: number | undefined;
}

const useFetch = <T>(url: string, initial?: T, isAuth?: boolean, key?: number | string): FetchReturnType<T> => {
  const [data, setData] = useState<T | null>(initial || null);
  const [initialized, setInitialized] = useState<boolean>(!!initial || false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<number | undefined>(undefined);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const lastFetch = useRef<number>();
  const lastKey = useRef<number | string | undefined>(key);

  return {
    data,
    loading,
    error,
    initialized,
    refresh: () => {},
    lastUpdated: lastFetch.current,
    statusError,
    update: setData
  };
};

export default useFetch;
