'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { aiManagerApi, courseApi, questionApi } from '@/lib/api';
import { LessonMarkdown } from '@/components/lesson-markdown';
import type { ChapterOption, CourseOption } from '@/types/question';

type Draft = Awaited<ReturnType<typeof aiManagerApi.generateLesson>>;

export default function ContentGeneratorPage() {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [courseId, setCourseId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<'basic' | 'intermediate' | 'advanced'>('basic');
  const [wordCount, setWordCount] = useState(600);
  const [instructions, setInstructions] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savedId, setSavedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    questionApi.listCourses()
      .then((items) => {
        if (!active) return;
        setCourses(items);
        if (items.length) setLoadingChapters(true);
        setCourseId((current) => current || items[0]?.id || '');
        if (!items.length) setError('Chưa có khóa học. Hãy tạo khóa học trước khi tạo bài học bằng AI.');
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Không tải được khóa học.'); })
      .finally(() => { if (active) setLoadingCourses(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!courseId) return;
    let active = true;
    questionApi.listChapters(courseId)
      .then((items) => {
        if (!active) return;
        setChapters(items);
        setChapterId(items[0]?.id || '');
        if (!items.length) setError('Khóa học này chưa có chương. Hãy tạo chương trước khi tạo bài học bằng AI.');
        else setError('');
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Không tải được chương.'); })
      .finally(() => { if (active) setLoadingChapters(false); });
    return () => { active = false; };
  }, [courseId]);

  const generate = async () => {
    const missing = [!courseId && 'khóa học', !chapterId && 'chương', !title.trim() && 'tiêu đề', !topic.trim() && 'chủ đề'].filter(Boolean);
    if (missing.length) {
      setError(`Còn thiếu: ${missing.join(', ')}.`);
      return;
    }
    setBusy(true); setError(''); setSavedId(''); setDraft(null);
    try {
      setDraft(await aiManagerApi.generateLesson({ course_id: courseId, chapter_id: chapterId, title: title.trim(), topic: topic.trim(), level, content_type: 'lesson', word_count: wordCount, instructions: instructions.trim() || undefined }));
    } catch (e) { setError(e instanceof Error ? e.message : 'AI chưa tạo được nội dung.'); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!draft || !draft.title.trim() || !draft.content.trim()) { setError('Bản nháp cần có tiêu đề và nội dung.'); return; }
    setBusy(true); setError('');
    try {
      const lesson = await courseApi.createLesson(courseId, chapterId, { title: draft.title.trim(), content: draft.content.trim(), code_example: draft.code_example.trim(), estimated_duration_minutes: draft.estimated_duration_minutes, is_ai_generated: true });
      if (!lesson.id) throw new Error('Đã tạo bài học nhưng API không trả về mã bài học.');
      setSavedId(lesson.id);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được bản nháp.'); }
    finally { setBusy(false); }
  };

  const input = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f7444e]';
  return <main className="mx-auto max-w-5xl space-y-6 p-6 text-[#0f3741]">
    <div><h1 className="text-2xl font-bold">Tạo nội dung bằng AI</h1><p className="mt-1 text-sm text-slate-600">Tạo bản nháp bài học, chỉnh sửa và lưu để duyệt.</p></div>
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
      <label className="text-sm font-medium">Khóa học<select className={`${input} mt-1`} value={courseId} disabled={loadingCourses} onChange={(e) => { setCourseId(e.target.value); setChapterId(''); setChapters([]); setLoadingChapters(Boolean(e.target.value)); setDraft(null); }}><option value="">{loadingCourses ? 'Đang tải khóa học...' : 'Chọn khóa học'}</option>{courses.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
      <label className="text-sm font-medium">Chương<select className={`${input} mt-1`} value={chapterId} disabled={!courseId || loadingChapters} onChange={(e) => { setChapterId(e.target.value); setDraft(null); }}><option value="">{loadingChapters ? 'Đang tải chương...' : 'Chọn chương'}</option>{chapters.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
      <label className="text-sm font-medium">Tiêu đề mong muốn<input className={`${input} mt-1`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Ví dụ: Vòng lặp trong C#" /></label>
      <label className="text-sm font-medium">Chủ đề cần viết<input className={`${input} mt-1`} value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={300} placeholder="Khái niệm, cú pháp, ví dụ thực tế" /></label>
      <label className="text-sm font-medium">Trình độ<select className={`${input} mt-1`} value={level} onChange={(e) => setLevel(e.target.value as typeof level)}><option value="basic">Cơ bản</option><option value="intermediate">Trung cấp</option><option value="advanced">Nâng cao</option></select></label>
      <label className="text-sm font-medium">Số từ dự kiến<input className={`${input} mt-1`} type="number" min={300} max={1500} value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))} /></label>
      <label className="text-sm font-medium md:col-span-2">Hướng dẫn thêm<textarea className={`${input} mt-1 min-h-20`} value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={1000} placeholder="Điểm cần nhấn mạnh, ví dụ muốn dùng..." /></label>
      <button className="rounded-xl bg-[#f7444e] px-5 py-2 font-semibold text-white disabled:opacity-50 md:col-span-2" disabled={busy || loadingCourses || loadingChapters} onClick={generate}>{busy ? 'Đang xử lý...' : loadingCourses || loadingChapters ? 'Đang tải dữ liệu...' : 'Tạo nội dung'}</button>
    </section>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {draft && <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold">Bản nháp AI · {draft.model}</h2>
      <label className="block text-sm font-medium">Tiêu đề<input className={`${input} mt-1`} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
      <label className="block text-sm font-medium">Nội dung<textarea className={`${input} mt-1 min-h-80 font-mono`} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} /></label>
      <div className="rounded-xl border border-slate-200 bg-[#fbfcfa] p-5"><h3 className="mb-4 border-b border-slate-200 pb-2 font-semibold">Xem trước nội dung đã định dạng</h3><LessonMarkdown content={draft.content} /></div>
      <label className="block text-sm font-medium">Ví dụ mã nguồn<textarea className={`${input} mt-1 min-h-32 font-mono`} value={draft.code_example} onChange={(e) => setDraft({ ...draft, code_example: e.target.value })} /></label>
      {savedId ? <p className="text-sm text-emerald-700">Đã lưu bản nháp. <Link className="underline" href={`/content-manager/learning-content/lessons/${savedId}`}>Mở bài học</Link></p> : <button className="rounded-xl bg-[#0f3741] px-5 py-2 font-semibold text-white disabled:opacity-50" onClick={save} disabled={busy}>Lưu bản nháp</button>}
    </section>}
  </main>;
}
