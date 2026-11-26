"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Clock, Eye, Users } from "lucide-react";
import { TestItem, TestStatus } from "@/types/test-and-practice";
import { DifficultyLevel } from "@/types/question";
import { catalogApi } from "@/lib/api";
import { vietnameseDifficulty } from "@/lib/ui-labels";
import { Pagination } from "@/components/ui/pagination";
import { useServerPagination } from "@/hooks/use-server-pagination";

const STYLES = {
  pageContainer: "mx-auto max-w-7xl space-y-6 pb-12",
  tableCard:
    "overflow-hidden rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 shadow-sm",
  thead:
    "border-b border-gray-100 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500",
  trHover: "transition-colors hover:bg-gray-50/80 cursor-pointer",

  createBtn:
    "inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c93f3a] active:scale-[0.98]",

  difficultyBadges: {
    easy: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    medium: "bg-amber-50 text-amber-700 border-amber-200/60",
    hard: "bg-rose-50 text-rose-700 border-rose-200/60",
  },
  statusBadges: {
    published: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
      dot: "bg-emerald-500",
      label: "Đã xuất bản",
    },
    approved: {
      bg: "bg-sky-50 text-sky-700 border-sky-200/60",
      dot: "bg-sky-500",
      label: "Đã duyệt",
    },
    draft: {
      bg: "bg-gray-100 text-gray-600 border-gray-200",
      dot: "bg-gray-400",
      label: "Bản nháp",
    },
  },
};

function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  const formatted = level ? vietnameseDifficulty(level) : "Trung bình";
  const badgeStyle =
    STYLES.difficultyBadges[level] || STYLES.difficultyBadges.medium;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${badgeStyle}`}
    >
      {formatted}
    </span>
  );
}

function StatusBadge({ status }: { status: TestStatus }) {
  const current = STYLES.statusBadges[status] || STYLES.statusBadges.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${current.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
}

export default function TestsPage() {
  const router = useRouter();

  const loadPage = useCallback(
    (page: number, page_size: number) =>
      catalogApi.page<TestItem>("quizzes", { page, page_size }),
    [],
  );
  const testPaging = useServerPagination(loadPage);
  const { pageItems: tests, isLoading, error } = testPaging;

  const handleCreateTest = () => {
    router.push("/content-manager/testsandpractice/builder");
  };

  const handleRowClick = (quizId: string) => {
    router.push(`/content-manager/quizzes/${quizId}/builder`);
  };

  return (
    <div className={STYLES.pageContainer}>
      {/* Header & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Bài kiểm tra
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Bài kiểm tra được tạo từ ngân hàng câu hỏi C#.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreateTest}
            className={STYLES.createBtn}
          >
            <Plus className="h-4 w-4" />
            Tạo bài kiểm tra
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className={STYLES.tableCard}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className={STYLES.thead}>
              <tr>
                <th scope="col" className="py-4 pl-6 pr-4">
                  Bài kiểm tra
                </th>
                <th scope="col" className="px-4 py-4">
                  Khóa học
                </th>
                <th scope="col" className="px-4 py-4">
                  Câu hỏi
                </th>
                <th scope="col" className="px-4 py-4">
                  Thời lượng
                </th>
                <th scope="col" className="px-4 py-4">
                  Độ khó
                </th>
                <th scope="col" className="px-4 py-4">
                  Trạng thái
                </th>
                <th scope="col" className="py-4 pl-4 pr-6">
                  Lượt làm bài
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    Đang tải bài kiểm tra...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-rose-600"
                  >
                    <p className="font-semibold">Không tải được bài kiểm tra</p>
                    <p className="mt-1 text-xs text-rose-500">{error}</p>
                    <button
                      type="button"
                      onClick={testPaging.refresh}
                      className="mt-4 rounded-xl bg-[#F7444E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#c93f3a]"
                    >
                      Thử lại
                    </button>
                  </td>
                </tr>
              ) : tests.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    Chưa có bài test nào trong database. Hãy bấm &quot;Tạo bài
                    kiểm tra&quot; để tạo mới.
                  </td>
                </tr>
              ) : (
                testPaging.pageItems.map((test) => (
                  <tr
                    key={test.id}
                    onClick={() => handleRowClick(test.id)}
                    className={STYLES.trHover}
                  >
                    <td className="max-w-md py-4 pl-6 pr-4">
                      <p className="font-semibold text-gray-900 line-clamp-1">
                        {test.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Created {test.created_at?.slice(0, 10)}
                      </p>
                      <Link
                        href={`/content-manager/quizzes/${test.id}/preview`}
                        onClick={(event) => event.stopPropagation()}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
                      >
                        <Eye className="h-3 w-3" /> Xem trước
                      </Link>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-gray-700 font-medium text-xs sm:text-sm">
                      {test.course_title}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-gray-600 font-medium">
                      {test.questions_count === null ? (
                        <span className="text-xs text-amber-600">
                          Chưa tải được
                        </span>
                      ) : (
                        test.questions_count
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {test.duration_minutes === null
                          ? "Không giới hạn"
                          : `${test.duration_minutes} min`}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <DifficultyBadge level={test.difficulty} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <StatusBadge status={test.status} />
                    </td>

                    <td className="whitespace-nowrap py-4 pl-4 pr-6 text-gray-600">
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        {test.attempts_count}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang danh sách bài kiểm tra */}
        {!isLoading && !error && (
          <Pagination
            page={testPaging.page}
            pageSize={testPaging.pageSize}
            totalItems={testPaging.totalItems}
            onPageChange={testPaging.setPage}
          />
        )}
      </div>
    </div>
  );
}
