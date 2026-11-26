'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { ArrowLeft, Check, FileText, Sparkles } from 'lucide-react';
import { ApiClientError, questionApi } from '@/lib/api';
import { vietnameseDifficulty } from '@/lib/ui-labels';
import type { QuestionHistoryItem, QuestionItem, QuestionStatus, QuestionType } from '@/types/question';

const typeLabel: Record<QuestionType, string> = {
  single_choice: 'Một đáp án',
  multiple_choice: 'Nhiều đáp án',
  true_false: 'Đúng / Sai',
  fill_in_blank: 'Điền vào chỗ trống',
};

const statusLabel: Record<QuestionStatus, string> = {
  draft: 'Bản nháp',
  approved: 'Đã công bố',
  rejected: 'Đã từ chối',
};

const historyLabel: Record<QuestionHistoryItem['action'], string> = {
  created: 'Tạo câu hỏi',
  updated: 'Cập nhật',
  submitted: 'Gửi duyệt',
  approved: 'Công bố',
  rejected: 'Từ chối',
  unapproved: 'Gỡ duyệt',
};

export default function QuestionPreview() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin/');
  const reviewHref = isAdmin ? '/admin/questions/review' : '/content-manager/questions/review';
  const [question, setQuestion] = useState<QuestionItem | null>(null);
  const [history, setHistory] = useState<QuestionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [item, events] = await Promise.all([
        questionApi.getById(id) as Promise<QuestionItem>,
        questionApi.getHistory(id).catch(() => [] as QuestionHistoryItem[]),
      ]);
      setQuestion(item);
      setHistory(events);
    } catch (cause) {
      setQuestion(null);
      setError(cause instanceof ApiClientError ? cause.message : 'Không thể tải câu hỏi.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const revokeApproval = async () => {
    if (!question || question.status !== 'approved' || !requestReason.trim() || requesting) return;
    setRequesting(true);
    setError('');
    try {
      await questionApi.revokeApproval(id, requestReason.trim(), question.version ?? 0);
      await load();
      setRequestOpen(false);
      setRequestReason('');
      setRequestSent(true);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Không thể gỡ duyệt câu hỏi.');
    } finally { setRequesting(false); }
  };

  const options = [...(question?.options ?? [])].sort((first, second) => first.order_index - second.order_index);

  return <div className="mx-auto max-w-[1100px] space-y-5 pb-12">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={reviewHref} className="inline-flex items-center gap-2 text-sm text-[#526f78] hover:text-[#002C3E]"><ArrowLeft className="h-4 w-4" />Danh sách cần duyệt</Link>
      {question && isAdmin && question.status === 'approved' && <button type="button" onClick={() => { setRequestOpen(true); setRequestSent(false); }} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">Gỡ duyệt</button>}
      {question && !isAdmin && <Link href={`/content-manager/questions/editor?id=${encodeURIComponent(id)}`} className="rounded-xl border border-[#dfe6df] bg-white px-4 py-2 text-sm font-semibold text-[#002C3E]">Mở trình chỉnh sửa</Link>}
    </div>

    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error} <button type="button" onClick={() => void load()} className="ml-2 font-semibold underline">Thử lại</button></p>}
    {requestSent && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">Đã gỡ duyệt và thông báo cho manager.</p>}
    {isAdmin && requestOpen && <section className="rounded-xl border border-amber-300 bg-amber-50 p-5"><label className="block text-sm font-semibold text-[#002C3E]">Lý do gỡ duyệt<textarea value={requestReason} onChange={(event) => setRequestReason(event.target.value)} maxLength={2000} rows={3} className="mt-2 w-full rounded-lg border border-[#dfe6df] bg-white p-3 text-sm" placeholder="Ghi rõ lý do gỡ duyệt..." /></label><div className="mt-3 flex justify-end gap-2"><button type="button" disabled={requesting} onClick={() => setRequestOpen(false)} className="rounded-lg border border-[#dfe6df] bg-white px-4 py-2 text-sm">Hủy</button><button type="button" disabled={requesting || !requestReason.trim()} onClick={() => void revokeApproval()} className="rounded-lg bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{requesting ? 'Đang xử lý...' : 'Gỡ duyệt'}</button></div></section>}
    {loading && <p className="rounded-xl bg-white p-5 text-sm text-[#637981]">Đang tải câu hỏi đã lưu...</p>}

    {!loading && question && <>
      <div className="rounded-2xl border border-[#dfe6df] bg-[#f8fbf9] px-5 py-3 text-sm font-semibold text-[#526f78]">Bản đã lưu v{question.version ?? 1} · {statusLabel[question.status]}</div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="space-y-5">
          <header className="rounded-2xl border border-[#dfe6df] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#14919B]">{[question.course?.title, question.chapter?.title, question.lesson?.title].filter(Boolean).join(' / ') || 'Ngân hàng câu hỏi'}</p>
            <h1 className="mt-3 whitespace-pre-wrap text-2xl font-bold leading-relaxed text-[#002C3E]">{question.content}</h1>
            <p className="mt-2 text-sm text-[#637981]">{typeLabel[question.question_type]} · {vietnameseDifficulty(question.difficulty)} · {question.is_ai_generated ? 'Tạo tự động' : 'Tự soạn'}</p>
          </header>
          <section className="rounded-2xl border border-[#dfe6df] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-[#002C3E]">Đáp án</h2>
            {options.length ? <ol className="space-y-3">{options.map((option, index) => <li key={option.id ?? `${id}-${index}`} className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${option.is_correct ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-[#dfe6df] bg-[#fbfdfb] text-[#16485a]'}`}><span className="font-bold">{String.fromCharCode(65 + index)}.</span><span className="min-w-0 flex-1 whitespace-pre-wrap">{option.option_text}</span>{option.is_correct && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><Check className="h-3.5 w-3.5" />Đúng</span>}</li>)}</ol> : <p className="text-sm text-[#637981]">Câu hỏi chưa có lựa chọn.</p>}
          </section>
          <section className="rounded-2xl border border-[#dfe6df] bg-white p-6 shadow-sm"><h2 className="mb-3 text-lg font-bold text-[#002C3E]">Giải thích</h2><p className="whitespace-pre-wrap text-sm leading-7 text-[#16485a]">{question.explanation || 'Chưa có lời giải thích.'}</p></section>
        </article>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-sm"><h2 className="font-bold text-[#002C3E]">Thông tin câu hỏi</h2><div className="mt-4 space-y-3 text-sm text-[#526f78]"><p className="flex items-center gap-2">{question.is_ai_generated ? <Sparkles className="h-4 w-4 text-[#14919B]" /> : <FileText className="h-4 w-4 text-[#F7444E]" />}{question.is_ai_generated ? 'Tạo tự động' : 'Tự soạn'}</p><p>Trạng thái: <strong className="text-[#002C3E]">{statusLabel[question.status]}</strong></p><p>Độ khó: <strong className="text-[#002C3E]">{vietnameseDifficulty(question.difficulty)}</strong></p></div></section>
          <section className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-sm"><h2 className="font-bold text-[#002C3E]">Lịch sử duyệt</h2><ol className="mt-4 space-y-4">{history.map((event) => <li key={event.id} className="border-l-2 border-[#78BCC4] pl-3 text-sm text-[#16485a]"><strong>{historyLabel[event.action]}</strong> · v{event.version}<p className="text-xs text-[#637981]">{new Date(event.created_at).toLocaleString('vi-VN')}</p>{event.reason && <p className="mt-1 whitespace-pre-wrap">{event.reason}</p>}</li>)}{!history.length && <li className="text-sm text-[#637981]">Chưa có quyết định nào.</li>}</ol></section>
        </aside>
      </div>
    </>}
  </div>;
}
