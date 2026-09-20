'use client';

import { useEffect, useState } from 'react';
import { Check, Inbox, Sparkles, X } from 'lucide-react';
import { ApiClientError, questionApi } from '@/lib/api';
import type { DifficultyLevel, QuestionItem, QuestionStatus, QuestionType } from '@/types/question';

type TabFilter = 'All' | 'Pending' | 'Approved' | 'Rejected';

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Single Choice',
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  fill_in_blank: 'Fill in the Blank',
};

const DIFFICULTY_STYLES: Record<DifficultyLevel, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  medium: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  hard: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
};

function DifficultyBadge({ difficulty }: { difficulty: DifficultyLevel }) {
  return <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${DIFFICULTY_STYLES[difficulty]}`}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>;
}

function StatusBadge({ status }: { status: QuestionStatus }) {
  const approved = status === 'approved';
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${approved ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-border bg-muted text-muted-foreground'}`}><span className={`h-1.5 w-1.5 rounded-full ${approved ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />{approved ? 'Approved' : 'Draft'}</span>;
}

function QuestionCard({ item, onApprove, onReject, isUpdating }: { item: QuestionItem; onApprove: () => void; onReject: () => void; isUpdating: boolean }) {
  return <article className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs transition hover:shadow-md">
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3"><div className="flex flex-wrap items-center gap-2">{item.is_ai_generated && <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300"><Sparkles className="h-3 w-3 text-sky-500" />AI generated</span>}<DifficultyBadge difficulty={item.difficulty} /><StatusBadge status={item.status} /></div><span className="text-xs font-medium text-muted-foreground">{TYPE_LABELS[item.question_type]}</span></div>
      <p className="my-4 text-base font-semibold leading-snug text-foreground">{item.content}</p>
      <div className="space-y-2">{(item.options ?? []).map((option, index) => <div key={option.id ?? `${item.id}-${option.order_index}`} className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${option.is_correct ? 'border-emerald-300 bg-emerald-50/70 font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-border bg-background/50 text-foreground'}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${option.is_correct ? 'border-emerald-400 bg-white text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-700' : 'border-border bg-muted text-muted-foreground'}`}>{String.fromCharCode(65 + index)}</span><span className="flex-1 break-words">{option.option_text}</span>{option.is_correct && <span className="rounded-md bg-emerald-100/60 dark:bg-emerald-900/60 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Correct</span>}</div>)}</div>
      {item.explanation && <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3"><p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">Explanation: </span>{item.explanation}</p></div>}
    </div>
    <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-border pt-4"><button type="button" disabled={isUpdating} onClick={onReject} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-60"><X className="h-3.5 w-3.5" />Reject</button><button type="button" disabled={isUpdating} onClick={onApprove} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"><Check className="h-3.5 w-3.5" />{isUpdating ? 'Saving...' : 'Approve'}</button></div>
  </article>;
}

export default function QuestionReviewPage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentTab, setCurrentTab] = useState<TabFilter>('Pending');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const status = currentTab === 'Pending' ? 'draft' : currentTab === 'Approved' ? 'approved' : undefined;
    if (currentTab === 'Rejected') {
      return () => { active = false; };
    }
    questionApi.list({ status }).then((items) => { if (active) setQuestions(items); }).catch((requestError) => { if (active) setError(requestError instanceof ApiClientError ? requestError.message : 'Unable to load review questions.'); }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [currentTab]);

  const visibleQuestions = currentTab === 'Rejected' ? [] : questions;

  const updateStatus = async (id: string, status: 'approved' | 'draft') => {
    setUpdatingId(id);
    setError('');
    try {
      await questionApi.updateStatus(id, status);
      setQuestions((items) => items.filter((item) => item.id !== id));
    } catch (requestError) {
      setError(requestError instanceof ApiClientError ? requestError.message : 'Unable to update question status.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Question review</h1>
          <p className="mt-1 text-sm text-muted-foreground">Verify correctness, wording and explanations before questions go live.</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-muted p-1 text-xs font-semibold">
          {(['All', 'Pending', 'Approved', 'Rejected'] as TabFilter[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setIsLoading(tab !== 'Rejected');
                setCurrentTab(tab);
              }}
              className={`rounded-xl px-4 py-1.5 transition-all ${
                currentTab === tab ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading questions...</p>
      ) : visibleQuestions.length ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {visibleQuestions.map((item) => (
            <QuestionCard
              key={item.id}
              item={item}
              isUpdating={updatingId === item.id}
              onApprove={() => updateStatus(item.id, 'approved')}
              onReject={() => updateStatus(item.id, 'draft')}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <Inbox className="mb-3 h-12 w-12 rounded-full bg-muted p-3 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">No questions found</h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">There are currently no questions under the &quot;{currentTab}&quot; filter.</p>
        </div>
      )}
    </div>
  );
}
