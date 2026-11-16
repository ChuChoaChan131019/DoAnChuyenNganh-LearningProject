"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { adminAccountsApi, ApiClientError } from "@/lib/api";
import type { AccountRole, AdminAccount } from "@/types/admin-account";

export const accountRoleLabels: Record<AccountRole, string> = {
  learner: "Học viên",
  content_manager: "Quản lý nội dung",
  admin: "Quản trị viên",
};
const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-[#DFE6DF] bg-white px-3 text-sm font-normal outline-none focus:border-[#157985] focus:ring-2 focus:ring-[#78BCC4]/30 disabled:bg-[#F7F8F3]";
const passwordHint =
  "Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.";
const validPassword = (value: string) =>
  value.length >= 8 &&
  value.length <= 128 &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /[0-9]/.test(value) &&
  /[!@#$%^&*()_+\-=\[\]{};'":\\|<>?,./`~]/.test(value);
export const accountErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Không thể xử lý yêu cầu. Vui lòng thử lại.";

export function AccountPanel({
  account,
  selfId,
  onClose,
  onSaved,
}: {
  account: AdminAccount | null;
  selfId?: string;
  onClose: () => void;
  onSaved: (notice: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const creating = !account;
  const [fullName, setFullName] = useState(account?.full_name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: boolean;
    general?: string;
  }>({});
  const disabled = Boolean(account?.disabled_at);
  const self = account?.id === selfId;
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current || confirmStatus) return;
    const next: typeof errors = {};
    if (!fullName.trim()) next.name = "Vui lòng nhập họ tên.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Vui lòng nhập email hợp lệ.";
    if (creating && !validPassword(password)) next.password = true;
    setErrors(next);
    if (Object.keys(next).length) return;
    submitting.current = true;
    setSaving(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
      };
      if (creating) await adminAccountsApi.create({ ...payload, password });
      else await adminAccountsApi.update(account.id, payload);
      setPassword("");
      onSaved(
        creating
          ? "Đã tạo tài khoản quản lý nội dung."
          : "Đã cập nhật thông tin tài khoản.",
      );
    } catch (caught) {
      if (
        caught instanceof ApiClientError &&
        ["USER_ALREADY_EXISTS", "INVALID_EMAIL"].includes(caught.code)
      )
        setErrors({ email: caught.message });
      else if (
        caught instanceof ApiClientError &&
        caught.code === "WEAK_PASSWORD"
      )
        setErrors({ password: true });
      else setErrors({ general: accountErrorMessage(caught) });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  const changeStatus = async () => {
    if (!account || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setErrors({});
    try {
      await adminAccountsApi.status(
        account.id,
        disabled ? "active" : "disabled",
      );
      onSaved(
        disabled ? "Đã khôi phục tài khoản." : "Đã vô hiệu hóa tài khoản.",
      );
    } catch (caught) {
      setErrors({ general: accountErrorMessage(caught) });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="account-panel-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-lg bg-white p-0 text-[#002C3E] shadow-2xl backdrop:bg-[#002C3E]/50"
    >
      <form
        onSubmit={save}
        noValidate
        autoComplete="off"
        className="flex min-h-full flex-col"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#DFE6DF] px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#157985]">
              Quản lý tài khoản
            </p>
            <h2 id="account-panel-title" className="mt-1 text-xl font-bold">
              {creating
                ? "Tạo tài khoản quản lý nội dung"
                : "Chi tiết tài khoản"}
            </h2>
          </div>
          <button
            type="button"
            autoFocus
            aria-label="Đóng"
            disabled={saving}
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-[#EDF1ED] disabled:opacity-40"
          >
            <X className="size-5" />
          </button>
        </div>
        <fieldset disabled={saving} className="flex-1 space-y-5 px-6 py-6">
          <div className="flex items-center gap-2 rounded-xl bg-[#EAF4F3] p-3 text-sm text-[#17485A]">
            <ShieldCheck className="size-4 shrink-0" />
            Vai trò:{" "}
            {creating ? "Quản lý nội dung" : accountRoleLabels[account.role]}
          </div>
          <label className="block text-sm font-semibold">
            Họ tên
            <input
              name="fullName"
              value={fullName}
              maxLength={100}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <span
                id="name-error"
                role="alert"
                className="mt-1 block text-xs text-rose-700"
              >
                {errors.name}
              </span>
            )}
          </label>
          <label className="block text-sm font-semibold">
            Email
            <input
              name="account-email"
              type="email"
              autoComplete="off"
              value={email}
              maxLength={254}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <span
                id="email-error"
                role="alert"
                className="mt-1 block text-xs text-rose-700"
              >
                {errors.email}
              </span>
            )}
          </label>
          {creating && (
            <label className="block text-sm font-semibold">
              Mật khẩu khởi tạo
              <input
                name="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                maxLength={128}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password)
                    setErrors((old) => ({
                      ...old,
                      password: !validPassword(e.target.value),
                    }));
                }}
                className={inputClass}
                aria-invalid={Boolean(errors.password)}
                aria-describedby="password-hint"
              />
              <span
                id="password-hint"
                className={`mt-2 block text-xs font-normal ${errors.password ? "text-rose-700" : "text-[#637981]"}`}
              >
                {passwordHint}
              </span>
            </label>
          )}
          {!creating && (
            <div className="border-t border-[#DFE6DF] pt-5">
              <h3 className="text-sm font-semibold">Trạng thái tài khoản</h3>
              <p className="mt-1 text-sm text-[#637981]">
                {disabled ? "Đã vô hiệu hóa" : "Đang hoạt động"}
              </p>
              {self ? (
                <p className="mt-3 text-xs text-[#637981]">
                  Đây là tài khoản bạn đang đăng nhập.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmStatus(true);
                    setErrors({});
                  }}
                  className={`mt-3 rounded-xl border px-4 py-2 text-sm font-semibold ${disabled ? "border-emerald-200 text-emerald-700" : "border-rose-200 text-rose-700"}`}
                >
                  {disabled ? "Khôi phục tài khoản" : "Vô hiệu hóa tài khoản"}
                </button>
              )}
              {confirmStatus && (
                <div
                  role="group"
                  aria-label="Xác nhận trạng thái"
                  className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"
                >
                  <p className="text-sm">
                    {disabled
                      ? "Cho phép tài khoản này đăng nhập và sử dụng hệ thống trở lại?"
                      : "Tài khoản này sẽ bị chặn truy cập. Dữ liệu học tập và nội dung đã tạo được giữ lại."}
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold">
                    {account.email}
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmStatus(false)}
                      className="rounded-lg px-3 py-2 text-sm"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={changeStatus}
                      className="rounded-lg bg-[#002C3E] px-3 py-2 text-sm font-semibold text-white"
                    >
                      Xác nhận {disabled ? "khôi phục" : "vô hiệu hóa"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {errors.general && (
            <p
              role="alert"
              className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
            >
              {errors.general}
            </p>
          )}
        </fieldset>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[#DFE6DF] bg-white px-6 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-[#EDF1ED]"
          >
            Đóng
          </button>
          <button
            type="submit"
            disabled={saving || confirmStatus}
            className="inline-flex items-center gap-2 rounded-xl bg-[#002C3E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {creating ? "Tạo tài khoản" : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
