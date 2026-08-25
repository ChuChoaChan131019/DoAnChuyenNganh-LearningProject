'use client';

import React, { useState } from 'react';
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

// ==========================================
// CENTRALIZED STYLES
// ==========================================
const STYLES = {
  sectionCard: 'bg-[#FFFAFC]/50 border border-gray-200/80 rounded-2xl p-5 shadow-sm',
  sectionTitle: 'text-base font-semibold text-gray-900',
  label: 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5',
  select:
    'w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F7444E]/20 focus:border-[#F7444E] transition',
  textarea:
    'w-full text-sm  border border-gray-200 rounded-xl p-3.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F7444E]/20 focus:border-[#F7444E] transition leading-relaxed resize-y',

  optionRow: (isCorrect: boolean) =>
    `flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
      isCorrect
        ? 'border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-400/20'
        : 'border-gray-200 bg-white hover:border-gray-300'
    }`,
  optionBadge: (isCorrect: boolean) =>
    `w-7 h-7 flex-shrink-0 flex items-center justify-center font-bold text-xs rounded-lg transition-colors ${
      isCorrect ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
    }`,
  markBtn: (isCorrect: boolean) =>
    isCorrect
      ? 'inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700'
      : 'inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition',

  previewDifficultyBadge: {
    easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
    hard: 'bg-rose-50 text-rose-700 border-rose-200/60'
  },
  previewOptionCard: (isSelected: boolean) =>
    `w-full rounded-xl border p-3 flex items-center gap-3 transition-all cursor-pointer select-none text-left ${
      isSelected
        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-medium ring-1 ring-emerald-500/20'
        : 'bg-[#FFFAFC]/50 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50/80'
    }`,
  previewOptionCircle: (isSelected: boolean) =>
    `w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold transition ${
      isSelected ? 'bg-emerald-600 text-white' : 'border border-gray-300 text-gray-500'
    }`
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
  type: QuestionType;
  difficulty: Difficulty;
  content: string;
  explanation: string;
  options: AnswerOption[];
}

const COURSES = [
  'Object-Oriented Programming',
  'Data Structures & Algorithms',
  'Web Development with Next.js',
  'Introduction to AI & Machine Learning'
];

const CHAPTERS: Record<string, string[]> = {
  'Object-Oriented Programming': ['Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction'],
  'Data Structures & Algorithms': ['Arrays & Strings', 'Linked Lists', 'Trees & Graphs'],
  'Web Development with Next.js': ['Routing & Layouts', 'Server Actions', 'Rendering Strategies'],
  'Introduction to AI & Machine Learning': ['Linear Regression', 'Neural Networks', 'Transformers']
};

