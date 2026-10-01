'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { ApiClientError, courseApi, questionApi } from '@/lib/api';
import type { Course } from '@/types/learning-content';
import type { DifficultyLevel, QuestionItem, QuestionStatus, QuestionType } from '@/types/question';

const DIFFICULTY_STYLES: Record<DifficultyLevel, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
  hard: 'bg-rose-50 text-rose-700 border-rose-200/60',
};

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Single Choice',
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  fill_in_blank: 'Fill in the Blank',
};

const STATUS_CONFIGS: Record<QuestionStatus, { dot: string; label: string; text: string }> = {
  approved: { dot: 'bg-emerald-500', label: 'Approved', text: 'text-emerald-700' },
  draft: { dot: 'bg-gray-400', label: 'Draft', text: 'text-[#637981]' },
};

function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  return <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${DIFFICULTY_STYLES[level]}`}>{level.charAt(0).toUpperCase() + level.slice(1)}</span>;
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
    courseApi.list().then(setCourses).catch(() => setError('Unable to load courses.'));
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
      if (active) setError(requestError instanceof ApiClientError ? requestError.message : 'Unable to load questions.');
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
          <h1 className="text-2xl font-bold tracking-tight text-[#002C3E] sm:text-3xl">Question bank</h1>
          <p className="mt-1 text-sm text-[#637981]">{displayedQuestions.length} questions from the question bank.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setViewMode((current) => current === 'active' ? 'deleted' : 'active')}
            className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 py-2 text-sm font-semibold text-[#002C3E] shadow-xs transition-colors hover:bg-[#f3f7f5]"
          >
            <Trash2 className="h-4 w-4 text-[#637981]" />
            {viewMode === 'deleted' ? 'Back to Question Bank' : 'Deleted Questions'}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 py-2 text-sm font-semibold text-[#002C3E] shadow-xs transition-colors hover:bg-[#f3f7f5]"
          >
            <Sparkles className="h-4 w-4 text-purple-500" />
            Generate with AI
          </button>
          <button
            type="button"
            onClick={() => router.push('/content-manager/questions/editor')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-opacity hover:bg-[#db3540]"
          >
            <Plus className="h-4 w-4" />
            Create question
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#dfe6df] bg-white p-4 shadow-xs">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#637981]" />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(event) => { setIsLoading(true); setSearch(event.target.value); }}
            className="h-10 w-full rounded-xl border border-[#dfe6df] bg-white pl-10 pr-4 text-sm text-[#002C3E] placeholder:text-[#637981]/70 transition focus:border-[#78BCC4] focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={courseId}
            onChange={(event) => { setIsLoading(true); setCourseId(event.target.value); }}
            className="h-10 rounded-xl border border-[#dfe6df] bg-white px-3.5 text-sm text-[#002C3E] outline-none cursor-pointer"
          >
            <option value="" className="bg-white text-[#002C3E]">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={String(course.id)} className="bg-white text-[#002C3E]">{course.title}</option>
            ))}
          </select>
          <select
            value={difficulty}
            onChange={(event) => { setIsLoading(true); setDifficulty(event.target.value as DifficultyLevel | ''); }}
            className="h-10 rounded-xl border border-[#dfe6df] bg-white px-3.5 text-sm text-[#002C3E] outline-none cursor-pointer"
          >
            <option value="" className="bg-white text-[#002C3E]">Any difficulty</option>
            <option value="easy" className="bg-white text-[#002C3E]">Easy</option>
            <option value="medium" className="bg-white text-[#002C3E]">Medium</option>
            <option value="hard" className="bg-white text-[#002C3E]">Hard</option>
          </select>
          <select
            value={source}
            onChange={(event) => { setIsLoading(true); setSource(event.target.value); }}
            className="h-10 rounded-xl border border-[#78BCC4] bg-[#78BCC4]/10 px-3.5 text-sm font-medium text-[#002C3E] outline-none cursor-pointer"
          >
            <option value="" className="bg-white text-[#002C3E]">Any source</option>
            <option value="ai" className="bg-white text-[#002C3E]">AI</option>
            <option value="human" className="bg-white text-[#002C3E]">Human</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#002C3E]">
            <thead className="border-b border-[#dfe6df] bg-[#fbfcf8] text-xs font-semibold uppercase tracking-wider text-[#637981]">
              <tr>
                <th scope="col" className="py-4 pl-6 pr-4">Question</th>
                <th scope="col" className="px-4 py-4">Type</th>
                <th scope="col" className="px-4 py-4">Lesson</th>
                <th scope="col" className="px-4 py-4">Difficulty</th>
                <th scope="col" className="px-4 py-4">Source</th>
                <th scope="col" className="py-4 pl-4 pr-6">Status</th>
                <th scope="col" className="py-4 pl-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5ebe5]">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-[#637981]">Loading questions...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-[#F7444E]">{error}</td></tr>
              ) : displayedQuestions.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-[#637981]">No questions found.</td></tr>
              ) : (
                displayedQuestions.map((item) => (
                  <tr
                    key={item.id}
                    onClick={viewMode === 'active' ? () => router.push(`/content-manager/questions/editor?id=${encodeURIComponent(item.id)}`) : undefined}
                    className={`${viewMode === 'active' ? 'cursor-pointer ' : ''}transition-colors hover:bg-[#f3f7f5]`}
                  >
                    <td className="max-w-md py-4 pl-6 pr-4">
                      <p className="line-clamp-1 font-medium text-[#002C3E]">{item.content}</p>
                      <p className="inline-flex items-center gap-1 text-xs text-[#637981]">
                        <BookOpen className="h-3 w-3 shrink-0" />
                        {item.course?.title || 'No Course'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-[#637981]">{TYPE_LABELS[item.question_type]}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-[#637981]">{item.lesson?.title || 'N/A'}</td>
                    <td className="whitespace-nowrap px-4 py-4"><DifficultyBadge level={item.difficulty} /></td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {item.is_ai_generated ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                          <Sparkles className="h-3 w-3 text-sky-500" />
                          AI
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-[#637981]">Human</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-4 pr-6"><StatusBadge status={item.status} /></td>
                    <td className="whitespace-nowrap py-4 pl-4 pr-6 text-right">
                      {viewMode === 'deleted' ? (
                        <button
                          type="button"
                          onClick={(event) => handleRestore(event, item.id)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Restore question"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => handleDelete(event, item.id)}
                          className="rounded-lg p-2 text-[#637981] transition-colors hover:bg-rose-50 hover:text-[#F7444E]"
                          title="Delete question"
                          aria-label="Delete question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
