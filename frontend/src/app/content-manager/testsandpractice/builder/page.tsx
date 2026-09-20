'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye,
  Settings,
  Search,
  Plus,
  Minus,
  GripVertical,
  BookOpen,
  Layers,
} from 'lucide-react';
import { DifficultyLevel, QuestionType, QuestionItem } from '@/types/question';
import { courseApi, questionApi, quizApi } from '@/lib/api';

const STYLES = {
  pageContainer: 'mx-auto max-w-7xl space-y-6 pb-12',
  card: 'bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col h-full',
  cardHeader: 'pb-3 mb-4 border-b border-border flex items-center justify-between',
  cardTitle: 'text-base font-semibold text-foreground',

  primaryBtn:
    'inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50',
  secondaryBtn:
    'inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-muted active:scale-[0.98]',
  addBtn:
    'inline-flex items-center gap-1 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 px-2.5 py-1 rounded-lg transition active:scale-[0.96]',
  removeBtn:
    'p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition active:scale-[0.96]',

  bankItemCard:
    'p-3 rounded-xl border border-border hover:border-border/80 bg-muted/40 hover:bg-card transition-all space-y-2.5',
  selectedItemCard:
    'p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all flex items-start gap-2.5 group',

  difficultyBadges: {
    easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    medium: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    hard: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
  },
};

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Single Choice',
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  fill_in_blank: 'Fill in the Blank',
};