const LESSONS: Record<string, string[]> = {
  'Encapsulation': ['Access Modifiers', 'Getters & Setters', 'Data Hiding Principles'],
  'Inheritance': ['Base & Derived Classes', 'Method Overriding'],
  'Polymorphism': ['Dynamic Method Dispatch', 'Interfaces & Abstract Classes'],
  'Abstraction': ['Abstract Classes vs Interfaces', 'Contract-based Design']
};

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function QuestionEditorPage() {
  const [formData, setFormData] = useState<QuestionFormData>({
    course: 'Object-Oriented Programming',
    chapter: 'Encapsulation',
    lesson: 'Access Modifiers',
    type: 'single_choice',
    difficulty: 'easy',
    content: 'Which access modifier makes a member visible only inside the declaring class?',
    explanation: 'private restricts access to the declaring type. protected also allows derived types, internal allows the same assembly.',
    options: [
      { id: '1', label: 'A', text: 'public', isCorrect: false },
      { id: '2', label: 'B', text: 'private', isCorrect: true },
      { id: '3', label: 'C', text: 'protected', isCorrect: false },
      { id: '4', label: 'D', text: 'internal', isCorrect: false }
    ]
  });

  const [previewSelectedOptionId, setPreviewSelectedOptionId] = useState<string | null>('2');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleCourseChange = (course: string) => {
    const chapters = CHAPTERS[course] || [];
    const newChapter = chapters[0] || '';
    const lessons = LESSONS[newChapter] || [];
    setFormData((prev) => ({
      ...prev,
      course,
      chapter: newChapter,
      lesson: lessons[0] || ''
    }));
  };

  const handleChapterChange = (chapter: string) => {
    const lessons = LESSONS[chapter] || [];
    setFormData((prev) => ({
      ...prev,
      chapter,
      lesson: lessons[0] || ''
    }));
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

  const handleSaveDraft = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Draft saved successfully!');
    }, 500);
  };

  const handleSubmitForReview = () => {
    const hasCorrectOption = formData.options.some((opt) => opt.isCorrect);
    if (!hasCorrectOption) {
      alert('Please mark at least one correct answer before submitting.');
      return;
    }
    if (!formData.content.trim()) {
      alert('Please enter question content.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Question submitted for review!');
    }, 500);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Question editor
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Accuracy first: every question needs a correct answer and an explanation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <Save className="h-4 w-4 text-gray-500" />
            <span>{isSaving ? 'Saving...' : 'Save draft'}</span>
          </button>
          <button
            type="button"
            onClick={handleSubmitForReview}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c93f3a] disabled:opacity-60"
          >
            <SendHorizontal className="h-4 w-4" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit for review'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Form & Preview */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column */}
        <div className="lg:col-span-8 space-y-5">
          {/* Section 1: Placement */}
          <section className={`${STYLES.sectionCard} space-y-4`}>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <h2 className={STYLES.sectionTitle}>Placement</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
              <div>
                <label className={STYLES.label}>Course</label>
                <select
                  value={formData.course}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className={STYLES.select}
                >
                  {COURSES.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={STYLES.label}>Chapter</label>
                <select
                  value={formData.chapter}
                  onChange={(e) => handleChapterChange(e.target.value)}
                  className={STYLES.select}
                >
                  {(CHAPTERS[formData.course] || []).map((chap) => (
                    <option key={chap} value={chap}>{chap}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={STYLES.label}>Lesson</label>
                <select
                  value={formData.lesson}
                  onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
                  className={STYLES.select}
                >
                  {(LESSONS[formData.chapter] || []).map((les) => (
                    <option key={les} value={les}>{les}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Section 2: Question Details */}
          <section className={`${STYLES.sectionCard} space-y-4`}>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <FileText className="w-4 h-4 text-gray-400" />
              <h2 className={STYLES.sectionTitle}>Question</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className={STYLES.label}>Question type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as QuestionType })}
                  className={STYLES.select}
                >
                  <option value="single_choice">Single Choice</option>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="fill_in_blank">Fill in the blank</option>
                </select>
              </div>

              <div>
                <label className={STYLES.label}>Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                  className={STYLES.select}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
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
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Explanation
                </label>
                <span className="text-xs text-gray-400 flex items-center gap-1">
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
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-400" />
                  <h2 className={STYLES.sectionTitle}>Answer options</h2>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formData.type === 'multiple_choice'
                    ? 'Mark one or more correct options'
                    : 'Mark exactly one correct option'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddOption}
                disabled={formData.options.length >= OPTION_LABELS.length}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                <span>Add option</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {formData.options.map((option) => (
                <div key={option.id} className={STYLES.optionRow(option.isCorrect)}>
                  <div className="cursor-grab text-gray-400 hover:text-gray-600 transition">
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
                    className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none px-1"
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
                    className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"
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
        <aside className="lg:col-span-4 sticky top-6">
          <div className={`${STYLES.sectionCard} space-y-5`}>
            <div className="pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-base">Live preview</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                  Interactive
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Exactly what the student will see
              </p>
            </div>

            {/* Quiz Preview Card */}
            <div className="bg-gray-50/70 rounded-2xl border border-gray-200/80 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
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

              <div className="text-gray-900 font-semibold text-sm leading-relaxed">
                {formData.content.trim() ? (
                  formData.content
                ) : (
                  <span className="text-gray-400 italic font-normal">
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
                          <span className="text-gray-300 italic">Empty option...</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {formData.explanation.trim() && (
                <div className="mt-3 pt-3 border-t border-gray-200/70 text-xs space-y-1.5">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-400" /> Explanation Reference:
                  </span>
                  <p className="text-gray-600 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-gray-200/60">
                    {formData.explanation}
                  </p>
                </div>
              )}
            </div>

            <div className="text-[11px] text-gray-400 text-center leading-relaxed">
              Changes made in the form on the left are synchronized in real-time.
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}