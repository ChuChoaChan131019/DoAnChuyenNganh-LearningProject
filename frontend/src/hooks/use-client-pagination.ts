"use client";

import { useMemo, useState } from "react";

type Options = {
  pageSize?: number;
  resetKey?: string;
};

export function useClientPagination<T>(
  items: readonly T[],
  options: Options = {},
) {
  const pageSize = Math.max(1, options.pageSize ?? 10);

  const resetKey = options.resetKey ?? "";

  const [state, setState] = useState({
    page: 1,
    key: resetKey,
  });

  const totalItems = items.length;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Tự về trang 1 khi bộ lọc thay đổi.
  const page = state.key === resetKey ? Math.min(state.page, totalPages) : 1;

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const setPage = (nextPage: number) => {
    setState({
      key: resetKey,
      page: Math.min(Math.max(1, nextPage), totalPages),
    });
  };

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    pageItems,
    setPage,
  };
}
