'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Check,
  X,
  Layers,
  Inbox
} from 'lucide-react';

// ==========================================
// CENTRALIZED STYLES (Đầu file)
// ==========================================
const STYLES = {
  // Container & Layout
  pageContainer: 'mx-auto max-w-7xl space-y-6',
  reviewCard: 'bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md',
  
  // Navigation Tabs
  tabPillContainer: 'inline-flex items-center gap-1 p-1 bg-gray-200/60 rounded-2xl border border-gray-200/80 text-xs font-semibold',
  tabButton: (isActive: boolean) =>
    `px-4 py-1.5 rounded-xl transition-all duration-200 ${
      isActive
        ? 'bg-white text-slate-900 shadow-sm'
        : 'text-slate-500 hover:text-slate-900'
    }`,

  // Badges
  sourceBadge: 'inline-flex items-center gap-1 rounded-md border border-teal-200/60 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700',
  typeBadge: 'text-xs text-slate-400 font-medium whitespace-nowrap',
  difficultyBadges: {
    Easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
    Hard: 'bg-rose-50 text-rose-700 border-rose-200/60'
  },
  statusBadges: {
    Approved: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      dot: 'bg-emerald-500'
    },
    'In review': {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
      dot: 'bg-amber-500'
    },
    Draft: {
      bg: 'bg-gray-100 text-gray-600 border-gray-200',
      dot: 'bg-gray-400'
    },
    Rejected: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200/60',
      dot: 'bg-rose-500'
    }
  },

  // Options
  optionRow: (isCorrect: boolean) =>
    `flex items-center gap-3 p-3 rounded-xl border text-sm transition-colors ${
      isCorrect
        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-medium'
        : 'bg-white border-gray-200/80 text-slate-700'
    }`,
  optionBadge: (isCorrect: boolean) =>
    `w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold text-xs rounded-lg ${
      isCorrect ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-slate-600'
    }`,

  // Actions
  approveBtn:
    'inline-flex items-center gap-1.5 rounded-xl bg-[#F7444E] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#E03E47] active:scale-[0.98]',
  rejectBtn:
    'inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 active:scale-[0.98]'
};

// ==========================================
// TYPES & INTERFACES
// ==========================================
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type ReviewStatus = 'In review' | 'Draft' | 'Approved' | 'Rejected';
export type QuestionType = 'Single Choice' | 'Multiple Choice' | 'Fill in the Blank' | 'True / False';
export type TabFilter = 'All' | 'Pending' | 'Approved' | 'Rejected';

