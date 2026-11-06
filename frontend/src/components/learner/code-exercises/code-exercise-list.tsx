import { Code2, Loader2 } from 'lucide-react';
import type { CodeExerciseListItem } from '@/types/code-exercise';
import { CodeExerciseCard } from './code-exercise-card';

type Props = {
  items: CodeExerciseListItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
};

export function CodeExerciseList({ items, loading, loadingMore, hasMore, onLoadMore }: Props) {
  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-[#145a68]">
        <Loader2 className="h-7 w-7 animate-spin" />
        <span className="ml-3 font-semibold">Đang tải bài thực hành...</span>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-[18px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <Code2 className="mx-auto h-10 w-10 text-slate-300" />
        <h2 className="mt-4 text-lg font-bold text-[#0f3741]">Chưa tìm thấy bài phù hợp</h2>
        <p className="mt-2 text-sm text-slate-500">Hãy thử bỏ bớt bộ lọc hoặc dùng từ khóa khác.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => <CodeExerciseCard key={item.id} exercise={item} />)}
      </div>
      {hasMore && (
        <div className="mt-7 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="inline-flex min-w-32 items-center justify-center rounded-xl border border-[#bdd4d3] bg-white px-5 py-3 text-sm font-bold text-[#145a68] transition hover:bg-[#eef7f7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMore ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Xem thêm'}
          </button>
        </div>
      )}
    </>
  );
}
