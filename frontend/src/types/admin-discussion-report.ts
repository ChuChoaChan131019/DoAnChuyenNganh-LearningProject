export type ReportStatus = "pending" | "dismissed" | "hidden" | "removed";
export type ReportFilter = ReportStatus | "all";
export type ReportDecision = Exclude<ReportStatus, "pending">;

export interface AdminDiscussionReport {
  id: string;
  target_type: "post" | "comment";
  target_id: string | null;
  reason: string;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  moderator_reason: string | null;
  content: string | null;
  content_status: string | null;
  post_id: string | null;
  post_title: string | null;
  chapter_id: string | null;
  chapter_title: string | null;
  lesson_id: string | null;
  lesson_title: string | null;
}

export interface AdminDiscussionReportPage {
  items: AdminDiscussionReport[];
  total: number;
  limit: number;
  offset: number;
}
