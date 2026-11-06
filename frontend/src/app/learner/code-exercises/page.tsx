'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Code2, Loader2, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CodeExerciseFiltersPanel } from '@/components/learner/code-exercises/code-exercise-filters';
import { CodeExerciseList } from '@/components/learner/code-exercises/code-exercise-list';
import { codeExerciseApi, courseApi } from '@/lib/api';
import type { CodeDifficulty, CodeExerciseFilters, CodeExerciseListItem, CodeProgressStatus } from '@/types/code-exercise';

export default function CodeExercisesPage() {
  return <Suspense fallback={<PageLoading />}><CodeExercisesContent /></Suspense>;
}

function CodeExercisesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filters, setFilters] = useState<CodeExerciseFilters>(() => ({
    search: searchParams.get('search') || undefined,
    course_id: searchParams.get('course_id') || undefined,
    chapter_id: searchParams.get('chapter_id') || undefined,
    lesson_id: searchParams.get('lesson_id') || undefined,
    difficulty: (searchParams.get('difficulty') || undefined) as CodeDifficulty | undefined,
    progress_status: (searchParams.get('progress_status') || undefined) as CodeProgressStatus | undefined,
    limit: 18,
  }));
  const [items, setItems] = useState<CodeExerciseListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState<Array<{ id: string; title: string; slug: string }>>([]);
  const [hierarchy, setHierarchy] = useState<Array<{ id: string; title: string; lessons: Array<{ id: string; title: string }> }>>([]);

  useEffect(() => {
    courseApi.learnerList().then((data) => setCourses(data.map((course) => ({ id: String(course.id), title: course.title, slug: course.slug })))).catch(() => setCourses([]));
  }, []);

  const selectedCourse = courses.find((course) => course.id === filters.course_id);
  useEffect(() => {
    if (!selectedCourse) return;
    courseApi.learnerLessons(selectedCourse.slug)
      .then((data) => setHierarchy(data.chapters.map((chapter) => ({ id: chapter.id, title: chapter.title, lessons: chapter.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title })) }))))
      .catch(() => setHierarchy([]));
  }, [selectedCourse]);

  const load = useCallback(async (append = false, cursor?: string) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const response = await codeExerciseApi.list({ ...filters, cursor });
      setItems((current) => append ? [...current, ...response.items] : response.items);
      setNextCursor(response.next_cursor);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải danh sách bài thực hành.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  const changeFilters = (next: CodeExerciseFilters) => {
    if (next.course_id !== filters.course_id) setHierarchy([]);
    setFilters({ ...next, limit: 18 });
    const params = new URLSearchParams();
    for (const key of ['search', 'course_id', 'chapter_id', 'lesson_id', 'difficulty', 'progress_status'] as const) {
      if (next[key]) params.set(key, String(next[key]));
    }
    router.replace(`/learner/code-exercises${params.size ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const chapters = useMemo(() => hierarchy.map(({ id, title }) => ({ id, title })), [hierarchy]);
  const lessons = useMemo(() => hierarchy.find((chapter) => chapter.id === filters.chapter_id)?.lessons ?? [], [hierarchy, filters.chapter_id]);

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 pb-10">
      <header className="flex flex-col justify-between gap-4 rounded-[22px] border border-[#dfe6df] bg-[#f4f8f6] px-6 py-7 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f3741] text-white"><Code2 className="h-5 w-5" /></div>
          <p className="text-sm font-bold text-[#f7444e]">Thực hành C#</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#0f3741]">Phòng thực hành</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Chọn bài đã xuất bản, viết mã và tiếp tục đúng phần bạn đã lưu ở lần học trước.</p>
        </div>
        <div className="text-sm font-semibold text-slate-500">{loading ? 'Đang đếm...' : `${items.length} bài đang hiển thị`}</div>
      </header>

      <CodeExerciseFiltersPanel filters={filters} courses={courses} chapters={chapters} lessons={lessons} onChange={changeFilters} />
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{error}</span><button type="button" onClick={() => void load()} className="inline-flex shrink-0 items-center gap-2 font-bold"><RefreshCw className="h-4 w-4" /> Thử lại</button>
        </div>
      )}
      <CodeExerciseList items={items} loading={loading} loadingMore={loadingMore} hasMore={Boolean(nextCursor)} onLoadMore={() => nextCursor && void load(true, nextCursor)} />
    </div>
  );
}

function PageLoading() {
  return <div className="flex min-h-72 items-center justify-center gap-3 text-[#145a68]"><Loader2 className="h-6 w-6 animate-spin" /> Đang mở phòng thực hành...</div>;
}
