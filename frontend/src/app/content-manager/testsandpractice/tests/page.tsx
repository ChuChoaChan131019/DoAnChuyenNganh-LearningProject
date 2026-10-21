'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Clock, Users } from 'lucide-react';
import { TestItem, TestStatus } from '@/types/test-and-practice';
import { DifficultyLevel } from '@/types/question';
import { quizApi, courseApi } from '@/lib/api';

const STYLES = {
  pageContainer: 'mx-auto max-w-7xl space-y-6 pb-12',
  tableCard: 'overflow-hidden rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 shadow-sm',
  thead: 'border-b border-gray-100 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500',
  trHover: 'transition-colors hover:bg-gray-50/80 cursor-pointer',

  createBtn:
    'inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c93f3a] active:scale-[0.98]',

  difficultyBadges: {
    easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
    hard: 'bg-rose-50 text-rose-700 border-rose-200/60',
  },
  statusBadges: {
    published: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      dot: 'bg-emerald-500',
      label: 'Published',
    },
    approved: {
      bg: 'bg-sky-50 text-sky-700 border-sky-200/60',
      dot: 'bg-sky-500',
      label: 'Approved',
    },
    draft: {
      bg: 'bg-gray-100 text-gray-600 border-gray-200',
      dot: 'bg-gray-400',
      label: 'Draft',
    },
  },
};

function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  const formatted = level ? level.charAt(0).toUpperCase() + level.slice(1) : 'Medium';
  const badgeStyle = STYLES.difficultyBadges[level] || STYLES.difficultyBadges.medium;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${badgeStyle}`}
    >
      {formatted}
    </span>
  );
}

function StatusBadge({ status }: { status: TestStatus }) {
  const current = STYLES.statusBadges[status] || STYLES.statusBadges.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${current.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
}

export default function TestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<TestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTestsFromDb() {
      try {
        setIsLoading(true);
        const [quizzesData, coursesData] = await Promise.all([
          quizApi.list().catch(() => []),
          courseApi.list().catch(() => []),
        ]);

        if (!isMounted) return;

        const courseMap = new Map<string, string>();
        (coursesData || []).forEach((c: any) => {
          courseMap.set(String(c.id), c.title);
        });

        const mappedTests: TestItem[] = await Promise.all(
          (quizzesData || []).map(async (q: any) => {
            let qCount = 0;
            try {
              const qList = await quizApi.getQuestions(q.id);
              qCount = Array.isArray(qList) ? qList.length : 0;
            } catch {
              qCount = 0;
            }

            const formattedDate = q.created_at
              ? new Date(q.created_at).toISOString().split('T')[0]
              : 'N/A';

            return {
              id: String(q.id),
              title: q.title || 'Untitled Test',
              created_at: formattedDate,
              course_title: courseMap.get(String(q.course_id)) || 'General Course',
              questions_count: qCount,
              duration_minutes: q.duration_minutes ?? 15,
              pass_score: Number(q.pass_percentage ?? q.pass_score ?? 50),
              shuffle_questions: Boolean(q.shuffle_questions),
              shuffle_options: Boolean(q.shuffle_options),
              is_active: Boolean(q.is_active),
              difficulty: 'medium' as DifficultyLevel,
              status: (q.is_active ? 'published' : 'draft') as TestStatus,
              attempts_count: 0,
            };
          })
        );

        if (isMounted) {
          setTests(mappedTests);
        }
      } catch (err: any) {
        console.error('Lỗi khi tải danh sách tests:', err);
        if (isMounted) {
          setError(err?.message || 'Không thể tải danh sách bài kiểm tra.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTestsFromDb();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateTest = () => {
    router.push('/content-manager/testsandpractice/builder');
  };

  const handleRowClick = (quizId: string) => {
    router.push(`/content-manager/quizzes/${quizId}/builder`);
  };

  return (
    <div className={STYLES.pageContainer}>
      {/* Header & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Tests
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Assessments built from the C# question bank.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreateTest}
            className={STYLES.createBtn}
          >
            <Plus className="h-4 w-4" />
            Create test
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className={STYLES.tableCard}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className={STYLES.thead}>
              <tr>
                <th scope="col" className="py-4 pl-6 pr-4">Test</th>
                <th scope="col" className="px-4 py-4">Course</th>
                <th scope="col" className="px-4 py-4">Questions</th>
                <th scope="col" className="px-4 py-4">Duration</th>
                <th scope="col" className="px-4 py-4">Difficulty</th>
                <th scope="col" className="px-4 py-4">Status</th>
                <th scope="col" className="py-4 pl-4 pr-6">Attempts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    Loading tests from database...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-rose-600">
                    {error}
                  </td>
                </tr>
              ) : tests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    Chưa có bài test nào trong database. Hãy bấm &quot;Create test&quot; để tạo mới.
                  </td>
                </tr>
              ) : (
                tests.map((test) => (
                  <tr
                    key={test.id}
                    onClick={() => handleRowClick(test.id)}
                    className={STYLES.trHover}
                  >
                    <td className="max-w-md py-4 pl-6 pr-4">
                      <p className="font-semibold text-gray-900 line-clamp-1">
                        {test.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Created {test.created_at}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-gray-700 font-medium text-xs sm:text-sm">
                      {test.course_title}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-gray-600 font-medium">
                      {test.questions_count}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {test.duration_minutes} min
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <DifficultyBadge level={test.difficulty} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <StatusBadge status={test.status} />
                    </td>

                    <td className="whitespace-nowrap py-4 pl-4 pr-6 text-gray-600">
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        {test.attempts_count}
                      </span>
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