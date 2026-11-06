import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { CodeDifficulty, CodeExerciseFilters, CodeProgressStatus } from '@/types/code-exercise';

type Option = { id: string; title: string };
type Props = {
  filters: CodeExerciseFilters;
  courses: Option[];
  chapters: Option[];
  lessons: Option[];
  onChange: (next: CodeExerciseFilters) => void;
};

export function CodeExerciseFiltersPanel({ filters, courses, chapters, lessons, onChange }: Props) {
  const update = (patch: Partial<CodeExerciseFilters>) => onChange({ ...filters, ...patch, cursor: undefined });
  const hasFilters = Boolean(filters.search || filters.course_id || filters.chapter_id || filters.lesson_id || filters.difficulty || filters.progress_status);

  return (
    <section className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-[#0f3741]">
          <SlidersHorizontal className="h-4 w-4" /> Bộ lọc
        </div>
        {hasFilters && (
          <button type="button" onClick={() => onChange({ limit: filters.limit })} className="inline-flex items-center gap-1 text-xs font-bold text-[#f7444e] hover:underline">
            <X className="h-3.5 w-3.5" /> Xóa bộ lọc
          </button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="relative md:col-span-2 xl:col-span-2">
          <span className="sr-only">Tìm bài thực hành</span>
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            value={filters.search ?? ''}
            onChange={(event) => update({ search: event.target.value || undefined })}
            placeholder="Tìm theo tên bài..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-[#fbfcfb] pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-[#78bcc4] focus:ring-2 focus:ring-[#78bcc4]/20"
          />
        </label>
        <Select value={filters.course_id} label="Tất cả khóa học" options={courses} onChange={(value) => update({ course_id: value, chapter_id: undefined, lesson_id: undefined })} />
        <Select value={filters.chapter_id} label="Tất cả chương" options={chapters} disabled={!filters.course_id} onChange={(value) => update({ chapter_id: value, lesson_id: undefined })} />
        <Select value={filters.lesson_id} label="Tất cả bài học" options={lessons} disabled={!filters.chapter_id} onChange={(value) => update({ lesson_id: value })} />
        <div className="grid grid-cols-2 gap-3 xl:col-span-1 xl:grid-cols-1">
          <select value={filters.difficulty ?? ''} onChange={(event) => update({ difficulty: (event.target.value || undefined) as CodeDifficulty | undefined })} className="h-11 rounded-xl border border-slate-200 bg-[#fbfcfb] px-3 text-sm text-slate-700 outline-none focus:border-[#78bcc4]">
            <option value="">Mọi độ khó</option><option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option>
          </select>
          <select value={filters.progress_status ?? ''} onChange={(event) => update({ progress_status: (event.target.value || undefined) as CodeProgressStatus | undefined })} className="h-11 rounded-xl border border-slate-200 bg-[#fbfcfb] px-3 text-sm text-slate-700 outline-none focus:border-[#78bcc4] xl:hidden">
            <option value="">Mọi tiến độ</option><option value="not_started">Chưa bắt đầu</option><option value="in_progress">Đang làm</option><option value="completed">Đã hoàn thành</option>
          </select>
        </div>
      </div>
      <div className="mt-3 hidden xl:block">
        <select value={filters.progress_status ?? ''} onChange={(event) => update({ progress_status: (event.target.value || undefined) as CodeProgressStatus | undefined })} className="h-10 rounded-xl border border-slate-200 bg-[#fbfcfb] px-3 text-sm text-slate-700 outline-none focus:border-[#78bcc4]">
          <option value="">Mọi tiến độ</option><option value="not_started">Chưa bắt đầu</option><option value="in_progress">Đang làm</option><option value="completed">Đã hoàn thành</option>
        </select>
      </div>
    </section>
  );
}

function Select({ value, label, options, disabled, onChange }: { value?: string; label: string; options: Option[]; disabled?: boolean; onChange: (value?: string) => void }) {
  return (
    <select value={value ?? ''} disabled={disabled} onChange={(event) => onChange(event.target.value || undefined)} className="h-11 rounded-xl border border-slate-200 bg-[#fbfcfb] px-3 text-sm text-slate-700 outline-none focus:border-[#78bcc4] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
      <option value="">{label}</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
    </select>
  );
}
