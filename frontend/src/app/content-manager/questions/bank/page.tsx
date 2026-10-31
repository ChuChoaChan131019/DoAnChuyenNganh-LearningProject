'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { ApiClientError, courseApi, questionApi } from '@/lib/api';
import { vietnameseDifficulty } from '@/lib/ui-labels';
import type { Course } from '@/types/learning-content';
import type { DifficultyLevel, QuestionItem, QuestionStatus, QuestionType } from '@/types/question';

const DIFFICULTY_STYLES: Record<DifficultyLevel, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
  hard: 'bg-rose-50 text-rose-700 border-rose-200/60',
};

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Một đáp án',
  multiple_choice: 'Nhiều đáp án',
  true_false: 'Đúng / Sai',
  fill_in_blank: 'Điền vào chỗ trống',
};

const STATUS_CONFIGS: Record<QuestionStatus, { dot: string; label: string; text: string }> = {
  approved: { dot: 'bg-emerald-500', label: 'Đã duyệt', text: 'text-emerald-700' },
  draft: { dot: 'bg-gray-400', label: 'Bản nháp', text: 'text-gray-600' },
};

function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  return <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${DIFFICULTY_STYLES[level]}`}>{vietnameseDifficulty(level)}</span>;
}

function StatusBadge({ status }: { status: QuestionStatus }) {
  const current = STATUS_CONFIGS[status] ?? STATUS_CONFIGS.draft;
  return <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${current.text}`}><span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />{current.label}</span>;
}

