import { Loader2, MessagesSquare } from 'lucide-react';

import type { DiscussionPostListItem } from '@/types/discussion';

import { DiscussionPostCard } from './discussion-post-card';

type Props = {
  posts: DiscussionPostListItem[];
  selectedPostId: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  getLocationLabel?: (post: DiscussionPostListItem) => string | undefined;
  onSelect: (postId: string) => void;
  onRetry: () => void;
  onLoadMore: () => void;
};

export function DiscussionPostList({
  posts,
  selectedPostId,
  loading,
  loadingMore,
  error,
  hasMore,
  getLocationLabel,
  onSelect,
  onRetry,
  onLoadMore,
}: Props) {
  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center text-sm text-slate-500" role="status">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Đang tải thảo luận…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800" role="alert">
        <p>{error}</p>
        <button type="button" onClick={onRetry} className="mt-3 font-bold underline underline-offset-4">
          Thử tải lại
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <MessagesSquare className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-700">Chưa có bài đăng phù hợp</p>
        <p className="mt-1 text-xs text-slate-500">Hãy thử từ khóa hoặc loại bài khác.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <DiscussionPostCard
          key={post.id}
          post={post}
          active={selectedPostId === post.id}
          locationLabel={getLocationLabel?.(post)}
          onSelect={() => onSelect(post.id)}
        />
      ))}
      {hasMore && (
        <button
          type="button"
          disabled={loadingMore}
          onClick={onLoadMore}
          className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loadingMore ? 'Đang tải…' : 'Xem thêm bài đăng'}
        </button>
      )}
    </div>
  );
}
