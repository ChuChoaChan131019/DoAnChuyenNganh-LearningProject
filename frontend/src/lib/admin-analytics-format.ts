import type { AdminAnalyticsRole } from "./api";

export const ADMIN_ROLE_LABEL: Record<AdminAnalyticsRole, string> = {
  all: "Tất cả vai trò",
  learner: "Learner",
  content_manager: "Content Manager",
  admin: "Admin",
};

export const formatAdminNumber = (value: number) =>
  Math.round(value).toLocaleString("vi-VN");
export const formatAdminDay = (isoDate: string) =>
  `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`;
export const formatAdminDelta = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