export default function QuestionBankPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [courseId, setCourseId] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | ''>('');
  const [source, setSource] = useState('');
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'deleted'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    courseApi.list().then(setCourses).catch(() => setError('Không thể tải khóa học.'));
  }, []);

  useEffect(() => {
    try {
      const storedIds = JSON.parse(window.localStorage.getItem('hidden_question_ids') ?? '[]');
      if (Array.isArray(storedIds)) {
        // Hydrate the client-only hidden question state from localStorage.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHiddenIds(storedIds.filter((id): id is string => typeof id === 'string'));
      }
    } catch {
      window.localStorage.removeItem('hidden_question_ids');
    }
  }, []);

  useEffect(() => {
    let active = true;
    questionApi.list({
      search,
      course_id: courseId || undefined,
      difficulty: difficulty || undefined,
      is_ai_generated: source ? source === 'ai' : undefined,
    }).then((items) => {
      if (active) {
        setQuestions(items);
        setError('');
      }
    }).catch((requestError) => {
      if (active) setError(requestError instanceof ApiClientError ? requestError.message : 'Không thể tải câu hỏi.');
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [search, courseId, difficulty, source]);

  const displayedQuestions = questions.filter((question) => (
    viewMode === 'active'
      ? !hiddenIds.includes(question.id)
      : hiddenIds.includes(question.id)
  ));

  const persistHiddenIds = (nextIds: string[]) => {
    setHiddenIds(nextIds);
    window.localStorage.setItem('hidden_question_ids', JSON.stringify(nextIds));
  };

  const handleDelete = (event: MouseEvent, id: string) => {
    event.stopPropagation();
    if (!window.confirm('Bạn có chắc muốn xóa câu hỏi này không?')) return;

    persistHiddenIds([...new Set([...hiddenIds, id])]);
  };

  const handleRestore = (event: MouseEvent, id: string) => {
    event.stopPropagation();
    persistHiddenIds(hiddenIds.filter((hiddenId) => hiddenId !== id));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Ngân hàng câu hỏi</h1>
          <p className="mt-1 text-sm text-gray-500">{displayedQuestions.length} questions from the question bank.</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setViewMode((current) => current === 'active' ? 'deleted' : 'active')} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"><Trash2 className="h-4 w-4 text-gray-500" />{viewMode === 'deleted' ? 'Back to Question Bank' : 'Deleted Questions'}</button>
          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"><Sparkles className="h-4 w-4 text-purple-600" />Tạo bằng trí tuệ nhân tạo</button>
          <button type="button" onClick={() => router.push('/content-manager/questions/editor')} className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c93f3a]"><Plus className="h-4 w-4" />Tạo câu hỏi</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-[#FFFAFC]/50 p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Tìm câu hỏi..." value={search} onChange={(event) => { setIsLoading(true); setSearch(event.target.value); }} className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 transition focus:border-teal-600 focus:bg-white focus:outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={courseId} onChange={(event) => { setIsLoading(true); setCourseId(event.target.value); }} className="h-10 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-700"><option value="">Tất cả khóa học</option>{courses.map((course) => <option key={course.id} value={String(course.id)}>{course.title}</option>)}</select>
          <select value={difficulty} onChange={(event) => { setIsLoading(true); setDifficulty(event.target.value as DifficultyLevel | ''); }} className="h-10 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-700"><option value="">Mọi mức độ</option><option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option></select>
          <select value={source} onChange={(event) => { setIsLoading(true); setSource(event.target.value); }} className="h-10 rounded-xl border border-teal-600 bg-teal-50/40 px-3.5 text-sm font-medium text-teal-900"><option value="">Mọi nguồn</option><option value="ai">Trí tuệ nhân tạo</option><option value="human">Người soạn</option></select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-100 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500"><tr><th scope="col" className="py-4 pl-6 pr-4">Câu hỏi</th><th scope="col" className="px-4 py-4">Dạng câu hỏi</th><th scope="col" className="px-4 py-4">Bài học</th><th scope="col" className="px-4 py-4">Độ khó</th><th scope="col" className="px-4 py-4">Nguồn</th><th scope="col" className="py-4 pl-4 pr-6">Trạng thái</th><th scope="col" className="py-4 pl-4 pr-6 text-right">Thao tác</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">Đang tải câu hỏi...</td></tr> : error ? <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-rose-600">{error}</td></tr> : displayedQuestions.length === 0 ? <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">Không tìm thấy câu hỏi.</td></tr> : displayedQuestions.map((item) => <tr key={item.id} onClick={viewMode === 'active' ? () => router.push(`/content-manager/questions/editor?id=${encodeURIComponent(item.id)}`) : undefined} className={`${viewMode === 'active' ? 'cursor-pointer ' : ''}transition-colors hover:bg-gray-50/80`}><td className="max-w-md py-4 pl-6 pr-4"><p className="line-clamp-1 font-medium text-gray-900">{item.content}</p><p className="inline-flex items-center gap-1 text-xs text-gray-400"><BookOpen className="h-3 w-3 shrink-0" />{item.course?.title || 'Chưa có khóa học'}</p></td><td className="whitespace-nowrap px-4 py-4 text-gray-500">{TYPE_LABELS[item.question_type]}</td><td className="whitespace-nowrap px-4 py-4 text-gray-500">{item.lesson?.title || 'Không có thông tin'}</td><td className="whitespace-nowrap px-4 py-4"><DifficultyBadge level={item.difficulty} /></td><td className="whitespace-nowrap px-4 py-4">{item.is_ai_generated ? <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700"><Sparkles className="h-3 w-3 text-sky-500" />Trí tuệ nhân tạo</span> : <span className="text-xs font-medium text-gray-600">Người soạn</span>}</td><td className="whitespace-nowrap py-4 pl-4 pr-6"><StatusBadge status={item.status} /></td><td className="whitespace-nowrap py-4 pl-4 pr-6 text-right">{viewMode === 'deleted' ? <button type="button" onClick={(event) => handleRestore(event, item.id)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50" title="Khôi phục câu hỏi">Khôi phục</button> : <button type="button" onClick={(event) => handleDelete(event, item.id)} className="rounded-lg p-2 text-red-300 transition-colors hover:bg-red-50 hover:text-red-700" title="Xóa câu hỏi" aria-label="Xóa câu hỏi"><Trash2 className="h-4 w-4" /></button>}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
