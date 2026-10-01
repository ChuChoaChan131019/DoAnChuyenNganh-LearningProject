'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Save,
  SendHorizontal,
  GripVertical,
  Plus,
  Trash2,
  Check,
  HelpCircle,
  BookOpen,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import { ApiClientError, questionApi, topicApi } from '@/lib/api';
import { ChapterOption, CourseOption, LessonOption, QuestionPayload } from '@/types/question';

// ==========================================
// CENTRALIZED STYLES
// ==========================================
const STYLES = {
  sectionCard: 'bg-white border border-[#dfe6df] rounded-2xl p-5 shadow-xs',
  sectionTitle: 'text-base font-semibold text-[#002C3E]',
  label: 'block text-xs font-semibold text-[#637981] uppercase tracking-wider mb-1.5',
  select:
    'w-full text-sm border border-[#dfe6df] bg-white rounded-xl px-3.5 py-2.5 text-[#002C3E] focus:outline-none focus:ring-2 focus:ring-[#78BCC4]/20 focus:border-[#78BCC4] transition',
  textarea:
    'w-full text-sm border border-[#dfe6df] bg-white rounded-xl p-3.5 text-[#002C3E] placeholder:text-[#637981]/70 focus:outline-none focus:ring-2 focus:ring-[#78BCC4]/20 focus:border-[#78BCC4] transition leading-relaxed resize-y',

  optionRow: (isCorrect: boolean) =>
    `flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
      isCorrect
        ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 font-medium shadow-xs'
        : 'border-[#dfe6df] bg-white hover:border-[#637981]/40'
    }`,
  optionBadge: (isCorrect: boolean) =>
    `w-7 h-7 flex-shrink-0 flex items-center justify-center font-bold text-xs rounded-full border transition-colors ${
      isCorrect
        ? 'border-emerald-400 bg-white text-emerald-700'
        : 'border-[#dfe6df] bg-[#fbfcf8] text-[#637981]'
    }`,
  markBtn: (isCorrect: boolean) =>
    isCorrect
      ? 'inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white shadow-xs transition hover:bg-emerald-700'
      : 'inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg border border-[#dfe6df] text-[#637981] hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition',

  previewDifficultyBadge: {
    easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
    hard: 'bg-rose-50 text-rose-700 border-rose-200/60',
  },
  previewOptionCard: (isSelected: boolean) =>
    `w-full rounded-xl border p-3 flex items-center gap-3 transition-all cursor-pointer select-none text-left ${
      isSelected
        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-medium ring-1 ring-emerald-500/20'
        : 'bg-white border-[#dfe6df] text-[#002C3E] hover:border-[#637981]/30 hover:bg-[#f3f7f5]'
    }`,
  previewOptionCircle: (isSelected: boolean) =>
    `w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold transition ${
      isSelected ? 'bg-emerald-600 text-white' : 'border border-[#dfe6df] text-[#637981]'
    }`,
};

// ==========================================
// TYPES & INTERFACES
// ==========================================
export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_in_blank';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface AnswerOption {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionFormData {
  course: string;
  chapter: string;
  lesson: string;
  topic: string;
  type: QuestionType;
  difficulty: Difficulty;
  content: string;
  explanation: string;
  status: 'draft' | 'approved';
  options: AnswerOption[];
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function getApiErrorMessage(error: unknown): string {
  return error instanceof ApiClientError
    ? error.message
    : 'Unable to complete the request. Please try again.';
}

