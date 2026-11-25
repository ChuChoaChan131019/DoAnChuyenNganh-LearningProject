'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, X } from 'lucide-react';
import { ApiClientError, userNotificationApi, type UserNotificationPage } from '@/lib/api';

export function UserNotificationBell() {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [page, setPage] = useState<UserNotificationPage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async (start = offset, filter = unreadOnly) => {
    setLoading(true);
    setError('');
    try {
      setPage(await userNotificationApi.list(start, filter));
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Không thể tải thông báo.');
    } finally {
      setLoading(false);
    }
  }, [offset, unreadOnly]);

  useEffect(() => {
    void userNotificationApi.unreadCount().then(({ count }) => {
      setUnreadCount(count);
      setPage((current) => current ? { ...current, unread: count } : current);
    }).catch(() => {});
    const timer = window.setInterval(() => {
      if (!document.hidden) void userNotificationApi.unreadCount().then(({ count }) => {
        setUnreadCount(count);
        setPage((current) => current ? { ...current, unread: count } : current);
      }).catch(() => {});
    }, 30_000);
    const onFocus = () => void userNotificationApi.unreadCount().then(({ count }) => {
      setUnreadCount(count);
      setPage((current) => current ? { ...current, unread: count } : current);
    }).catch(() => {});
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [pathname]);

  async function openNotification(item: NonNullable<UserNotificationPage>['items'][number]) {
    if (busyId) return;
    setBusyId(item.id);
    try {
      if (!item.read_at) await userNotificationApi.markRead(item.id);
      const href = item.href.startsWith('/') && !item.href.startsWith('//') ? item.href : '/';
      dialog.current?.close();
      router.push(href);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Không thể mở thông báo.');
    } finally {
      setBusyId(null);
    }
  }

  const listHref = pathname.startsWith('/admin/') ? '/admin/notifications'
    : pathname.startsWith('/content-manager/') ? '/content-manager/notifications'
      : '/learner/notifications';

  return <>
    <button type="button" aria-label={unreadCount ? 'Thông báo: ' + unreadCount + ' chưa đọc' : 'Thông báo'}
      aria-haspopup="dialog" onClick={() => { dialog.current?.showModal(); void load(0, unreadOnly); }}
      className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">
      <Bell className="h-4 w-4" />
      {!!unreadCount && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#F7444E] px-1 text-center text-[10px] font-bold text-white">
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>}
    </button>
    <dialog ref={dialog} aria-labelledby="user-notification-title"
      className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-xl backdrop:bg-black/30">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
        <h2 id="user-notification-title" className="font-bold">Thông báo {page ? '(' + page.unread + ' chưa đọc)' : ''}</h2>
        <button type="button" aria-label="Đóng thông báo" onClick={() => dialog.current?.close()} className="rounded-lg p-2 hover:bg-slate-100"><X className="size-4" /></button>
      </div>
      <div className="flex gap-2 border-b px-5 py-3 text-xs">
        <button type="button" onClick={() => { setUnreadOnly(false); setOffset(0); void load(0, false); }}
          className={!unreadOnly ? 'rounded-lg bg-[#EAF4F3] px-3 py-1.5 font-semibold text-[#145a68]' : 'rounded-lg px-3 py-1.5 text-slate-500'}>Tất cả</button>
        <button type="button" onClick={() => { setUnreadOnly(true); setOffset(0); void load(0, true); }}
          className={unreadOnly ? 'rounded-lg bg-[#EAF4F3] px-3 py-1.5 font-semibold text-[#145a68]' : 'rounded-lg px-3 py-1.5 text-slate-500'}>Chưa đọc</button>
      </div>
      {error && <div role="alert" className="p-5 text-sm text-rose-700">{error} <button type="button" onClick={() => void load()} className="underline">Thử lại</button></div>}
      {loading ? <p role="status" className="p-5 text-sm">Đang tải thông báo...</p> : !page?.items.length && !error ? <p className="p-8 text-center text-sm text-slate-500">Bạn chưa có thông báo.</p> : null}
      {!loading && page?.items.map((item) => <button key={item.id} type="button" disabled={busyId !== null}
        onClick={() => void openNotification(item)}
        className={'block w-full space-y-1 border-b px-5 py-4 text-left text-sm hover:bg-slate-50 disabled:opacity-50 ' + (item.read_at ? '' : 'bg-[#EAF4F3]')}>
        <span className="block font-semibold">{item.title}</span>
        {!!item.body && <span className="block whitespace-pre-wrap text-xs leading-5 text-slate-600">{item.body}</span>}
        <time className="block text-[11px] text-slate-400" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('vi-VN')}</time>
      </button>)}
      <div className="flex items-center justify-between border-t p-4 text-xs text-slate-500">
        <button type="button" disabled={loading || offset === 0} onClick={() => { const next = Math.max(0, offset - (page?.limit ?? 30)); setOffset(next); void load(next); }} className="disabled:opacity-40">Trang trước</button>
        <Link href={listHref} onClick={() => dialog.current?.close()} className="font-semibold text-[#157985]">Xem tất cả</Link>
        <button type="button" disabled={loading || !page || offset + page.limit >= page.total} onClick={() => { const next = offset + (page?.limit ?? 30); setOffset(next); void load(next); }} className="disabled:opacity-40">Trang sau</button>
      </div>
    </dialog>
  </>;
}
