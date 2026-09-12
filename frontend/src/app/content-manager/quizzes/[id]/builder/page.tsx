'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { BookOpen, Check, Layers, Plus, Save, Trash2 } from 'lucide-react';
import { ApiClientError, questionApi, quizApi } from '@/lib/api';
import type {
  ChapterOption,
  CourseOption,
  LessonOption,
  QuestionItem,
  QuestionType,
} from '@/types/question';

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Single Choice',
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  fill_in_blank: 'Fill in the Blank',
};

const SAMPLE_QUESTIONS: QuestionItem[] = [
  {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    course_id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    chapter_id: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    lesson_id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    content: 'Which access modifier makes a member visible only inside the declaring class?',
    question_type: 'single_choice',
    difficulty: 'easy',
    status: 'approved',
    is_ai_generated: false,
    created_at: '2026-05-18T10:00:00Z',
    course_title: 'Object-Oriented Programming in C#',
    lesson_title: 'Access Modifiers',
  },
  {
    id: 'a2b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e',
    course_id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    chapter_id: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e',
    lesson_id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e',
    content: 'Select all statements that are true about interfaces in C#.',
    question_type: 'multiple_choice',
    difficulty: 'medium',
    status: 'approved',
    is_ai_generated: true,
    created_at: '2026-05-19T11:30:00Z',
    course_title: 'Object-Oriented Programming in C#',
    lesson_title: 'Interfaces',
  },
  {
    id: 'a3b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6f',
    course_id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    chapter_id: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    lesson_id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6f',
    content: 'A struct in C# is a reference type.',
    question_type: 'true_false',
    difficulty: 'easy',
    status: 'approved',
    is_ai_generated: false,
    created_at: '2026-05-20T08:15:00Z',
    course_title: 'C# Fundamentals',
    lesson_title: 'Data Types',
  },
  {
    id: 'a4b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c70',
    course_id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    chapter_id: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e',
    lesson_id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c70',
    content: 'Complete the code: the keyword used to prevent further overriding of a virtual member is ______.',
    question_type: 'fill_in_blank',
    difficulty: 'medium',
    status: 'approved',
    is_ai_generated: true,
    created_at: '2026-05-21T14:00:00Z',
    course_title: 'Object-Oriented Programming in C#',
    lesson_title: 'Inheritance and Polymorphism',
  },
];

type AssignedQuestion = {
  question: QuestionItem;
  score_weight: number;
};

function getErrorMessage(error: unknown) {
  return error instanceof ApiClientError
    ? error.message
    : 'Unable to complete the request. Please try again.';
}

function optionLabel(value: string, fallback: string) {
  return value || fallback;
}

function QuestionMeta({ question }: { question: QuestionItem }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
      <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5">
        {TYPE_LABELS[question.question_type]}
      </span>
      <span className="rounded-md border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-amber-700">
        {question.difficulty}
      </span>
      {question.lesson_title && <span>{question.lesson_title}</span>}
    </div>
  );
}

