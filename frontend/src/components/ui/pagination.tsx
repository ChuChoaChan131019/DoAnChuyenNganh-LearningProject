"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalPages <= 1) return null;

  const currentPage = Math.min(Math.max(1, page), totalPages);

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const first = Math.max(1, Math.min(currentPage - 2, totalPages - 4));

  const last = Math.min(totalPages, first + 4);

  const pages = Array.from(
    { length: last - first + 1 },
    (_, index) => first + index,
  );

  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-4"
    >
      <p className="text-xs text-slate-500">
        Hiển thị {start}–{end} / {totalItems}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Trang trước"
          className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {first > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="h-9 min-w-9 rounded-lg border border-slate-200 text-sm"
            >
              1
            </button>

            {first > 2 && <span className="px-1 text-slate-400">...</span>}
          </>
        )}

        {pages.map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => onPageChange(number)}
            aria-label={`Trang ${number}`}
            aria-current={number === currentPage ? "page" : undefined}
            className={`h-9 min-w-9 rounded-lg border px-2 text-sm font-semibold ${
              number === currentPage
                ? "border-[#145a68] bg-[#145a68] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {number}
          </button>
        ))}

        {last < totalPages && (
          <>
            {last < totalPages - 1 && (
              <span className="px-1 text-slate-400">...</span>
            )}

            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="h-9 min-w-9 rounded-lg border border-slate-200 text-sm"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Trang tiếp theo"
          className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}