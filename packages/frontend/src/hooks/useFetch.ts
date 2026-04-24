import { useCallback, useEffect, useRef, useState } from "react";

import { defaultAxios, authAxios } from "src/commons/utils/axios";

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
  const [loading, setLoading] = useState<boolean>(!initial);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<number | undefined>(undefined);
  const [lastFetch, setLastFetch] = useState<number | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setStatusError(undefined);

    try {
      const client = isAuth ? authAxios : defaultAxios;
      const response = await client.get<T>(url, {
        signal: abortControllerRef.current.signal
      });
      setData(response.data);
      setInitialized(true);
      setLastFetch(Date.now());
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "CanceledError" || (err as { name?: string }).name === "AbortError") {
        return;
      }
      const axiosErr = err as { response?: { status?: number }; message?: string };
      setError(axiosErr.message || "Failed to fetch data");
      if (axiosErr.response?.status) {
        setStatusError(axiosErr.response.status);
      }
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  }, [url, isAuth, key]);

  useEffect(() => {
    fetchData();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    initialized,
    refresh: fetchData,
    lastUpdated: lastFetch,
    statusError,
    update: setData
  };
};

export default useFetch;
