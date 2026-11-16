"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  UserRound,
} from "lucide-react";
import { adminAccountsApi } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import {
  AccountPanel,
  accountErrorMessage,
  accountRoleLabels,
} from "@/components/admin/account-panel";
import type { AdminAccount, AdminAccountPage } from "@/types/admin-account";

export default function AdminAccountsPage() {
  const [draftSearch, setDraftSearch] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    status: "all",
    offset: 0,
  });
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    page?: AdminAccountPage;
    error?: string;
  } | null>(null);
  const [panel, setPanel] = useState<{
    account: AdminAccount | null;
    selfId?: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const key = JSON.stringify({ ...filters, revision });
  const loading = result?.key !== key;
  const page = loading ? undefined : result?.page;
  const error = loading ? undefined : result?.error;

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setFilters((old) =>
          old.search === draftSearch.trim()
            ? old
            : { ...old, search: draftSearch.trim(), offset: 0 },
        ),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [draftSearch]);
  useEffect(() => {
    let active = true;
    const query = JSON.parse(key) as typeof filters;
    adminAccountsApi
      .list(query)
      .then((value) => {
        if (active) setResult({ key, page: value });
      })
      .catch((caught: unknown) => {
        if (active) setResult({ key, error: accountErrorMessage(caught) });
      });
    return () => {
      active = false;
    };
  }, [key]);

  const open = (account: AdminAccount | null) => {
    setPanel({ account, selfId: getSession().user?.id });
    setNotice("");
  };
  const saved = (text: string) => {
    setPanel(null);
    setNotice(text);
    setFilters((old) => ({ ...old, offset: 0 }));
    setRevision((old) => old + 1);
  };
  const stats = page?.stats;
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#157985]">
            Quản lý người dùng
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tài khoản
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#637981]">
            Tìm tài khoản, cập nhật thông tin và quản lý quyền truy cập hệ
            thống.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-label="Làm mới danh sách"
            disabled={loading}
            onClick={() => setRevision((old) => old + 1)}
            className="rounded-xl border border-[#DFE6DF] bg-white px-3 py-2 disabled:opacity-40"
          >
            <RefreshCw className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => open(null)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-bold text-white hover:bg-[#db3440]"
          >
            <Plus className="size-4 shrink-0" />
            Tạo tài khoản quản lý nội dung
          </button>
        </div>
      </div>
      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <Check className="size-4" />
          {notice}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Tổng tài khoản", value: stats?.total, Icon: Users },
          { label: "Đang hoạt động", value: stats?.active, Icon: UserRound },
          {
            label: "Đã vô hiệu hóa",
            value: stats?.disabled,
            Icon: ShieldCheck,
          },
        ].map(({ label, value, Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-[#DFE6DF] bg-white p-5"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#637981]">
              <Icon className="size-4" />
              {label}
            </div>
            <p className="mt-3 text-3xl font-bold">{value ?? "—"}</p>
          </div>
        ))}
      </div>
      <section
        aria-label="Danh sách tài khoản"
        className="overflow-hidden rounded-2xl border border-[#DFE6DF] bg-white"
      >
        <div className="border-b border-[#DFE6DF] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Danh sách tài khoản</h2>
            <span className="text-sm text-[#637981]">
              {page ? `${page.total} kết quả` : "—"}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px]">
            <label className="relative">
              <span className="sr-only">Tìm theo tên hoặc email</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#637981]" />
              <input
                value={draftSearch}
                maxLength={100}
                onChange={(e) => setDraftSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc email..."
                className="h-11 w-full rounded-xl border border-[#DFE6DF] pl-10 pr-3 text-sm outline-none focus:border-[#157985]"
              />
            </label>
            <select
              aria-label="Lọc vai trò"
              value={filters.role}
              onChange={(e) =>
                setFilters((old) => ({
                  ...old,
                  role: e.target.value,
                  offset: 0,
                }))
              }
              className="h-11 rounded-xl border border-[#DFE6DF] bg-white px-3 text-sm"
            >
              <option value="all">Mọi vai trò</option>
              {Object.entries(accountRoleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Lọc trạng thái"
              value={filters.status}
              onChange={(e) =>
                setFilters((old) => ({
                  ...old,
                  status: e.target.value,
                  offset: 0,
                }))
              }
              className="h-11 rounded-xl border border-[#DFE6DF] bg-white px-3 text-sm"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="disabled">Vô hiệu hóa</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div
            role="status"
            className="flex min-h-48 items-center justify-center gap-2 text-sm text-[#637981]"
          >
            <Loader2 className="size-4 animate-spin" />
            Đang tải tài khoản...
          </div>
        ) : error ? (
          <div role="alert" className="space-y-3 p-6 text-sm text-rose-700">
            <p className="flex items-center gap-2">
              <AlertCircle className="size-4" />
              {error}
            </p>
            <button
              type="button"
              onClick={() => setRevision((old) => old + 1)}
              className="font-semibold underline"
            >
              Thử lại
            </button>
          </div>
        ) : page?.items.length ? (
          <>
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_130px_110px_24px] gap-4 border-b border-[#DFE6DF] bg-[#F7F8F3] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#637981] md:grid">
              <span>Người dùng</span>
              <span>Vai trò</span>
              <span>Trạng thái</span>
              <span>Ngày tạo</span>
              <span />
            </div>
            <div className="divide-y divide-[#DFE6DF]">
              {page.items.map((account) => (
                <button
                  type="button"
                  key={account.id}
                  onClick={() => open(account)}
                  className="grid w-full items-center gap-3 px-5 py-4 text-left hover:bg-[#F7F8F3] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_130px_110px_24px] md:gap-4"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4F3] text-sm font-bold text-[#157985]">
                      {(account.full_name || account.email)
                        .trim()
                        .split(" ")
                        .at(-1)?.[0]
                        ?.toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {account.full_name || "Chưa có họ tên"}
                      </span>
                      <span className="block truncate text-xs text-[#637981]">
                        {account.email}
                      </span>
                    </span>
                  </span>
                  <span className="text-sm text-[#637981]">
                    {accountRoleLabels[account.role]}
                  </span>
                  <span
                    className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${account.disabled_at ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
                  >
                    {account.disabled_at ? "Vô hiệu hóa" : "Hoạt động"}
                  </span>
                  <span className="text-sm text-[#637981]">
                    {new Date(account.created_at).toLocaleDateString("vi-VN")}
                  </span>
                  <ArrowRight className="hidden size-4 text-[#637981] md:block" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-[#637981]">
            <Search className="size-7 text-[#78BCC4]" />
            Không có tài khoản phù hợp.
          </div>
        )}
        {page && (page.total > 20 || filters.offset > 0) && (
          <div className="flex items-center justify-between border-t border-[#DFE6DF] px-5 py-3 text-xs text-[#637981]">
            <span>
              {page.total
                ? `${Math.min(filters.offset + 1, page.total)}–${Math.min(filters.offset + 20, page.total)} / ${page.total}`
                : "0 kết quả"}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Trang trước"
                disabled={filters.offset === 0}
                onClick={() =>
                  setFilters((old) => ({
                    ...old,
                    offset: Math.max(0, old.offset - 20),
                  }))
                }
                className="rounded-lg border p-2 disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Trang sau"
                disabled={filters.offset + 20 >= page.total}
                onClick={() =>
                  setFilters((old) => ({ ...old, offset: old.offset + 20 }))
                }
                className="rounded-lg border p-2 disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </section>
      {panel && (
        <AccountPanel
          account={panel.account}
          selfId={panel.selfId}
          onClose={() => setPanel(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}
