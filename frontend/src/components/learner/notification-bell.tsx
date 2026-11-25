'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { discussionNotificationsApi } from '@/lib/api';
import type { DiscussionNotificationPage } from '@/types/discussion-notification';

export function NotificationBell() {
  const dialog = useRef<HTMLDialogElement>(null);
  const sequence = useRef(0);
  const [page, setPage] = useState<DiscussionNotificationPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const load = useCallback((start: number) => {
    const request = ++sequence.current;
    return discussionNotificationsApi.list(start).then(result => {
      if (request !== sequence.current) return;
      setPage(result);
      setError('');
    }).catch(() => {
      if (request === sequence.current) setError('Không thể tải thông báo. Vui lòng thử lại.');
    }).finally(() => {
      if (request === sequence.current) setLoading(false);
    });
  }, []);
  const invalidate = useCallback(() => { sequence.current++; }, []);

  useEffect(() => {
    void load(offset);
    const timer = setInterval(() => { if (!document.hidden) void load(offset); }, 60000);
    const onFocus = () => void load(offset);
    window.addEventListener('focus', onFocus);
    return () => {
      invalidate();
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [load, offset, invalidate]);

  async function markRead(id: string) {
    setSaving(id);
    try {
      await discussionNotificationsApi.read(id);
      await load(offset);
    } catch {
      setError('Chưa đánh dấu đã đọc được. Vui lòng thử lại.');
    } finally { setSaving(null); }
  }

  return <>
    <button type="button" aria-label="Thông báo" aria-haspopup="dialog"
      onClick={() => { dialog.current?.showModal(); void load(offset); }}
      className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
      <Bell className="h-4 w-4" />
      {!!page?.unread && <span className="absolute -right-2 -top-1 rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white" aria-label={`${page.unread} thông báo chưa đọc`}>
        {page.unread > 99 ? '99+' : page.unread}
      </span>}
    </button>
    <dialog ref={dialog} aria-labelledby="notification-title"
      className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-xl backdrop:bg-black/30">
      <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
        <h2 id="notification-title" className="font-bold">Thông báo {page ? `(${page.unread} chưa đọc)` : ''}</h2>
        <button type="button" aria-label="Đóng thông báo" onClick={() => dialog.current?.close()} className="rounded-lg p-2 hover:bg-slate-100"><X className="size-4" /></button>
      </div>
      {error && <div role="alert" className="p-5 text-sm text-rose-700">{error} <button type="button" onClick={() => void load(offset)} className="underline">Thử lại</button></div>}
      {loading ? <p role="status" className="p-5 text-sm">Đang tải thông báo...</p> : !page?.items.length && !error ? <p className="p-8 text-center text-sm text-slate-500">Bạn chưa có thông báo.</p> : null}
      {!loading && page?.items.map(item => <article key={item.id} className={`space-y-2 border-b p-5 text-sm ${item.read_at ? '' : 'bg-[#EAF4F3]'}`}>
        <h3 className="font-semibold">{item.target_type === 'comment' ? 'Bình luận' : 'Bài đăng'} của bạn đã bị {item.decision === 'hidden' ? 'ẩn' : 'gỡ'}</h3>
        <p className="break-words font-medium">Bài thảo luận: {item.post_title}</p>
        <blockquote className="whitespace-pre-wrap break-words border-l-2 border-slate-300 pl-3 text-slate-600">{item.content_excerpt}</blockquote>
        <p className="whitespace-pre-wrap break-words"><strong>Lý do: </strong>{item.reason}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('vi-VN')}</time>
          {!item.read_at && <button type="button" disabled={saving !== null} onClick={() => void markRead(item.id)} className="font-semibold text-[#157985] disabled:opacity-50">{saving === item.id ? 'Đang lưu...' : 'Đánh dấu đã đọc'}</button>}
        </div>
      </article>)}
      {page && page.total > page.limit && <div className="flex items-center justify-between p-4 text-sm">
        <button type="button" disabled={loading || saving !== null || offset === 0} onClick={() => { setLoading(true); setOffset(offset - page.limit); }} className="disabled:opacity-40">Trang trước</button>
        <span>{Math.floor(offset / page.limit) + 1} / {Math.ceil(page.total / page.limit)}</span>
        <button type="button" disabled={loading || saving !== null || offset + page.limit >= page.total} onClick={() => { setLoading(true); setOffset(offset + page.limit); }} className="disabled:opacity-40">Trang sau</button>
      </div>}
    </dialog>
  </>;
}
