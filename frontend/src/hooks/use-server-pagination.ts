"use client";

import { useCallback, useEffect, useState } from "react";
import type { PageResponse } from "@/types/pagination";

export function useServerPagination<T>(
  load: (page: number, pageSize: number) => Promise<PageResponse<T>>,
  {
    pageSize = 10,
    resetKey = "",
    keepPreviousData = false,
  }: { pageSize?: number; resetKey?: string; keepPreviousData?: boolean } = {},
) {
  const [position, setPosition] = useState({ key: resetKey, page: 1 });
  const [revision, setRevision] = useState(0);
  if (position.key !== resetKey) setPosition({ key: resetKey, page: 1 });
  const page = position.key === resetKey ? position.page : 1;
  const scope = JSON.stringify([resetKey, page, pageSize]);
  const requestKey = JSON.stringify([resetKey, page, pageSize, revision]);
  const [result, setResult] = useState<{
    key: string;
    scope?: string;
    loader?: typeof load;
    data?: PageResponse<T>;
    error?: string;
  }>({ key: "" });

  useEffect(() => {
    let active = true;
    void load(page, pageSize).then(
      (data) => {
        if (!active) return;
        // A deletion or publication can remove the last row on the last page.
        const lastPage = Math.max(1, data.total_pages);
        if (page > lastPage) {
          setPosition({ key: resetKey, page: lastPage });
          return;
        }
        setResult({ key: requestKey, scope, loader: load, data });
      },
      (error: unknown) => {
        if (active)
          setResult({
            key: requestKey,
            scope,
            loader: load,
            error:
              error instanceof Error ? error.message : "Không thể tải dữ liệu.",
          });
      },
    );
    return () => {
      active = false;
    };
  }, [load, page, pageSize, resetKey, requestKey, scope]);

  const setPage = (nextPage: number) =>
    setPosition({ key: resetKey, page: Math.max(1, nextPage) });
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const current = result.key === requestKey && result.loader === load;
  const visible =
    current ||
    (keepPreviousData &&
      result.scope === scope &&
      result.loader === load &&
      !!result.data);
  return {
    page,
    pageSize,
    setPage,
    refresh,
    pageItems: visible ? (result.data?.items ?? []) : [],
    totalItems: visible ? (result.data?.total ?? 0) : 0,
    stats: visible ? (result.data?.stats ?? {}) : {},
    isLoading: !visible,
    error: current ? (result.error ?? "") : "",
  };
}
