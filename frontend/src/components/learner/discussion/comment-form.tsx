'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';

type Props = {
  initialValue?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
};

export function CommentForm({
  initialValue = '',
  submitLabel = 'Gửi bình luận',
  autoFocus = false,
  onSubmit,
  onCancel,
}: Props) {
  const [content, setContent] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = content.trim();
    if (!normalized) {
      setError('Vui lòng nhập nội dung bình luận.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(normalized);
      if (!initialValue) setContent('');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Không thể lưu bình luận.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        autoFocus={autoFocus}
        value={content}
        maxLength={5000}
        rows={initialValue ? 3 : 4}
        disabled={submitting}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Viết câu trả lời, ví dụ hoặc câu hỏi bổ sung…"
        className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-[#78bcc4] focus:ring-2 focus:ring-[#78bcc4]/20 disabled:opacity-70"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">{content.length}/5000</span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button type="button" disabled={submitting} onClick={onCancel} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">
              Hủy
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F7444E] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#df3943] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {submitting ? 'Đang lưu…' : submitLabel}
          </button>
        </div>
      </div>
      {error && <p className="text-xs font-medium text-rose-700" role="alert">{error}</p>}
    </form>
  );
}
