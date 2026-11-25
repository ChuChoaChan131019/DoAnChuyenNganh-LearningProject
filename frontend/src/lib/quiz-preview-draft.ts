/**
 * Bản nháp đề kiểm tra chưa lưu, dùng cho trang xem trước của content manager.
 * Lưu ở localStorage để tab xem trước (mở bằng tab mới) đọc được; không gửi lên máy chủ.
 */
export type QuizPreviewDraft = {
  /** id đề đang chỉnh, hoặc null khi là đề mới chưa lưu. */
  quiz_id: string | null;
  questions: Array<{ question_id: string; score_weight: number }>;
  /** Cài đặt đang sửa nhưng chưa lưu; thiếu thì dùng cài đặt đã lưu của đề. */
  meta?: { title?: string; duration_minutes?: number | null; pass_percentage?: number };
  saved_at: number;
};

const KEY = 'quiz_preview_draft';

export function saveQuizPreviewDraft(draft: Omit<QuizPreviewDraft, 'saved_at'>) {
  window.localStorage.setItem(KEY, JSON.stringify({ ...draft, saved_at: Date.now() }));
}

export function readQuizPreviewDraft(): QuizPreviewDraft | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as QuizPreviewDraft | null;
    if (!parsed || !Array.isArray(parsed.questions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function quizPreviewDraftUrl(quizId: string | null) {
  return `/content-manager/quizzes/${encodeURIComponent(quizId ?? 'draft')}/preview?draft=1`;
}
