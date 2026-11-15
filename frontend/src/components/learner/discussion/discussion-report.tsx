'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { discussionApi } from '@/lib/api';

type Props = { targetType: 'post' | 'comment'; targetId: string };

export function DiscussionReport({ targetType, targetId }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = reason.trim();
    if (value.length < 10 || value.length > 1000) {
      setError('Lý do cần từ 10 đến 1000 ký tự.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await discussionApi.createReport({ target_type: targetType, target_id: targetId, reason: value });
      setSent(true);
      setOpen(false);
      setReason('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể gửi báo cáo.');
    } finally {
      setSending(false);
    }
  };

  if (sent) return <p role="status" className="mt-3 text-xs font-semibold text-teal-700">Đã gửi báo cáo. Cảm ơn bạn đã thông báo.</p>;

  return (
    <div className="mt-3">
      <button type="button" onClick={() => { setOpen(!open); setError(null); }}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-rose-700">
        <Flag className="h-3.5 w-3.5" /> Báo cáo
      </button>
      {open && (
        <form onSubmit={(event) => void submit(event)} className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="block text-xs font-semibold text-slate-700">
            Lý do báo cáo {targetType === 'post' ? 'bài viết' : 'bình luận'}
            <textarea value={reason} onChange={(event) => { setReason(event.target.value); setError(null); }}
              minLength={10} maxLength={1000} required disabled={sending} rows={3}
              placeholder="Mô tả nội dung cần được xem xét..."
              className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600" />
          </label>
          <p className="mt-1 text-xs text-slate-500">Từ 10 đến 1000 ký tự. Danh tính của bạn không hiển thị cho người khác.</p>
          {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={sending} className="rounded-lg bg-[#0f3741] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
              {sending ? 'Đang gửi…' : 'Gửi báo cáo'}
            </button>
            <button type="button" disabled={sending} onClick={() => { setOpen(false); setError(null); }} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white">Hủy</button>
          </div>
        </form>
      )}
    </div>
  );
}
