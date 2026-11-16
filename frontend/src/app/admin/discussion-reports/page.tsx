"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  Inbox,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { adminDiscussionReportsApi } from "@/lib/api";
import type {
  AdminDiscussionReport,
  AdminDiscussionReportPage,
  ReportDecision,
  ReportFilter,
} from "@/types/admin-discussion-report";

const LIMIT = 20;
const filters: { value: ReportFilter; label: string }[] = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "all", label: "Tất cả" },
  { value: "dismissed", label: "Đã bỏ qua" },
  { value: "hidden", label: "Đã ẩn" },
  { value: "removed", label: "Đã gỡ" },
];
const statusLabels: Record<AdminDiscussionReport["status"], string> = {
  pending: "Chờ xử lý",
  dismissed: "Đã bỏ qua",
  hidden: "Đã ẩn",
  removed: "Đã gỡ",
};
const decisions: {
  value: ReportDecision;
  label: string;
  hint: string;
  className: string;
}[] = [
  {
    value: "dismissed",
    label: "Bỏ qua",
    hint: "Đóng báo cáo, giữ nguyên nội dung",
    className: "border-[#DFE6DF] bg-white text-[#002C3E]",
  },
  {
    value: "hidden",
    label: "Ẩn nội dung",
    hint: "Không còn hiển thị cho học viên",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  {
    value: "removed",
    label: "Gỡ nội dung",
    hint: "Gỡ nội dung khỏi thảo luận",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date);
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Không thể tải dữ liệu. Vui lòng thử lại.";
}

export default function DiscussionReportsPage() {
  const [filter, setFilter] = useState<ReportFilter>("pending");
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<AdminDiscussionReportPage | null>(null);
  const [selected, setSelected] = useState<AdminDiscussionReport | null>(null);
  const [decision, setDecision] = useState<ReportDecision | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    adminDiscussionReportsApi
      .list(filter, offset, LIMIT)
      .then((result) => {
        if (!active) return;
        setPage(result);
        setError("");
        setLoading(false);
        setSelected(
          (current) =>
            result.items.find((item) => item.id === current?.id) ??
            result.items[0] ??
            null,
        );
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setPage(null);
        setSelected(null);
        setError(errorMessage(caught));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filter, offset, revision]);

  const changeFilter = (value: ReportFilter) => {
    setFilter(value);
    setOffset(0);
    setPage(null);
    setSelected(null);
    setLoading(true);
    setNotice("");
  };
  const changeOffset = (value: number) => {
    setOffset(value);
    setPage(null);
    setSelected(null);
    setLoading(true);
  };
  const chooseReport = (item: AdminDiscussionReport) => {
    setSelected(item);
    setDecision(null);
    setReason("");
    setActionError("");
    setNotice("");
  };
  const resolve = async () => {
    if (!selected || !decision || saving) return;
    const cleanReason = reason.trim();
    if (cleanReason.length < 10 || cleanReason.length > 1000) {
      setActionError("Lý do xử lý cần từ 10 đến 1000 ký tự.");
      return;
    }
    setSaving(true);
    setActionError("");
    try {
      await adminDiscussionReportsApi.resolve(
        selected.id,
        decision,
        cleanReason,
      );
      setNotice(
        `Đã xử lý báo cáo: ${decisions.find((item) => item.value === decision)?.label.toLowerCase()}.`,
      );
      setDecision(null);
      setReason("");
      setSelected(null);
      setLoading(true);
      if (filter === "pending" && page?.items.length === 1 && offset > 0)
        setOffset(Math.max(0, offset - LIMIT));
      else reload();
    } catch (caught: unknown) {
      setActionError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#157985]">
            Kiểm duyệt cộng đồng
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Báo cáo thảo luận
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#637981]">
            Xem nội dung bị báo cáo, ngữ cảnh học tập và ghi lại quyết định xử
            lý.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            reload();
          }}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#DFE6DF] bg-white px-4 text-sm font-semibold hover:bg-[#EAF4F3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#157985]"
        >
          <RefreshCw className="size-4" />
          Làm mới
        </button>
      </div>
      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <Check className="size-4" />
          {notice}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#DFE6DF] bg-white p-5">
          <div className="flex items-center gap-2 text-[#637981]">
            <Inbox className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Hàng chờ hiện tại
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold">
            {filter === "pending" && page ? page.total : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-[#DFE6DF] bg-white p-5">
          <div className="flex items-center gap-2 text-[#637981]">
            <Flag className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Đang xem
            </span>
          </div>
          <p className="mt-3 truncate text-base font-semibold">
            {selected
              ? selected.target_type === "post"
                ? "Bài đăng"
                : "Bình luận"
              : "Chưa chọn báo cáo"}
          </p>
        </div>
        <div className="rounded-2xl border border-[#DFE6DF] bg-white p-5">
          <div className="flex items-center gap-2 text-[#637981]">
            <Clock3 className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Trạng thái
            </span>
          </div>
          <p className="mt-3 truncate text-base font-semibold">
            {selected ? statusLabels[selected.status] : "—"}
          </p>
        </div>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Lọc trạng thái báo cáo"
      >
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => changeFilter(item.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${filter === item.value ? "bg-[#002C3E] text-white" : "border border-[#DFE6DF] bg-white text-[#637981] hover:text-[#002C3E]"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4" />
            {error}
          </span>
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              setLoading(true);
              reload();
            }}
          >
            Thử lại
          </button>
        </div>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
        <section
          aria-label="Danh sách báo cáo"
          className="overflow-hidden rounded-2xl border border-[#DFE6DF] bg-white"
        >
          <div className="flex items-center justify-between border-b border-[#DFE6DF] px-5 py-4">
            <h2 className="font-semibold">Danh sách báo cáo</h2>
            <span className="text-xs text-[#637981]">
              {page ? `${page.total} báo cáo` : "Đang tải"}
            </span>
          </div>
          {loading ? (
            <div
              role="status"
              className="flex min-h-48 items-center justify-center gap-2 text-sm text-[#637981]"
            >
              <Loader2 className="size-4 animate-spin" />
              Đang tải báo cáo...
            </div>
          ) : page?.items.length ? (
            <div className="divide-y divide-[#DFE6DF]">
              {page.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseReport(item)}
                  aria-pressed={selected?.id === item.id}
                  className={`w-full px-5 py-4 text-left transition-colors hover:bg-[#F7F8F3] ${selected?.id === item.id ? "bg-[#EAF4F3]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-[#157985]">
                        {item.target_type === "post" ? "Bài đăng" : "Bình luận"}{" "}
                        · {statusLabels[item.status]}
                      </span>
                      <span className="mt-1 block truncate text-sm font-semibold">
                        {item.post_title || "Bài thảo luận"}
                      </span>
                    </span>
                    <ArrowRight className="mt-1 size-4 shrink-0 text-[#637981]" />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[#637981]">
                    {item.reason}
                  </p>
                  <p className="mt-2 text-xs text-[#637981]">
                    {formatDate(item.created_at)}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-[#637981]">
              <Inbox className="size-8 text-[#78BCC4]" />
              Không có báo cáo trong trạng thái này.
            </div>
          )}
          {page && page.total > LIMIT && (
            <div className="flex items-center justify-between border-t border-[#DFE6DF] px-5 py-3 text-xs text-[#637981]">
              <span>
                {offset + 1}–{Math.min(offset + LIMIT, page.total)} /{" "}
                {page.total}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Trang trước"
                  disabled={offset === 0}
                  onClick={() => changeOffset(Math.max(0, offset - LIMIT))}
                  className="rounded-lg border p-2 disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Trang sau"
                  disabled={offset + LIMIT >= page.total}
                  onClick={() => changeOffset(offset + LIMIT)}
                  className="rounded-lg border p-2 disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </section>
        <section
          aria-label="Chi tiết báo cáo"
          className="overflow-hidden rounded-2xl border border-[#DFE6DF] bg-white"
        >
          <div className="border-b border-[#DFE6DF] px-6 py-4">
            <h2 className="font-semibold">Chi tiết & quyết định</h2>
            <p className="mt-1 text-xs text-[#637981]">
              Xem đủ ngữ cảnh trước khi xử lý.
            </p>
          </div>
          {!selected ? (
            <div className="flex min-h-64 items-center justify-center px-6 text-center text-sm text-[#637981]">
              Chọn một báo cáo để xem chi tiết.
            </div>
          ) : (
            <div className="space-y-6 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#EAF4F3] px-3 py-1 text-xs font-bold text-[#157985]">
                  {selected.target_type === "post" ? "Bài đăng" : "Bình luận"}
                </span>
                <span className="rounded-full bg-[#EDF1ED] px-3 py-1 text-xs font-semibold">
                  {statusLabels[selected.status]}
                </span>
                <span className="ml-auto text-xs text-[#637981]">
                  {formatDate(selected.created_at)}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#637981]">
                  Ngữ cảnh học tập
                </p>
                <p className="mt-2 text-base font-semibold">
                  {selected.post_title || "Không có tiêu đề bài đăng"}
                </p>
                <p className="mt-1 text-sm text-[#637981]">
                  {[selected.chapter_title, selected.lesson_title]
                    .filter(Boolean)
                    .join(" · ") || "Chưa có thông tin chương/bài học"}
                </p>
              </div>
              <div className="rounded-xl border border-[#DFE6DF] bg-[#F7F8F3] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#637981]">
                  Nội dung bị báo cáo
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                  {selected.content || "Nội dung không còn khả dụng."}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Lý do báo cáo
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-amber-950">
                  {selected.reason}
                </p>
              </div>
              {selected.status === "pending" ? (
                <div className="space-y-4 border-t border-[#DFE6DF] pt-5">
                  <h3 className="font-semibold">Quyết định xử lý</h3>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {decisions.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setDecision(item.value);
                          setActionError("");
                        }}
                        aria-pressed={decision === item.value}
                        className={`rounded-xl border px-3 py-3 text-left transition-all ${item.className} ${decision === item.value ? "ring-2 ring-[#157985] ring-offset-2" : "hover:border-[#78BCC4]"}`}
                      >
                        <span className="block text-sm font-bold">
                          {item.label}
                        </span>
                        <span className="mt-1 block text-xs opacity-75">
                          {item.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                  {decision && (
                    <div className="space-y-3 rounded-xl border border-[#DFE6DF] p-4">
                      <label
                        htmlFor="moderator-reason"
                        className="block text-sm font-semibold"
                      >
                        Lý do quyết định{" "}
                        <span className="text-rose-600">*</span>
                      </label>
                      <textarea
                        id="moderator-reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        maxLength={1000}
                        rows={4}
                        placeholder="Ghi rõ căn cứ xử lý (10–1000 ký tự)"
                        className="w-full resize-y rounded-xl border border-[#DFE6DF] bg-white px-3 py-2 text-sm outline-none focus:border-[#157985] focus:ring-2 focus:ring-[#78BCC4]/30"
                      />
                      <div className="flex justify-between text-xs text-[#637981]">
                        <span>Quyết định sẽ được lưu vào lịch sử báo cáo.</span>
                        <span>{reason.trim().length}/1000</span>
                      </div>
                      {actionError && (
                        <p role="alert" className="text-sm text-rose-700">
                          {actionError}
                        </p>
                      )}
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDecision(null);
                            setReason("");
                            setActionError("");
                          }}
                          className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-[#EDF1ED]"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={saving || reason.trim().length < 10}
                          onClick={() => void resolve()}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#002C3E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                        >
                          {saving && (
                            <Loader2 className="size-4 animate-spin" />
                          )}
                          Xác nhận{" "}
                          {decisions
                            .find((item) => item.value === decision)
                            ?.label.toLowerCase()}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t border-[#DFE6DF] pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#637981]">
                    Đã xử lý lúc {formatDate(selected.resolved_at)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {selected.moderator_reason || "Không có lý do xử lý."}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
