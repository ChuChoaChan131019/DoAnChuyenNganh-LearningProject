export type AccountRole = "learner" | "content_manager" | "admin";
export type AccountStatus = "active" | "disabled";
export interface AdminAccount {
  id: string;
  email: string;
  full_name: string;
  role: AccountRole;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface AdminAccountPage {
  items: AdminAccount[];
  total: number;
  limit: number;
  offset: number;
  stats: { total: number; active: number; disabled: number };
}
export interface AccountInput {
  fullName: string;
  email: string;
}
