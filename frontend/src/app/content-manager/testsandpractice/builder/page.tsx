'use client';

import React, { useState, useMemo } from 'react';
import {
  Eye,
  Save,
  Search,
  Plus,
  Minus,
  GripVertical,
  BookOpen,
  Layers,
  Settings2
} from 'lucide-react';
import { BankQuestion, TestSettings } from '@/types/test-and-practice';
import { DifficultyLevel, QuestionType } from '@/types/question';

const STYLES = {
  // Page Container & Cards
  pageContainer: 'mx-auto max-w-7xl space-y-6 pb-12',
  card: 'bg-[#FFFAFC]/50 border border-gray-200/80 rounded-2xl p-5 shadow-sm flex flex-col h-full',
  cardHeader: 'pb-3 mb-4 border-b border-gray-100 flex items-center justify-between',
  cardTitle: 'text-base font-semibold text-gray-900',

  // Form Controls
  label: 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5',
  input:
    'w-full text-sm bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F7444E]/20 focus:border-[#F7444E] transition',
  textarea:
    'w-full text-sm bg-white border border-gray-200 rounded-xl p-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F7444E]/20 focus:border-[#F7444E] transition leading-relaxed resize-y',
  select:
    'w-full text-sm bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F7444E]/20 focus:border-[#F7444E] transition',

  // Buttons & Actions
  primaryBtn:
    'inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c93f3a] active:scale-[0.98]',
  secondaryBtn:
    'inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:scale-[0.98]',
  addBtn:
    'inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200/80 px-2.5 py-1 rounded-lg transition active:scale-[0.96]',
  removeBtn:
    'p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition active:scale-[0.96]',

  // Item List Containers
  bankItemCard:
    'p-3 rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50/40 hover:bg-white transition-all space-y-2.5',
  selectedItemCard:
    'p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all flex items-start gap-2.5 group',

  // Dynamic Badges
  difficultyBadges: {
    easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
    hard: 'bg-rose-50 text-rose-700 border-rose-200/60',
  },

  // Toggle Switch
  toggleButton: (checked: boolean) =>
    `relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? 'bg-[#F7444E]' : 'bg-gray-200'
    }`,
  toggleCircle: (checked: boolean) =>
    `pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
      checked ? 'translate-x-4' : 'translate-x-0'
    }`
};

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Single Choice',
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  fill_in_blank: 'Fill in the Blank',
};

// ==========================================
// MOCK DATA (Chuẩn hóa UUID & check constraints)
// ==========================================
const INITIAL_BANK_QUESTIONS: BankQuestion[] = [
  {
    id: 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01',
    title: 'Which access modifier makes a member visible only inside the declaring class?',
    type: 'single_choice',
    lesson: 'Access Modifiers',
    difficulty: 'easy',
  },
  {
    id: 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c02',
    title: 'Select all statements that are true about interfaces in C#.',
    type: 'multiple_choice',
    lesson: 'Interfaces',
    difficulty: 'medium',
  },
  {
    id: 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c03',
    title: 'A struct in C# is a reference type.',
    type: 'true_false',
    lesson: 'Data Types',
    difficulty: 'easy',
  },
  {
    id: 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c04',
    title: 'Complete the code: the keyword used to prevent further overriding of a virtual member is ______.',
    type: 'fill_in_blank',
    lesson: 'virtual, override, sealed',
    difficulty: 'medium',
  },
  {
    id: 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05',
    title: 'Which LINQ operator returns a projection of each element in a sequence?',
    type: 'single_choice',
    lesson: 'Select and Where',
    difficulty: 'easy',
  },
  {
    id: 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c06',
    title: 'What happens when an exception is thrown inside a finally block?',
    type: 'single_choice',
    lesson: 'The finally Block',
    difficulty: 'hard',
  },
  {
    id: 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c07',
    title: 'Which collection guarantees O(1) average lookup by key?',
    type: 'single_choice',
    lesson: 'Dictionary<TKey, TValue>',
    difficulty: 'medium',
  },
  {
    id: 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c08',
    title: 'async methods should generally return _____ instead of void.',
    type: 'fill_in_blank',
    lesson: 'Async / Await',
    difficulty: 'hard',
  },
];