export interface OptionItem {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface ReviewQuestionItem {
  id: string;
  source: 'AI' | 'Human';
  difficulty: DifficultyLevel;
  status: ReviewStatus;
  type: QuestionType;
  content: string;
  options: OptionItem[];
  explanation: string;
}

// ==========================================
// MOCK DATA
// ==========================================
const INITIAL_QUESTIONS: ReviewQuestionItem[] = [
  {
    id: '1',
    source: 'AI',
    difficulty: 'Medium',
    status: 'Approved',
    type: 'Multiple Choice',
    content: 'Select all statements that are true about interfaces in C#.',
    options: [
      { id: '1-a', label: 'A', text: 'A class can implement multiple interfaces', isCorrect: true },
      { id: '1-b', label: 'B', text: 'Interfaces can declare instance fields', isCorrect: false },
      { id: '1-c', label: 'C', text: 'Interfaces may contain default method implementations (C# 8+)', isCorrect: true },
      { id: '1-d', label: 'D', text: 'An interface can inherit from another interface', isCorrect: true }
    ],
    explanation: 'A class can implement many interfaces but inherit only one base class. Since C# 8, interfaces may provide default implementations.'
  },
  {
    id: '2',
    source: 'AI',
    difficulty: 'Medium',
    status: 'Draft',
    type: 'Fill in the Blank',
    content: 'Complete the code: the keyword used to prevent further overriding of a virtual member is ______.',
    options: [
      { id: '2-a', label: 'A', text: 'sealed', isCorrect: true }
    ],
    explanation: 'sealed override stops the member from being overridden further down the hierarchy.'
  },
  {
    id: '3',
    source: 'AI',
    difficulty: 'Hard',
    status: 'In review',
    type: 'Single Choice',
    content: 'What happens when an exception is thrown inside a `finally` block?',
    options: [
      { id: '3-a', label: 'A', text: 'It is silently swallowed', isCorrect: false },
      { id: '3-b', label: 'B', text: 'It replaces the original exception and propagates', isCorrect: true },
      { id: '3-c', label: 'C', text: 'The runtime terminates immediately', isCorrect: false },
      { id: '3-d', label: 'D', text: 'It is wrapped in an AggregateException', isCorrect: false }
    ],
    explanation: 'The new exception replaces the in-flight exception and propagates up, which is why finally blocks should not throw.'
  },
  {
    id: '4',
    source: 'AI',
    difficulty: 'Medium',
    status: 'Approved',
    type: 'Single Choice',
    content: 'Which collection guarantees O(1) average lookup by key?',
    options: [
      { id: '4-a', label: 'A', text: 'List<T>', isCorrect: false },
      { id: '4-b', label: 'B', text: 'Dictionary<TKey, TValue>', isCorrect: true },
      { id: '4-c', label: 'C', text: 'Queue<T>', isCorrect: false },
      { id: '4-d', label: 'D', text: 'LinkedList<T>', isCorrect: false }
    ],
    explanation: 'Dictionary<TKey, TValue> is hash-based, giving amortised O(1) lookups.'
  },
  {
    id: '5',
    source: 'AI',
    difficulty: 'Hard',
    status: 'Draft',
    type: 'Fill in the Blank',
    content: '`async` methods should generally return ______ instead of `void`.',
    options: [
      { id: '5-a', label: 'A', text: 'Task', isCorrect: true }
    ],
    explanation: 'Task (or Task<T>) allows callers to await and observe exceptions; async void cannot be awaited.'
  }
];

// Helper render inline code
function FormattedContent({ content }: { content: string }) {
  const parts = content.split(/(`[^`]+`)/g);

  return (
    <p className="my-3 text-base font-semibold leading-snug text-slate-900">
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              className="mx-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800 border border-slate-200"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </p>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function QuestionReviewPage() {
  const [questions, setQuestions] = useState<ReviewQuestionItem[]>(INITIAL_QUESTIONS);
  const [currentTab, setCurrentTab] = useState<TabFilter>('Pending');

  // Lọc theo Tab
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (currentTab === 'All') return true;
      if (currentTab === 'Pending') return q.status === 'In review' || q.status === 'Draft';
      if (currentTab === 'Approved') return q.status === 'Approved';
      if (currentTab === 'Rejected') return q.status === 'Rejected';
      return true;
    });
  }, [questions, currentTab]);

  // Cập nhật trạng thái
  const handleUpdateStatus = (id: string, newStatus: ReviewStatus) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: newStatus } : q))
    );
  };

  return (
    <div className={STYLES.pageContainer}>
      {/* Header & Tab Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Question review
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Verify correctness, wording and explanations before questions go live.
          </p>
        </div>

        {/* Segmented Filter Pills */}
        <div className={STYLES.tabPillContainer}>
          {(['All', 'Pending', 'Approved', 'Rejected'] as TabFilter[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setCurrentTab(tab)}
              className={STYLES.tabButton(currentTab === tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 2-Column Grid Questions */}
      {filteredQuestions.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredQuestions.map((q) => {
            const statusConfig = STYLES.statusBadges[q.status] || STYLES.statusBadges.Draft;

            return (
              <div key={q.id} className={STYLES.reviewCard}>
                <div>
                  {/* Top Meta Tags */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                    <div className="flex flex-wrap items-center gap-2">
                      {q.source === 'AI' ? (
                        <span className={STYLES.sourceBadge}>
                          <Sparkles className="w-3 h-3 text-teal-600" />
                          AI generated
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                          Human
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
                          STYLES.difficultyBadges[q.difficulty]
                        }`}
                      >
                        {q.difficulty}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusConfig.bg}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                        {q.status}
                      </span>
                    </div>

                    <span className={STYLES.typeBadge}>{q.type}</span>
                  </div>

                  {/* Question Title */}
                  <FormattedContent content={q.content} />

                  {/* Options List */}
                  <div className="space-y-2 my-4">
                    {q.options.map((opt) => (
                      <div key={opt.id} className={STYLES.optionRow(opt.isCorrect)}>
                        <div className={STYLES.optionBadge(opt.isCorrect)}>
                          {opt.label}
                        </div>
                        <span className="flex-1 break-words">{opt.text}</span>
                        {opt.isCorrect && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                            Correct
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Explanation Section */}
                  {q.explanation && (
                    <div className="my-3 rounded-xl bg-slate-50 p-3 border border-gray-100">
                      <p className="text-xs font-medium text-slate-600 leading-relaxed">
                        <span className="font-semibold text-slate-700">Explanation: </span>
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(q.id, 'Rejected')}
                    className={STYLES.rejectBtn}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(q.id, 'Approved')}
                    className={STYLES.approveBtn}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-200/80 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No questions found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            There are currently no questions under the &quot;{currentTab}&quot; filter.
          </p>
        </div>
      )}
    </div>
  );
}