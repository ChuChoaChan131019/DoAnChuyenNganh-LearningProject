import { Search } from 'lucide-react';

import type {
  DiscussionChapterOption,
  DiscussionPostType,
} from '@/types/discussion';

type Props = {
  search: string;
  postType: DiscussionPostType | '';
  chapters?: DiscussionChapterOption[];
  chapterId?: string;
  onSearchChange: (value: string) => void;
  onPostTypeChange: (value: DiscussionPostType | '') => void;
  onChapterChange?: (value: string) => void;
};

export function DiscussionFilters({
  search,
  postType,
  chapters,
  chapterId = '',
  onSearchChange,
  onPostTypeChange,
  onChapterChange,
}: Props) {
  return (
    <div className={`grid gap-3 ${chapters?.length ? 'sm:grid-cols-[minmax(0,1fr)_180px_220px]' : 'sm:grid-cols-[minmax(0,1fr)_180px]'}`}>
      <label className="relative block">
        <span className="sr-only">Tìm bài đăng thảo luận</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          maxLength={120}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm trong tiêu đề và nội dung…"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-[#78bcc4] focus:ring-2 focus:ring-[#78bcc4]/20"
        />
      </label>

      <label>
        <span className="sr-only">Lọc loại bài đăng</span>
        <select
          value={postType}
          onChange={(event) =>
            onPostTypeChange(event.target.value as DiscussionPostType | '')
          }
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#78bcc4] focus:ring-2 focus:ring-[#78bcc4]/20"
        >
          <option value="">Tất cả loại bài</option>
          <option value="question">Câu hỏi</option>
          <option value="note">Ghi chú</option>
          <option value="resource">Tài liệu</option>
        </select>
      </label>

      {chapters?.length ? (
        <label>
          <span className="sr-only">Lọc theo chương</span>
          <select
            value={chapterId}
            onChange={(event) => onChapterChange?.(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#78bcc4] focus:ring-2 focus:ring-[#78bcc4]/20"
          >
            <option value="">Tất cả chương</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