function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  const formatted = level ? level.charAt(0).toUpperCase() + level.slice(1) : 'Medium';
  const badgeStyle = STYLES.difficultyBadges[level] || STYLES.difficultyBadges.medium;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badgeStyle}`}
    >
      {formatted}
    </span>
  );
}

interface QuestionDisplayItem {
  id: string;
  title: string;
  type: QuestionType;
  lesson: string;
  difficulty: DifficultyLevel;
  score_weight?: number;
}

interface CourseItem {
  id: string;
  title: string;
}

function TestBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = searchParams.get('quizId') || searchParams.get('id');

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [bankQuestions, setBankQuestions] = useState<QuestionDisplayItem[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<QuestionDisplayItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 1. Tải danh sách khóa học và nạp câu hỏi đã chọn nếu có quizId
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const rawCourses = await courseApi.list().catch(() => []);
        if (!isMounted) return;

        const mappedCourses: CourseItem[] = (rawCourses || []).map((c: any) => ({
          id: String(c.id),
          title: c.title,
        }));
        setCourses(mappedCourses);

        if (quizId) {
          const [quizData, quizQuestionsData] = await Promise.all([
            quizApi.getById(quizId).catch(() => null),
            quizApi.getQuestions(quizId).catch(() => []),
          ]);

          if (!isMounted) return;

          if (quizData?.course_id) {
            setSelectedCourseId(String(quizData.course_id));
          }

          if (Array.isArray(quizQuestionsData) && quizQuestionsData.length > 0) {
            const mappedSelected: QuestionDisplayItem[] = quizQuestionsData.map((item: any) => {
              const q = item.questions || item;
              return {
                id: String(item.question_id || q.id),
                title: q.content || q.title || 'Untitled question',
                type: (q.question_type || q.type || 'single_choice') as QuestionType,
                lesson: q.lesson?.title || q.lesson || 'General',
                difficulty: (q.difficulty || 'medium') as DifficultyLevel,
                score_weight: Number(item.score_weight) || 1.0,
              };
            });
            setSelectedQuestions(mappedSelected);
          }
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [quizId]);

  // 2. Tải câu hỏi từ ngân hàng: chỉ lấy câu hỏi đã approved theo quy chuẩn backend
  useEffect(() => {
    let isMounted = true;

    questionApi
      .list({
        course_id: selectedCourseId ? selectedCourseId : undefined,
        status: 'approved' as any,
      })
      .then((data: QuestionItem[]) => {
        if (!isMounted) return;
        const mappedBank: QuestionDisplayItem[] = (data || []).map((q: any) => ({
          id: String(q.id),
          title: q.content,
          type: q.question_type as QuestionType,
          lesson: q.lesson?.title || 'General',
          difficulty: q.difficulty as DifficultyLevel,
          score_weight: 1.0,
        }));
        setBankQuestions(mappedBank);
      })
      .catch((err: unknown) => console.error('Error fetching question bank:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedCourseId]);

  // 3. Lọc danh sách câu hỏi khả dụng theo từ khóa tìm kiếm
  const availableQuestions = useMemo(() => {
    const selectedIds = new Set(selectedQuestions.map((q) => q.id));
    return bankQuestions
      .filter((q) => !selectedIds.has(q.id))
      .filter(
        (q) =>
          q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.lesson.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [bankQuestions, selectedQuestions, searchQuery]);

  const handleAddQuestion = (question: QuestionDisplayItem) => {
    setSelectedQuestions((prev) => [...prev, { ...question, score_weight: question.score_weight || 1.0 }]);
  };

  const handleRemoveQuestion = (id: string) => {
    setSelectedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // 4. Lưu câu hỏi vào quiz_questions và chuyển tiếp sang trang quizzes/[id]/builder
  const handleSaveQuestions = async () => {
    if (selectedQuestions.length === 0) {
      alert('Vui lòng chọn ít nhất 1 câu hỏi vào bài kiểm tra.');
      return;
    }

    try {
      setIsSaving(true);
      let targetQuizId = quizId;

      if (!targetQuizId) {
        const defaultCourseId = selectedCourseId || (courses.length > 0 ? courses[0].id : '');
        if (!defaultCourseId) {
          alert('Vui lòng tạo hoặc chọn một khóa học trước khi lưu.');
          return;
        }

        const createdQuiz = await quizApi.create({
          title: 'Bài kiểm tra mới',
          course_id: defaultCourseId,
          quiz_type: 'exam',
          pass_score: 50,
          visibility: 'private',
          status: 'draft',
          shuffle_questions: true,
          shuffle_options: true,
        });
        targetQuizId = createdQuiz.id;
      }

      await quizApi.configureQuestions(
        targetQuizId,
        selectedQuestions.map((q) => ({
          question_id: q.id,
          score_weight: q.score_weight || 1.0,
        })) as any
      );

      router.push(`/content-manager/quizzes/${targetQuizId}/builder`);
    } catch (error: any) {
      console.error('Lỗi khi lưu câu hỏi:', error);
      alert(error?.message || 'Lưu câu hỏi thất bại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={STYLES.pageContainer}>
      {/* Header Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Test builder
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn các câu hỏi từ ngân hàng câu hỏi để hoàn thiện bài kiểm tra.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => alert('Opening preview modal...')}
            className={STYLES.secondaryBtn}
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span>Preview test</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveQuestions}
            className={STYLES.primaryBtn}
          >
            <Settings className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Setting test'}</span>
          </button>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Card 1: Question Bank (5/12 cột) */}
        <div className="lg:col-span-5">
          <div className={STYLES.card}>
            <div className={STYLES.cardHeader}>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <h2 className={STYLES.cardTitle}>Question bank</h2>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {availableQuestions.length} available
              </span>
            </div>

            {/* Filter Course & Search */}
            <div className="space-y-2 mb-3">
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full text-xs bg-card border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer"
              >
                <option value="" className="bg-card text-foreground">All courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id} className="bg-card text-foreground">
                    {c.title}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions..."
                  className="w-full text-xs bg-background border border-border rounded-xl pl-8 pr-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-teal-600 transition"
                />
              </div>
            </div>

            <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
              {availableQuestions.length > 0 ? (
                availableQuestions.map((q) => (
                  <div key={q.id} className={STYLES.bankItemCard}>
                    <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                      {q.title}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <DifficultyBadge level={q.difficulty} />
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {TYPE_LABELS[q.type]}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion(q)}
                        className={STYLES.addBtn}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No available questions found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Selected Questions (7/12 cột) */}
        <div className="lg:col-span-7">
          <div className={STYLES.card}>
            <div className={STYLES.cardHeader}>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <h2 className={STYLES.cardTitle}>Selected questions</h2>
              </div>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                {selectedQuestions.length} in this test
              </span>
            </div>

            <div className="space-y-2.5 min-h-[350px] max-h-[690px] overflow-y-auto pr-1">
              {selectedQuestions.length > 0 ? (
                selectedQuestions.map((q, index) => (
                  <div key={q.id} className={STYLES.selectedItemCard}>
                    <div className="flex items-center gap-1 text-muted-foreground pt-0.5">
                      <GripVertical className="w-4 h-4 cursor-grab text-muted-foreground/60 group-hover:text-foreground" />
                      <span className="text-xs font-bold text-muted-foreground w-4 text-center">
                        {index + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-snug">
                        {q.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <DifficultyBadge level={q.difficulty} />
                        <span className="text-[11px] text-muted-foreground truncate">
                          {TYPE_LABELS[q.type]} · {q.lesson}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className={STYLES.removeBtn}
                      title="Remove from test"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border rounded-xl">
                  <Layers className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-medium text-muted-foreground">
                    No questions selected
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    Click + Add on any question from the bank
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TestBuilderPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-10 text-sm text-gray-500">Loading test builder...</div>}>
      <TestBuilderContent />
    </Suspense>
  );
}