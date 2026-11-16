"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";

type AccountRole = "learner" | "content_manager" | "admin";
type AccountStatus = "active" | "disabled";
type SampleAccount = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  joined: string;
};
type PanelMode = "view" | "create";

const samples: SampleAccount[] = [
  {
    id: "sample-1",
    name: "Nguyễn Minh Anh",
    email: "minhanh@example.com",
    role: "learner",
    status: "active",
    joined: "12/11/2026",
  },
  {
    id: "sample-2",
    name: "Trần Hà Linh",
    email: "halinh@example.com",
    role: "content_manager",
    status: "active",
    joined: "09/11/2026",
  },
  {
    id: "sample-3",
    name: "Lê Quốc Bảo",
    email: "quocbao@example.com",
    role: "learner",
    status: "disabled",
    joined: "04/11/2026",
  },
];
const roleLabels: Record<AccountRole, string> = {
  learner: "Học viên",
  content_manager: "Quản lý nội dung",
  admin: "Quản trị viên",
};

export default function AdminAccountsPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<AccountRole | "all">("all");
  const [status, setStatus] = useState<AccountStatus | "all">("all");
  const [panel, setPanel] = useState<PanelMode | null>(null);
  const [selected, setSelected] = useState<SampleAccount | null>(null);
  const [formRole, setFormRole] = useState<AccountRole>("learner");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  useEffect(() => {
    if (!panel) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [panel]);
  const visible = useMemo(
    () =>
      samples.filter((account) => {
        const matchQuery = `${account.name} ${account.email}`
          .toLocaleLowerCase("vi")
          .includes(query.trim().toLocaleLowerCase("vi"));
        return (
          matchQuery &&
          (role === "all" || account.role === role) &&
          (status === "all" || account.status === status)
        );
      }),
    [query, role, status],
  );
  const openAccount = (account: SampleAccount) => {
    setSelected(account);
    setFormName(account.name);
    setFormEmail(account.email);
    setFormRole(account.role);
    setPanel("view");
  };
  const openCreate = () => {
    setSelected(null);
    setFormName("");
    setFormEmail("");
    setFormRole("learner");
    setPanel("create");
  };

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
            Không gian xem, tìm và quản lý tài khoản theo vai trò.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F7444E] px-4 text-sm font-bold text-white hover:bg-[#db3440] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F7444E]"
        >
          <Plus className="size-4" />
          Tạo tài khoản
        </button>
      </div>
      <div className="flex items-start gap-3 rounded-2xl border border-[#78BCC4] bg-[#EAF4F3] px-5 py-4 text-sm text-[#17485A]">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong>Bản thiết kế giao diện.</strong> Danh sách dưới đây là dữ liệu
          mẫu. Chức năng quản lý tài khoản sẽ hoạt động sau khi API FR-44 được
          triển khai; các nút lưu và thay đổi trạng thái hiện chưa gửi dữ liệu.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#DFE6DF] bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#637981]">
            <Users className="size-4" />
            Tổng tài khoản
          </div>
          <p className="mt-3 text-3xl font-bold">—</p>
          <p className="mt-1 text-xs text-[#637981]">Sẽ hiển thị khi có API</p>
        </div>
        <div className="rounded-2xl border border-[#DFE6DF] bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#637981]">
            <UserRound className="size-4" />
            Đang hoạt động
          </div>
          <p className="mt-3 text-3xl font-bold">—</p>
          <p className="mt-1 text-xs text-[#637981]">Sẽ hiển thị khi có API</p>
        </div>
        <div className="rounded-2xl border border-[#DFE6DF] bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#637981]">
            <ShieldCheck className="size-4" />
            Vai trò quản trị
          </div>
          <p className="mt-3 text-3xl font-bold">3</p>
          <p className="mt-1 text-xs text-[#637981]">
            Học viên, quản lý nội dung, admin
          </p>
        </div>
      </div>
      <section className="overflow-hidden rounded-2xl border border-[#DFE6DF] bg-white">
        <div className="border-b border-[#DFE6DF] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">
                Danh sách tài khoản{" "}
                <span className="ml-2 rounded-full bg-[#EAF4F3] px-2.5 py-1 text-xs text-[#157985]">
                  Dữ liệu mẫu
                </span>
              </h2>
              <p className="mt-1 text-xs text-[#637981]">
                Mẫu bố cục và thao tác cho FR-44
              </p>
            </div>
            <span className="text-sm text-[#637981]">
              {visible.length} kết quả mẫu
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px]">
            <label className="relative">
              <span className="sr-only">Tìm theo tên hoặc email</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#637981]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên hoặc email..."
                className="h-11 w-full rounded-xl border border-[#DFE6DF] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#157985] focus:ring-2 focus:ring-[#78BCC4]/30"
              />
            </label>
            <label className="relative">
              <span className="sr-only">Lọc vai trò</span>
              <select
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as AccountRole | "all")
                }
                className="h-11 w-full appearance-none rounded-xl border border-[#DFE6DF] bg-white px-3 pr-9 text-sm outline-none focus:border-[#157985]"
              >
                <option value="all">Mọi vai trò</option>
                <option value="learner">Học viên</option>
                <option value="content_manager">Quản lý nội dung</option>
                <option value="admin">Quản trị viên</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#637981]" />
            </label>
            <label className="relative">
              <span className="sr-only">Lọc trạng thái</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as AccountStatus | "all")
                }
                className="h-11 w-full appearance-none rounded-xl border border-[#DFE6DF] bg-white px-3 pr-9 text-sm outline-none focus:border-[#157985]"
              >
                <option value="all">Mọi trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="disabled">Vô hiệu hóa</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#637981]" />
            </label>
          </div>
        </div>
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_130px_28px] gap-4 border-b border-[#DFE6DF] bg-[#F7F8F3] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#637981] md:grid">
          <span>Người dùng</span>
          <span>Vai trò</span>
          <span>Trạng thái</span>
          <span>Ngày tạo</span>
          <span />
        </div>
        {visible.length ? (
          <div className="divide-y divide-[#DFE6DF]">
            {visible.map((account) => (
              <button
                type="button"
                key={account.id}
                onClick={() => openAccount(account)}
                className="grid w-full items-center gap-3 px-5 py-4 text-left hover:bg-[#F7F8F3] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_130px_28px] md:gap-4"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4F3] text-sm font-bold text-[#157985]">
                    {account.name.split(" ").at(-1)?.[0]}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {account.name}
                    </span>
                    <span className="block truncate text-xs text-[#637981]">
                      {account.email}
                    </span>
                  </span>
                </span>
                <span className="text-sm text-[#637981]">
                  {roleLabels[account.role]}
                </span>
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${account.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                >
                  {account.status === "active" ? "Hoạt động" : "Vô hiệu hóa"}
                </span>
                <span className="text-sm text-[#637981]">{account.joined}</span>
                <ArrowRight className="hidden size-4 text-[#637981] md:block" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-44 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[#637981]">
            <Search className="size-7 text-[#78BCC4]" />
            Không có tài khoản mẫu phù hợp.
          </div>
        )}
      </section>
      {panel && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <button
            type="button"
            aria-label="Đóng bảng tài khoản"
            onClick={() => setPanel(null)}
            className="absolute inset-0 bg-[#002C3E]/50"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-panel-title"
            className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#DFE6DF] px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#157985]">
                  Giao diện FR-44
                </p>
                <h2 id="account-panel-title" className="mt-1 text-xl font-bold">
                  {panel === "create" ? "Tạo tài khoản" : "Chi tiết tài khoản"}
                </h2>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setPanel(null)}
                aria-label="Đóng"
                className="rounded-lg p-2 hover:bg-[#EDF1ED]"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 space-y-6 px-6 py-6">
              <p className="rounded-xl bg-[#EAF4F3] p-3 text-sm text-[#17485A]">
                Đây là form mẫu. Thao tác lưu, đổi vai trò và trạng thái sẽ có
                khi API tài khoản được triển khai.
              </p>
              <div className="space-y-4">
                <label className="block text-sm font-semibold">
                  Họ tên
                  <input
                    value={formName}
                    onChange={(event) => setFormName(event.target.value)}
                    placeholder="Nhập họ tên"
                    className="mt-2 h-11 w-full rounded-xl border border-[#DFE6DF] px-3 text-sm font-normal outline-none focus:border-[#157985]"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Email
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#637981]" />
                    <input
                      value={formEmail}
                      onChange={(event) => setFormEmail(event.target.value)}
                      type="email"
                      placeholder="name@example.com"
                      className="h-11 w-full rounded-xl border border-[#DFE6DF] pl-10 pr-3 text-sm font-normal outline-none focus:border-[#157985]"
                    />
                  </div>
                </label>
                <label className="block text-sm font-semibold">
                  Vai trò
                  <select
                    value={formRole}
                    onChange={(event) =>
                      setFormRole(event.target.value as AccountRole)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-[#DFE6DF] bg-white px-3 text-sm font-normal outline-none focus:border-[#157985]"
                  >
                    <option value="learner">Học viên</option>
                    <option value="content_manager">Quản lý nội dung</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </label>
              </div>
              {panel === "view" && selected && (
                <div className="border-t border-[#DFE6DF] pt-5">
                  <h3 className="text-sm font-semibold">
                    Trạng thái tài khoản
                  </h3>
                  <p className="mt-1 text-sm text-[#637981]">
                    Hiện tại:{" "}
                    {selected.status === "active"
                      ? "Đang hoạt động"
                      : "Đã vô hiệu hóa"}
                  </p>
                  <button
                    type="button"
                    disabled
                    className="mt-3 rounded-xl border border-[#DFE6DF] px-4 py-2 text-sm font-semibold text-[#637981] opacity-60"
                  >
                    {selected.status === "active" ? "Vô hiệu hóa" : "Khôi phục"}{" "}
                    · chưa khả dụng
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-[#DFE6DF] px-6 py-4">
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-[#EDF1ED]"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled
                className="rounded-xl bg-[#002C3E] px-4 py-2 text-sm font-semibold text-white opacity-40"
              >
                Lưu thay đổi · chưa khả dụng
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