function normalizeNullableId(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function QuestionEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questionId = searchParams.get('id');
  const [formData, setFormData] = useState<QuestionFormData>({
    course: '',
    chapter: '',
    lesson: '',
    topic: '',
    type: 'single_choice',
    difficulty: 'easy',
    content: '',
    explanation: '',
    status: 'draft',
    options: [
      { id: '1', label: 'A', text: '', isCorrect: false },
      { id: '2', label: 'B', text: '', isCorrect: false }
    ]
  });

  const [previewSelectedOptionId, setPreviewSelectedOptionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [createdQuestionId, setCreatedQuestionId] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [topics, setTopics] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  useEffect(() => {
    if (!questionId) return;

    let active = true;
    const loadQuestion = async () => {
      setIsLoadingChapters(true);
      setIsLoadingLessons(true);
      try {
        const question = await questionApi.getById(questionId);
        const courseId = String(question.course_id ?? question.course?.id ?? '');
        const chapterId = String(question.chapter_id ?? question.chapter?.id ?? '');
        const lessonId = String(question.lesson_id ?? question.lesson?.id ?? '');
        const loadedChapters = courseId ? await questionApi.listChapters(courseId) : [];
        const loadedLessons = courseId && chapterId
          ? await questionApi.listLessons(courseId, chapterId)
          : [];
        const loadedOptions = (question.options ?? [])
          .slice()
          .sort((first: { order_index?: number }, second: { order_index?: number }) => (first.order_index ?? 0) - (second.order_index ?? 0))
          .map((option: { id?: string; option_text?: string; is_correct?: boolean }, index: number) => ({
            id: String(option.id ?? `${questionId}-option-${index}`),
            label: OPTION_LABELS[index] ?? String(index + 1),
            text: option.option_text ?? '',
            isCorrect: Boolean(option.is_correct),
          }));
        const topic = Array.isArray(question.topics) ? question.topics[0] : null;
        const topicId = typeof topic === 'string' ? topic : String(topic?.topic_id ?? topic?.id ?? '');

        if (!active) return;
        setChapters(loadedChapters);
        setLessons(loadedLessons);
        setFormData((current) => ({
          ...current,
          course: courseId,
          chapter: chapterId,
          lesson: lessonId,
          topic: topicId,
          type: question.question_type,
          difficulty: question.difficulty,
          content: question.content ?? '',
          explanation: question.explanation ?? '',
          status: question.status,
          options: loadedOptions,
        }));
      } catch (error: unknown) {
        if (active) setPlacementError(getApiErrorMessage(error));
      } finally {
        if (active) {
          setIsLoadingChapters(false);
          setIsLoadingLessons(false);
        }
      }
    };

    void loadQuestion();
    return () => { active = false; };
  }, [questionId]);

  const handleCourseChange = async (course: string) => {
    const courseId = String(course);
    setIsLoadingChapters(true);
    setIsLoadingLessons(false);
    setPlacementError(null);
    setChapters([]);
    setLessons([]);
    setFormData((prev) => ({ ...prev, course: courseId, chapter: '', lesson: '' }));

    try {
      const nextChapters = await questionApi.listChapters(courseId);
      setChapters(nextChapters);
    } catch (error: unknown) {
      setChapters([]);
      setLessons([]);
      setPlacementError(getApiErrorMessage(error));
    } finally {
      setIsLoadingChapters(false);
      setIsLoadingLessons(false);
    }
  };

  const handleChapterChange = async (chapter: string) => {
    const chapterId = String(chapter);
    setIsLoadingLessons(true);
    setPlacementError(null);
    setLessons([]);
    setFormData((prev) => ({ ...prev, chapter: chapterId, lesson: '' }));

    try {
      const nextLessons = chapterId ? await questionApi.listLessons(formData.course, chapterId) : [];
      setLessons(nextLessons);
    } catch (error: unknown) {
      setLessons([]);
      setPlacementError(getApiErrorMessage(error));
    } finally {
      setIsLoadingLessons(false);
    }
  };

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const items = await questionApi.listCourses();
        setCourses(items);
      } catch (error: unknown) {
        setPlacementError(getApiErrorMessage(error));
      } finally {
        setIsLoadingCourses(false);
      }
    };

    void loadCourses();
  }, []);

  useEffect(() => {
    topicApi.list().then(setTopics).catch((error: unknown) => {
      alert(getApiErrorMessage(error));
    });
  }, []);

  const handleCreateTopic = async () => {
    const name = newTopicName.trim();
    if (!name || isCreatingTopic) return;

    setIsCreatingTopic(true);
    try {
      const createdTopic = await topicApi.create(name);
      setTopics((current) => [...current, createdTopic]);
      setFormData((current) => ({ ...current, topic: createdTopic.id }));
      setNewTopicName('');
    } catch (error: unknown) {
      alert(getApiErrorMessage(error));
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const handleOptionTextChange = (id: string, text: string) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((opt) => (opt.id === id ? { ...opt, text } : opt))
    }));
  };

  const handleMarkCorrect = (id: string) => {
    setFormData((prev) => {
      if (prev.type === 'single_choice' || prev.type === 'true_false') {
        return {
          ...prev,
          options: prev.options.map((opt) => ({
            ...opt,
            isCorrect: opt.id === id
          }))
        };
      }
      return {
        ...prev,
        options: prev.options.map((opt) => (opt.id === id ? { ...opt, isCorrect: !opt.isCorrect } : opt))
      };
    });
  };

  const handleAddOption = () => {
    if (formData.options.length >= OPTION_LABELS.length) return;
    const nextIndex = formData.options.length;
    const newOption: AnswerOption = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      label: OPTION_LABELS[nextIndex],
      text: '',
      isCorrect: false
    };

    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, newOption]
    }));
  };

  const handleDeleteOption = (id: string) => {
    if (formData.options.length <= 2) {
      alert('A question must contain at least 2 options.');
      return;
    }

    setFormData((prev) => {
      const filtered = prev.options.filter((opt) => opt.id !== id);
      return {
        ...prev,
        options: filtered.map((opt, index) => ({
          ...opt,
          label: OPTION_LABELS[index]
        }))
      };
    });

    if (previewSelectedOptionId === id) {
      setPreviewSelectedOptionId(null);
    }
  };

  const buildPayload = (status: 'draft' | 'approved'): QuestionPayload => ({
    course_id: formData.course,
    chapter_id: normalizeNullableId(formData.chapter),
    lesson_id: normalizeNullableId(formData.lesson),
    question_type: formData.type,
    difficulty: formData.difficulty,
    content: formData.content,
    explanation: formData.explanation || null,
    status,
    topic_ids: formData.topic ? [formData.topic] : [],
    options: formData.type === 'fill_in_blank' ? [] : formData.options.map((option, index) => ({
      option_text: option.text,
      is_correct: option.isCorrect,
      order_index: index,
    })),
  });

  const validateForm = () => {
    if (!formData.course.trim()) {
      alert('Vui lòng chọn Course');
      return false;
    }
    if (!formData.topic.trim()) {
      alert('Please select a topic.');
      return false;
    }
    if (!formData.content.trim()) {
      alert('Please enter question content.');
      return false;
    }
    if (!formData.explanation.trim()) {
      alert('Please enter an explanation.');
      return false;
    }
    if (formData.type !== 'fill_in_blank') {
      if (formData.options.length < 2) {
        alert('A question must contain at least 2 options.');
        return false;
      }
      const emptyOption = formData.options.find((option) => !option.text.trim());
      if (emptyOption) {
        alert(`Please fill in option ${emptyOption.label}.`);
        return false;
      }
      if (!formData.options.some((option) => option.isCorrect)) {
        alert('Please mark at least one correct answer.');
        return false;
      }
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const existingId = questionId ?? createdQuestionId;
      const saved = existingId
        ? await questionApi.update(existingId, buildPayload('draft'))
        : await questionApi.create(buildPayload('draft'));
      if (!questionId) setCreatedQuestionId(saved.id);
      alert('Draft saved successfully!');
    } catch (error: unknown) {
      alert(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const existingId = questionId ?? createdQuestionId;
      const saved = existingId
        ? { id: existingId }
        : await questionApi.create(buildPayload('draft'));
      if (!questionId) setCreatedQuestionId(saved.id);
      await questionApi.submitForReview(saved.id);
      alert('Question submitted for review!');
    } catch (error: unknown) {
      alert(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!questionId || !validateForm()) return;

    setIsUpdating(true);
    try {
      await questionApi.update(questionId, buildPayload(formData.status));
      alert('Question updated successfully!');
      router.push('/content-manager/questions/bank');
    } catch (error: unknown) {
      alert(getApiErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#002C3E] sm:text-3xl">
            {questionId ? 'Update Question' : 'Question editor'}
          </h1>
          <p className="mt-1 text-sm text-[#637981]">
            Accuracy first: every question needs a correct answer and an explanation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {questionId ? (
            <button
              type="button"
              onClick={() => void handleUpdate()}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-opacity hover:bg-[#db3540] disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              <span>{isUpdating ? 'Updating...' : 'Update Question'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void handleSaveDraft()}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 py-2 text-sm font-semibold text-[#002C3E] shadow-xs transition-colors hover:bg-[#f3f7f5] disabled:opacity-60"
              >
                <Save className="h-4 w-4 text-[#637981]" />
                <span>{isSaving ? 'Saving...' : 'Save draft'}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitForReview()}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-opacity hover:bg-[#db3540] disabled:opacity-60"
              >
                <SendHorizontal className="h-4 w-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit for review'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Form & Preview */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column */}
        <div className="lg:col-span-8 space-y-5">
          {/* Section 1: Placement */}
          <section className={`${STYLES.sectionCard} space-y-4`}>
            <div className="flex items-center gap-2 pb-2 border-b border-[#dfe6df]">
              <BookOpen className="w-4 h-4 text-[#637981]" />
              <h2 className={STYLES.sectionTitle}>Placement</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
              <div>
                <label className={STYLES.label}>Course</label>
                <select
                  value={formData.course}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  disabled={isLoadingCourses || isLoadingChapters}
                  className={STYLES.select}
                >
                  {isLoadingCourses ? (
                    <option value="">Loading courses...</option>
                  ) : (
                    <option value="">Select course...</option>
                  )}
                  {!isLoadingCourses && courses.length === 0 && <option value="">No courses found</option>}
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={STYLES.label}>Chapter</label>
                <select
                  value={formData.chapter}
                  onChange={(e) => handleChapterChange(e.target.value)}
                  disabled={isLoadingCourses || isLoadingChapters || !formData.course}
                  className={STYLES.select}
                >
                  {isLoadingChapters ? (
                    <option value="">Loading chapters...</option>
                  ) : (
                    <option value="">None</option>
                  )}
                  {!isLoadingChapters && formData.course && chapters.length === 0 && <option value="">No chapters found</option>}
                  {chapters.map((chap) => (
                    <option key={chap.id} value={chap.id}>{chap.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={STYLES.label}>Lesson</label>
                <select
                  value={formData.lesson}
                  onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
                  disabled={isLoadingLessons || !formData.chapter}
                  className={STYLES.select}
                >
                  {isLoadingLessons ? (
                    <option value="">Loading lessons...</option>
                  ) : (
                    <option value="">None</option>
                  )}
                  {!isLoadingLessons && formData.chapter && lessons.length === 0 && <option value="">No lessons found</option>}
                  {lessons.map((les) => (
                    <option key={les.id} value={les.id}>{les.title}</option>
                  ))}
                </select>
              </div>
            </div>
            {placementError && (
              <p className="text-sm text-red-600" role="alert">{placementError}</p>
            )}
          </section>

          {/* Section 2: Question Details */}
          <section className={`${STYLES.sectionCard} space-y-4`}>
            <div className="flex items-center gap-2 pb-2 border-b border-[#dfe6df]">
              <FileText className="w-4 h-4 text-[#637981]" />
              <h2 className={STYLES.sectionTitle}>Question</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className={STYLES.label}>Question type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as QuestionType })}
                  className={STYLES.select}
                >
                  <option value="single_choice" className="bg-white text-[#002C3E]">Single Choice</option>
                  <option value="multiple_choice" className="bg-white text-[#002C3E]">Multiple Choice</option>
                  <option value="true_false" className="bg-white text-[#002C3E]">True / False</option>
                  <option value="fill_in_blank" className="bg-white text-[#002C3E]">Fill in the blank</option>
                </select>
              </div>

              <div>
                <label className={STYLES.label}>Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                  className={STYLES.select}
                >
                  <option value="easy" className="bg-white text-[#002C3E]">Easy</option>
                  <option value="medium" className="bg-white text-[#002C3E]">Medium</option>
                  <option value="hard" className="bg-white text-[#002C3E]">Hard</option>
                </select>
              </div>

              <div>
                <label className={STYLES.label}>Topic</label>
                <select
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className={STYLES.select}
                >
                  <option value="" className="bg-white text-[#002C3E]">Select a topic...</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id} className="bg-white text-[#002C3E]">{topic.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={STYLES.label}>Question content</label>
              <textarea
                rows={3}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter the main question statement..."
                className={STYLES.textarea}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#637981] uppercase tracking-wider">
                  Explanation
                </label>
                <span className="text-xs text-[#637981] flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> Shown after answering
                </span>
              </div>
              <textarea
                rows={3}
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="Explain why the correct answer is right and why others are wrong..."
                className={STYLES.textarea}
              />
            </div>
          </section>

          {/* Section 3: Answer Options */}
          <section className={`${STYLES.sectionCard} space-y-4`}>
            <div className="flex items-center justify-between pb-2 border-b border-[#dfe6df]">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#637981]" />
                  <h2 className={STYLES.sectionTitle}>Answer options</h2>
                </div>
                <p className="text-xs text-[#637981] mt-0.5">
                  {formData.type === 'multiple_choice'
                    ? 'Mark one or more correct options'
                    : 'Mark exactly one correct option'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddOption}
                disabled={formData.options.length >= OPTION_LABELS.length}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#002C3E] hover:text-[#F7444E] px-3 py-1.5 rounded-lg border border-[#dfe6df] hover:bg-[#f3f7f5] transition disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                <span>Add option</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {formData.options.map((option) => (
                <div key={option.id} className={STYLES.optionRow(option.isCorrect)}>
                  <div className="cursor-grab text-[#637981] hover:text-[#002C3E] transition">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <div className={STYLES.optionBadge(option.isCorrect)}>
                    {option.label}
                  </div>

                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => handleOptionTextChange(option.id, e.target.value)}
                    placeholder={`Option ${option.label} content...`}
                    className="flex-1 bg-transparent text-sm text-[#002C3E] placeholder:text-[#637981]/70 focus:outline-none px-1"
                  />

                  <button
                    type="button"
                    onClick={() => handleMarkCorrect(option.id)}
                    className={STYLES.markBtn(option.isCorrect)}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{option.isCorrect ? 'Correct' : 'Mark'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteOption(option.id)}
                    className="text-[#637981] hover:text-[#F7444E] p-1.5 rounded-lg hover:bg-rose-50 transition"
                    title="Delete option"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {!formData.options.some((opt) => opt.isCorrect) && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Remember to mark at least one correct option for students.</span>
              </div>
            )}
          </section>
        </div>

        {/* Live Preview Column */}
        <aside className="lg:col-span-4 sticky top-6 space-y-5">
          <div className={`${STYLES.sectionCard} space-y-5`}>
            <div className="pb-3 border-b border-[#dfe6df]">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-[#002C3E] text-base">Live preview</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#dfe6df]/50 text-[#637981]">
                  Interactive
                </span>
              </div>
              <p className="text-xs text-[#637981] mt-0.5">
                Exactly what the student will see
              </p>
            </div>

            {/* Quiz Preview Card */}
            <div className="bg-[#fbfcf8] rounded-2xl border border-[#dfe6df] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#637981] uppercase tracking-wide">
                  Question 1 of 15
                </span>
                <span
                  className={`capitalize px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    STYLES.previewDifficultyBadge[formData.difficulty]
                  }`}
                >
                  {formData.difficulty}
                </span>
              </div>

              <div className="text-[#002C3E] font-semibold text-sm leading-relaxed">
                {formData.content.trim() ? (
                  formData.content
                ) : (
                  <span className="text-[#637981]/70 italic font-normal">
                    Question text will appear here...
                  </span>
                )}
              </div>

              <div className="space-y-2 pt-1">
                {formData.options.map((option) => {
                  const isSelected = previewSelectedOptionId === option.id;
                  return (
                    <div
                      key={option.id}
                      onClick={() => setPreviewSelectedOptionId(option.id)}
                      className={STYLES.previewOptionCard(isSelected)}
                    >
                      <div className={STYLES.previewOptionCircle(isSelected)}>
                        {option.label}
                      </div>
                      <span className="text-xs sm:text-sm flex-1 break-words">
                        {option.text.trim() ? (
                          option.text
                        ) : (
                          <span className="text-[#637981]/60 italic">Empty option...</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {formData.explanation.trim() && (
                <div className="mt-3 pt-3 border-t border-[#dfe6df] text-xs space-y-1.5">
                  <span className="font-semibold text-[#002C3E] flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[#637981]" /> Explanation Reference:
                  </span>
                  <p className="text-[#637981] leading-relaxed bg-white p-2.5 rounded-lg border border-[#dfe6df]">
                    {formData.explanation}
                  </p>
                </div>
              )}
            </div>

            <div className="text-[11px] text-[#637981] text-center leading-relaxed">
              Changes made in the form on the left are synchronized in real-time.
            </div>
          </div>

          <div className={`${STYLES.sectionCard} space-y-4`}>
            <div>
              <h2 className={STYLES.sectionTitle}>Topics &amp; Tags</h2>
              <p className="mt-1 text-xs text-[#637981]">Select or add knowledge topics for this question</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => {
                const isSelected = formData.topic === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setFormData((current) => ({ ...current, topic: topic.id }))}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${isSelected
                      ? 'border-[#F7444E] bg-[#F7444E] text-white'
                      : 'border-[#dfe6df] bg-[#fbfcf8] text-[#002C3E] hover:border-[#dfe6df]/80 hover:bg-[#dfe6df]/30'
                      }`}
                  >
                    {topic.name}
                  </button>
                );
              })}
              {topics.length === 0 && <span className="text-xs text-[#637981]">No topics found.</span>}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateTopic();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={newTopicName}
                onChange={(event) => setNewTopicName(event.target.value)}
                placeholder="Enter new topic name..."
                className="min-w-0 flex-1 rounded-xl border border-[#dfe6df] bg-white px-3 py-2 text-xs text-[#002C3E] placeholder:text-[#637981]/70 focus:border-[#78BCC4] focus:outline-none focus:ring-2 focus:ring-[#78BCC4]/20"
              />
              <button
                type="submit"
                disabled={!newTopicName.trim() || isCreatingTopic}
                className="inline-flex items-center gap-1 rounded-xl bg-[#F7444E] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:bg-[#db3540] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </form>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default function QuestionEditorPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-10 text-sm text-gray-500">Loading question editor...</div>}>
      <QuestionEditorContent />
    </Suspense>
  );
}