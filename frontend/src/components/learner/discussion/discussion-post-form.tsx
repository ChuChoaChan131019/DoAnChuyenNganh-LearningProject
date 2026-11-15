'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';

import { courseApi } from '@/lib/api';
import type { CreateDiscussionPostInput, DiscussionChapterOption, DiscussionPostType } from '@/types/discussion';
import { DISCUSSION_TYPE_LABELS } from './discussion-format';

type CourseOption = { title: string; slug: string };

type Props = {
  allPosts: boolean;
  chapterId?: string;
  lessonId?: string;
  chapters?: DiscussionChapterOption[];
  onCancel: () => void;
  onSubmit: (payload: CreateDiscussionPostInput) => Promise<void>;
};

const fieldClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#78bcc4] focus:ring-2 focus:ring-[#78bcc4]/20';

export function DiscussionPostForm({ allPosts, chapterId, lessonId, chapters, onCancel, onSubmit }: Props) {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseSlug, setCourseSlug] = useState('');
  const [availableChapters, setAvailableChapters] = useState<DiscussionChapterOption[]>(chapters ?? []);
  const [selectedChapterId, setSelectedChapterId] = useState(chapterId ?? '');
  const [selectedLessonId, setSelectedLessonId] = useState(lessonId ?? '');
  const [postType, setPostType] = useState<DiscussionPostType>('question');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [loadingLocations, setLoadingLocations] = useState(allPosts);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!allPosts) return;
    let active = true;
    courseApi.learnerList()
      .then((items) => { if (active) setCourses(items.map(({ title, slug }) => ({ title, slug }))); })
      .catch((error: unknown) => { if (active) setLocationError(error instanceof Error ? error.message : 'Không thể tải khóa học.'); })
      .finally(() => { if (active) setLoadingLocations(false); });
    return () => { active = false; };
  }, [allPosts]);

  useEffect(() => {
    if (!allPosts || !courseSlug) return;
    let active = true;
    courseApi.learnerLessons(courseSlug)
      .then((response) => {
        if (!active) return;
        setAvailableChapters(response.chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          lessons: chapter.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title })),
        })));
        setLocationError(null);
      })
      .catch((error: unknown) => { if (active) setLocationError(error instanceof Error ? error.message : 'Không thể tải chương và bài học.'); })
      .finally(() => { if (active) setLoadingLocations(false); });
    return () => { active = false; };
  }, [allPosts, courseSlug]);

  const activeChapter = useMemo(
    () => availableChapters.find((chapter) => chapter.id === selectedChapterId),
    [availableChapters, selectedChapterId],
  );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const nextErrors: Record<string, string> = {};
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    const cleanUrl = resourceUrl.trim();
    if (!selectedChapterId && !selectedLessonId) nextErrors.location = 'Hãy chọn chương hoặc bài học để đăng.';
    if (cleanTitle.length < 5 || cleanTitle.length > 160) nextErrors.title = 'Tiêu đề cần từ 5 đến 160 ký tự.';
    if (cleanContent.length < 10 || cleanContent.length > 20000) nextErrors.content = 'Nội dung cần từ 10 đến 20.000 ký tự.';
    if (postType === 'resource') {
      try {
        const url = new URL(cleanUrl);
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
      } catch {
        nextErrors.resource_url = 'Hãy nhập đường dẫn HTTPS hợp lệ.';
      }
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        ...(selectedLessonId ? { lesson_id: selectedLessonId } : { chapter_id: selectedChapterId }),
        post_type: postType,
        title: cleanTitle,
        content: cleanContent,
        ...(postType === 'resource' ? { resource_url: cleanUrl } : {}),
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Không thể đăng bài. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-5 rounded-2xl border border-[#b9d9d9] bg-white p-4 shadow-sm sm:p-6" aria-label="Đăng bài thảo luận">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#0f3741]">Đăng bài thảo luận</h3>
          <p className="mt-1 text-sm text-slate-500">Đặt câu hỏi hoặc chia sẻ điều bạn học được.</p>
        </div>
        <button type="button" onClick={onCancel} disabled={submitting} aria-label="Đóng form đăng bài" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
      </div>

      {!lessonId && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {allPosts && (
            <label className="text-sm font-semibold text-slate-700">Khóa học
              <select className={fieldClass} value={courseSlug} disabled={submitting || loadingLocations} onChange={(event) => {
                setCourseSlug(event.target.value);
                setSelectedChapterId('');
                setSelectedLessonId('');
                setAvailableChapters([]);
                setLocationError(null);
                setLoadingLocations(Boolean(event.target.value));
              }}>
                <option value="">Chọn khóa học</option>
                {courses.map((course) => <option key={course.slug} value={course.slug}>{course.title}</option>)}
              </select>
            </label>
          )}
          {!chapterId && (
            <label className="text-sm font-semibold text-slate-700">Chương
              <select className={fieldClass} value={selectedChapterId} disabled={submitting || loadingLocations || (allPosts && !courseSlug)} onChange={(event) => { setSelectedChapterId(event.target.value); setSelectedLessonId(''); }}>
                <option value="">Chọn chương</option>
                {availableChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
              </select>
            </label>
          )}
          {chapterId && <p className="self-end rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">Đăng trong chương: <strong>{activeChapter?.title ?? 'Chương hiện tại'}</strong></p>}
          {selectedChapterId && (
            <label className="text-sm font-semibold text-slate-700">Bài học (tùy chọn)
              <select className={fieldClass} value={selectedLessonId} disabled={submitting} onChange={(event) => setSelectedLessonId(event.target.value)}>
                <option value="">Đăng trực tiếp trong chương</option>
                {activeChapter?.lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
      {lessonId && <p className="mt-5 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">Bài đăng sẽ gắn với bài học hiện tại.</p>}
      {loadingLocations && <p className="mt-2 text-xs text-slate-500">Đang tải vị trí đăng bài…</p>}
      {locationError && <p className="mt-2 text-xs text-rose-700" role="alert">{locationError}</p>}
      {fieldErrors.location && <p className="mt-2 text-xs text-rose-700" role="alert">{fieldErrors.location}</p>}

      <div className="mt-5 grid gap-4">
        <label className="text-sm font-semibold text-slate-700">Loại bài đăng
          <select className={fieldClass} value={postType} disabled={submitting} onChange={(event) => setPostType(event.target.value as DiscussionPostType)}>
            {(Object.keys(DISCUSSION_TYPE_LABELS) as DiscussionPostType[]).map((type) => <option key={type} value={type}>{DISCUSSION_TYPE_LABELS[type]}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">Tiêu đề
          <input autoFocus className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} disabled={submitting} placeholder="Bạn muốn trao đổi điều gì?" aria-invalid={Boolean(fieldErrors.title)} />
          {fieldErrors.title && <span className="mt-1 block text-xs text-rose-700">{fieldErrors.title}</span>}
        </label>
        <label className="text-sm font-semibold text-slate-700">Nội dung
          <textarea className={`${fieldClass} min-h-36 resize-y`} value={content} onChange={(event) => setContent(event.target.value)} maxLength={20000} disabled={submitting} placeholder="Viết rõ câu hỏi hoặc nội dung chia sẻ của bạn…" aria-invalid={Boolean(fieldErrors.content)} />
          {fieldErrors.content && <span className="mt-1 block text-xs text-rose-700">{fieldErrors.content}</span>}
        </label>
        {postType === 'resource' && (
          <label className="text-sm font-semibold text-slate-700">Đường dẫn tài liệu (HTTPS)
            <input type="url" className={fieldClass} value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} maxLength={2000} disabled={submitting} placeholder="https://…" aria-invalid={Boolean(fieldErrors.resource_url)} />
            {fieldErrors.resource_url && <span className="mt-1 block text-xs text-rose-700">{fieldErrors.resource_url}</span>}
          </label>
        )}
      </div>
      {submitError && <p className="mt-4 text-sm text-rose-700" role="alert">{submitError}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={submitting} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Hủy</button>
        <button type="submit" disabled={submitting || loadingLocations || Boolean(locationError)} className="inline-flex items-center gap-2 rounded-xl bg-[#0f3741] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#175365] disabled:opacity-50">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitting ? 'Đang đăng…' : 'Đăng bài'}
        </button>
      </div>
    </form>
  );
}