const COURSES = [
  { id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c10', title: 'Object-Oriented Programming in C#' },
  { id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c11', title: 'C# Fundamentals' },
  { id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c12', title: 'Collections and LINQ' },
  { id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c13', title: 'Asynchronous Programming in .NET' },
];

// ==========================================
// SUB-COMPONENTS
// ==========================================
function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  const formatted = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STYLES.difficultyBadges[level]}`}
    >
      {formatted}
    </span>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CustomToggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1.5 select-none">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={STYLES.toggleButton(checked)}
      >
        <span className={STYLES.toggleCircle(checked)} />
      </button>
    </label>
  );
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function TestBuilderPage() {
  const [bankQuestions] = useState<BankQuestion[]>(INITIAL_BANK_QUESTIONS);
  const [selectedQuestions, setSelectedQuestions] = useState<BankQuestion[]>([
    INITIAL_BANK_QUESTIONS[0],
    INITIAL_BANK_QUESTIONS[1],
  ]);
  const [searchQuery, setSearchQuery] = useState('');

  const [settings, setSettings] = useState<TestSettings>({
    title: 'OOP Pillars Checkpoint',
    description: 'Checkpoint covering encapsulation, inheritance and polymorphism concepts.',
    course_id: COURSES[0].id,
    course_title: COURSES[0].title,
    timeLimit: 35,
    passingScore: 70,
    randomiseQuestions: true,
    randomiseAnswers: false,
    showExplanations: true,
  });

  const availableQuestions = useMemo(() => {
    const selectedIds = new Set(selectedQuestions.map((q) => q.id));
    return bankQuestions
      .filter((q) => !selectedIds.has(q.id))
      .filter((q) =>
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.lesson.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [bankQuestions, selectedQuestions, searchQuery]);

  const handleAddQuestion = (question: BankQuestion) => {
    setSelectedQuestions((prev) => [...prev, question]);
  };

  const handleRemoveQuestion = (id: string) => {
    setSelectedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleSaveTest = () => {
    if (!settings.title.trim()) {
      alert('Please enter a test title.');
      return;
    }
    if (selectedQuestions.length === 0) {
      alert('Please add at least one question to the test.');
      return;
    }
    alert(`Test "${settings.title}" with ${selectedQuestions.length} questions saved successfully!`);
  };

  return (
    <div className={STYLES.pageContainer}>
      {/* Header Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Test builder
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Drag questions from the bank into your test, then tune the rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => alert('Opening preview modal...')}
            className={STYLES.secondaryBtn}
          >
            <Eye className="h-4 w-4 text-gray-500" />
            <span>Preview test</span>
          </button>
          <button
            type="button"
            onClick={handleSaveTest}
            className={STYLES.primaryBtn}
          >
            <Save className="h-4 w-4" />
            <span>Save test</span>
          </button>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1: Question Bank (~30%) */}
        <div className="lg:col-span-4">
          <div className={STYLES.card}>
            <div className={STYLES.cardHeader}>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <h2 className={STYLES.cardTitle}>Question bank</h2>
              </div>
              <span className="text-xs text-gray-400 font-medium">
                {availableQuestions.length} available
              </span>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions..."
                className="w-full text-xs bg-gray-50/75 border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#F7444E] focus:bg-white transition"
              />
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {availableQuestions.length > 0 ? (
                availableQuestions.map((q) => (
                  <div key={q.id} className={STYLES.bankItemCard}>
                    <p className="text-xs font-medium text-gray-800 leading-snug line-clamp-2">
                      {q.title}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <DifficultyBadge level={q.difficulty} />
                        <span className="text-[10px] text-gray-400 truncate max-w-[110px]">
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
                <div className="py-10 text-center text-xs text-gray-400">
                  No available questions found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Selected Questions (~40%) */}
        <div className="lg:col-span-5">
          <div className={STYLES.card}>
            <div className={STYLES.cardHeader}>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-400" />
                <h2 className={STYLES.cardTitle}>Selected questions</h2>
              </div>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                {selectedQuestions.length} in this test
              </span>
            </div>

            <div className="space-y-2.5 min-h-[300px]">
              {selectedQuestions.length > 0 ? (
                selectedQuestions.map((q, index) => (
                  <div key={q.id} className={STYLES.selectedItemCard}>
                    <div className="flex items-center gap-1 text-gray-400 pt-0.5">
                      <GripVertical className="w-4 h-4 cursor-grab text-gray-300 group-hover:text-gray-500" />
                      <span className="text-xs font-bold text-gray-400 w-4 text-center">
                        {index + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 leading-snug">
                        {q.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <DifficultyBadge level={q.difficulty} />
                        <span className="text-[11px] text-gray-400 truncate">
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
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-xl">
                  <Layers className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-xs font-medium text-gray-500">
                    No questions selected
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Click + Add on any question from the bank
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Test Settings (~30%) */}
        <div className="lg:col-span-3">
          <div className={`${STYLES.card} space-y-4`}>
            <div className={STYLES.cardHeader}>
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-gray-400" />
                <h2 className={STYLES.cardTitle}>Test settings</h2>
              </div>
            </div>

            <div>
              <label className={STYLES.label}>Test title</label>
              <input
                type="text"
                value={settings.title}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                placeholder="e.g. OOP Pillars Checkpoint"
                className={STYLES.input}
              />
            </div>

            <div>
              <label className={STYLES.label}>Description</label>
              <textarea
                rows={2}
                value={settings.description || ''}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                placeholder="Short description of the test..."
                className={STYLES.textarea}
              />
            </div>

            <div>
              <label className={STYLES.label}>Course</label>
              <select
                value={settings.course_id}
                onChange={(e) => {
                  const selectedCourse = COURSES.find((c) => c.id === e.target.value);
                  setSettings({
                    ...settings,
                    course_id: e.target.value,
                    course_title: selectedCourse ? selectedCourse.title : ''
                  });
                }}
                className={STYLES.select}
              >
                {COURSES.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={STYLES.label}>Time limit</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    value={settings.timeLimit}
                    onChange={(e) =>
                      setSettings({ ...settings, timeLimit: Number(e.target.value) })
                    }
                    className={`${STYLES.input} pr-8 text-center`}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400">
                    min
                  </span>
                </div>
              </div>

              <div>
                <label className={STYLES.label}>Pass score</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.passingScore}
                    onChange={(e) =>
                      setSettings({ ...settings, passingScore: Number(e.target.value) })
                    }
                    className={`${STYLES.input} pr-7 text-center`}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400">
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 space-y-2">
              <CustomToggle
                label="Randomise questions"
                checked={settings.randomiseQuestions}
                onChange={(val) =>
                  setSettings({ ...settings, randomiseQuestions: val })
                }
              />
              <CustomToggle
                label="Randomise answers"
                checked={settings.randomiseAnswers}
                onChange={(val) =>
                  setSettings({ ...settings, randomiseAnswers: val })
                }
              />
              <CustomToggle
                label="Show explanations"
                checked={settings.showExplanations}
                onChange={(val) =>
                  setSettings({ ...settings, showExplanations: val })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}