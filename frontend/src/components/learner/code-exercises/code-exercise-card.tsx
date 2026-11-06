import Link from 'next/link';
import { ArrowRight, BookOpen, CircleCheck, Clock3, RotateCcw } from 'lucide-react';
import type { CodeExerciseListItem } from '@/types/code-exercise';

const difficultyLabel = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' } as const;
const statusLabel = {
  not_started: 'Chưa bắt đầu',
  in_progress: 'Đang làm',
  completed: 'Đã hoàn thành',
} as const;

export function CodeExerciseCard({ exercise }: { exercise: CodeExerciseListItem }) {
  return (
    <Link
      href={`/learner/code-exercises/${exercise.id}`}
      className="group flex h-full flex-col rounded-[18px] border border-[#dfe6df] bg-white p-5 shadow-[0_8px_18px_rgba(0,44,62,0.04)] transition hover:-translate-y-0.5 hover:border-[#9fc8c8] hover:shadow-[0_12px_24px_rgba(0,44,62,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-[#eef6f5] px-2.5 py-1 text-xs font-bold text-[#145a68]">
          {difficultyLabel[exercise.difficulty]}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          {exercise.progress_status === 'completed' ? <CircleCheck className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4" />}
          {statusLabel[exercise.progress_status]}
        </span>
      </div>

      <h2 className="mt-4 text-xl font-bold tracking-[-0.02em] text-[#0f3741] group-hover:text-[#145a68]">
        {exercise.title}
      </h2>
      <div className="mt-3 flex items-start gap-2 text-sm leading-6 text-slate-500">
        <BookOpen className="mt-1 h-4 w-4 shrink-0" />
        <span>{exercise.course.title} · {exercise.chapter.title} · {exercise.lesson.title}</span>
      </div>

      {exercise.requires_resubmission && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          <RotateCcw className="h-4 w-4" />
          Bài đã có phiên bản mới
        </div>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-bold text-[#f7444e]">
        <span>{exercise.progress_status === 'not_started' ? 'Bắt đầu viết mã' : 'Tiếp tục làm bài'}</span>
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
