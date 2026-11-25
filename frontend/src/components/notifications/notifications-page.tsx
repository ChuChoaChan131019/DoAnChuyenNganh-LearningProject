'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Filter } from 'lucide-react';
import { ApiClientError, userNotificationApi, type UserNotificationPage as PageData } from '@/lib/api';

export function NotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [offset, setOffset] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async (start = offset, filter = unreadOnly) => {
    setLoading(true);
    setError('');
    try { setPage(await userNotificationApi.list(start, filter)); }
    catch (cause) { setError(cause instanceof ApiClientError ? cause.message : 'Không thể tải thông báo.'); }
    finally { setLoading(false); }
  }, [offset, unreadOnly]);

  useEffect(() => { void load(); }, [load]);

  async function open(item: NonNullable<PageData>['items'][number]) {
    if (busyId) return;
    setBusyId(item.id);
    try {
      if (!item.read_at) await userNotificationApi.markRead(item.id);
      const href = item.href.startsWith('/') && !item.href.startsWith('//') ? item.href : '/';
      router.push(href);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Không thể mở thông báo.');
    } finally { setBusyId(null); }
  }

  return <div className="mx-auto max-w-4xl space-y-5 pb-12">
    <header>
      <h1 className="flex items-center gap-3 text-3xl font-bold text-[#002C3E]"><Bell className="h-7 w-7 text-[#F7444E]" />Thông báo</h1>
      <p className="mt-2 text-sm text-[#637981]">Tin mới về thảo luận, nội dung học tập và tài khoản của bạn.</p>
    </header>
    <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1ed] p-4">
        <div className="flex gap-2">
          <button type="button" onClick={() => { setUnreadOnly(false); setOffset(0); void load(0, false); }}
            className={!unreadOnly ? 'rounded-lg bg-[#EAF4F3] px-3 py-2 text-xs font-semibold text-[#145a68]' : 'rounded-lg px-3 py-2 text-xs text-slate-500'}>Tất cả</button>
          <button type="button" onClick={() => { setUnreadOnly(true); setOffset(0); void load(0, true); }}
            className={unreadOnly ? 'rounded-lg bg-[#EAF4F3] px-3 py-2 text-xs font-semibold text-[#145a68]' : 'rounded-lg px-3 py-2 text-xs text-slate-500'}><Filter className="mr-1 inline size-3" />Chưa đọc</button>
        </div>
        <span className="text-xs text-slate-500">{page?.unread ?? 0} chưa đọc</span>
      </div>
      {error && <p role="alert" className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error} <button type="button" onClick={() => void load()} className="font-semibold underline">Thử lại</button></p>}
      {loading && <p role="status" className="p-10 text-center text-sm text-slate-500">Đang tải thông báo...</p>}
      {!loading && !error && !page?.items.length && <p className="p-10 text-center text-sm text-slate-500">Chưa có thông báo nào.</p>}
      {!loading && page?.items.map((item) => <button key={item.id} type="button" disabled={busyId !== null} onClick={() => void open(item)}
        className={'block w-full border-b border-[#edf1ed] px-5 py-4 text-left hover:bg-slate-50 disabled:opacity-50 ' + (item.read_at ? '' : 'bg-[#EAF4F3]/70')}>
        <span className="block font-semibold text-[#002C3E]">{item.title}</span>
        {!!item.body && <span className="mt-1 block whitespace-pre-wrap text-sm leading-6 text-[#637981]">{item.body}</span>}
        <time className="mt-2 block text-xs text-slate-400" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('vi-VN')}</time>
      </button>)}
      {page && page.total > page.limit && <div className="flex items-center justify-between p-4 text-sm text-slate-500">
        <button type="button" disabled={loading || offset === 0} onClick={() => { const next = Math.max(0, offset - page.limit); setOffset(next); void load(next); }} className="disabled:opacity-40">Trang trước</button>
        <span>{Math.floor(offset / page.limit) + 1} / {Math.ceil(page.total / page.limit)}</span>
        <button type="button" disabled={loading || offset + page.limit >= page.total} onClick={() => { const next = offset + page.limit; setOffset(next); void load(next); }} className="disabled:opacity-40">Trang sau</button>
      </div>}
    </section>
  </div>;
}