export default function QuizBuilderPage() {
  const params = useParams<{ id: string }>();
  const quizId = String(params.id ?? '');
  const [bankQuestions, setBankQuestions] = useState<QuestionItem[]>(SAMPLE_QUESTIONS);
  const [assignedQuestions, setAssignedQuestions] = useState<AssignedQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [courseId, setCourseId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPlacement, setIsLoadingPlacement] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadBuilder = async () => {
      try {
        const [configured, loadedCourses] = await Promise.all([
          quizApi.getQuestions(quizId),
          questionApi.listCourses(),
        ]);
        if (!active) return;

        const configuredItems = configured
          .filter((item) => item.questions)
          .map((item) => ({
            question: item.questions as QuestionItem,
            score_weight: item.score_weight,
          }));
        const configuredQuestions = configuredItems.map((item) => item.question);
        setAssignedQuestions(configuredItems);
        setBankQuestions((current) => {
          const knownIds = new Set(current.map((question) => question.id));
          return [...current, ...configuredQuestions.filter((question) => !knownIds.has(question.id))];
        });
        setCourses(loadedCourses);
      } catch (loadError) {
        if (active) setError(getErrorMessage(loadError));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadBuilder();
    return () => {
      active = false;
    };
  }, [quizId]);

  const filteredQuestions = useMemo(() => {
    const assignedIds = new Set(assignedQuestions.map((item) => item.question.id));
    return bankQuestions.filter((question) => {
      if (assignedIds.has(question.id)) return false;
      if (courseId && question.course_id !== courseId) return false;
      if (chapterId && question.chapter_id !== chapterId) return false;
      if (lessonId && question.lesson_id !== lessonId) return false;
      if (questionType && question.question_type !== questionType) return false;
      return true;
    });
  }, [assignedQuestions, bankQuestions, chapterId, courseId, lessonId, questionType]);

  const totalScore = assignedQuestions.reduce((sum, item) => sum + item.score_weight, 0);
  const allVisibleSelected =
    filteredQuestions.length > 0 && filteredQuestions.every((question) => selectedIds.includes(question.id));

  const handleCourseChange = async (nextCourseId: string) => {
    setCourseId(nextCourseId);
    setChapterId('');
    setLessonId('');
    setChapters([]);
    setLessons([]);
    setError(null);
    if (!nextCourseId) return;

    setIsLoadingPlacement(true);
    try {
      const loadedChapters = await questionApi.listChapters(nextCourseId);
      setChapters(loadedChapters);
    } catch (placementError) {
      setError(getErrorMessage(placementError));
    } finally {
      setIsLoadingPlacement(false);
    }
  };

  const handleChapterChange = async (nextChapterId: string) => {
    setChapterId(nextChapterId);
    setLessonId('');
    setLessons([]);
    if (!nextChapterId || !courseId) return;

    setIsLoadingPlacement(true);
    try {
      const loadedLessons = await questionApi.listLessons(courseId, nextChapterId);
      setLessons(loadedLessons);
    } catch (placementError) {
      setError(getErrorMessage(placementError));
    } finally {
      setIsLoadingPlacement(false);
    }
  };

  const toggleSelected = (questionId: string) => {
    setSelectedIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  };

  const toggleVisibleQuestions = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !filteredQuestions.some((question) => question.id === id));
      }
      return [...new Set([...current, ...filteredQuestions.map((question) => question.id)])];
    });
  };

  const addSelectedQuestions = () => {
    const selected = new Set(selectedIds);
    const additions = bankQuestions
      .filter((question) => selected.has(question.id))
      .map((question) => ({ question, score_weight: 1 }));
    setAssignedQuestions((current) => [...current, ...additions]);
    setSelectedIds([]);
  };

  const removeQuestion = (questionId: string) => {
    setAssignedQuestions((current) => current.filter((item) => item.question.id !== questionId));
  };

  const updateScore = (questionId: string, value: string) => {
    setAssignedQuestions((current) =>
      current.map((item) =>
        item.question.id === questionId
          ? { ...item, score_weight: Number(value) }
          : item,
      ),
    );
  };

  const saveConfiguration = async () => {
    if (assignedQuestions.some((item) => !Number.isFinite(item.score_weight) || item.score_weight < 0.1)) {
      setError('Each question score must be at least 0.1.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      await quizApi.configureQuestions(
        quizId,
        assignedQuestions.map((item) => ({
          question_id: item.question.id,
          score_weight: item.score_weight,
        })),
      );
      setSaveMessage('Quiz configuration saved.');
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F7444E]">Quiz builder</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Configure questions</h1>
        <p className="mt-1 text-sm text-gray-500">Build the question set and scoring for this quiz.</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </div>
      )}
      {saveMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {saveMessage}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <section className="rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#F7444E]" />
                <h2 className="text-base font-semibold text-gray-900">Question bank</h2>
              </div>
              <p className="mt-1 text-xs text-gray-500">Select approved questions to add to this quiz.</p>
            </div>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-[#F7444E]">
              {filteredQuestions.length} available
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Course</span>
              <select
                value={courseId}
                onChange={(event) => void handleCourseChange(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#F7444E] focus:ring-2 focus:ring-[#F7444E]/20"
              >
                <option value="">All courses</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Chapter</span>
              <select
                value={chapterId}
                onChange={(event) => void handleChapterChange(event.target.value)}
                disabled={!courseId || isLoadingPlacement}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#F7444E] focus:ring-2 focus:ring-[#F7444E]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
              >
                <option value="">All chapters</option>
                {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Lesson</span>
              <select
                value={lessonId}
                onChange={(event) => setLessonId(event.target.value)}
                disabled={!chapterId || isLoadingPlacement}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#F7444E] focus:ring-2 focus:ring-[#F7444E]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
              >
                <option value="">All lessons</option>
                {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Question type</span>
              <select
                value={questionType}
                onChange={(event) => setQuestionType(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#F7444E] focus:ring-2 focus:ring-[#F7444E]/20"
              >
                <option value="">All types</option>
                {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between border-y border-gray-100 py-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-600">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleVisibleQuestions}
                className="h-4 w-4 rounded border-gray-300 accent-[#F7444E]"
              />
              Select visible
            </label>
            <button
              type="button"
              onClick={addSelectedQuestions}
              disabled={selectedIds.length === 0 || isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#d93e47] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add to quiz ({selectedIds.length})
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="space-y-3" aria-label="Loading question bank">
                {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                No questions match these filters.
              </div>
            ) : (
              filteredQuestions.map((question) => {
                const isSelected = selectedIds.includes(question.id);
                return (
                  <label key={question.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${isSelected ? 'border-[#F7444E]/40 bg-rose-50/60' : 'border-gray-100 bg-gray-50/40 hover:border-gray-200 hover:bg-white'}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(question.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 accent-[#F7444E]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug text-gray-900">{question.content}</span>
                      <QuestionMeta question={question} />
                    </span>
                    {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F7444E]" />}
                  </label>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#F7444E]" />
                <h2 className="text-base font-semibold text-gray-900">Quiz configuration</h2>
              </div>
              <p className="mt-1 text-xs text-gray-500">Adjust weights or remove questions before saving.</p>
            </div>
            <button
              type="button"
              onClick={() => void saveConfiguration()}
              disabled={isSaving || isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#d93e47] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save configuration'}
            </button>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">Questions</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{assignedQuestions.length}</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">Total score</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{totalScore.toFixed(1)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-3" aria-label="Loading quiz configuration">
                {[1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-gray-100" />)}
              </div>
            ) : assignedQuestions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-500">
                Add questions from the bank to start configuring this quiz.
              </div>
            ) : (
              assignedQuestions.map((item, index) => (
                <div key={item.question.id} className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-xs font-bold text-[#F7444E]">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug text-gray-900">{item.question.content}</p>
                      <QuestionMeta question={item.question} />
                    </div>
                    <button
                      type="button"
                      title="Remove question"
                      aria-label={`Remove question ${index + 1}`}
                      onClick={() => removeQuestion(item.question.id)}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-[#F7444E]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <label className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3 text-xs font-semibold text-gray-500">
                    Score weight
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={item.score_weight}
                      onChange={(event) => updateScore(item.question.id, event.target.value)}
                      className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-right text-sm font-semibold text-gray-800 outline-none focus:border-[#F7444E] focus:ring-2 focus:ring-[#F7444E]/20"
                    />
                  </label>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <p className="text-xs text-gray-400">Quiz ID: {optionLabel(quizId, 'not provided')}</p>
    </div>
  );
}