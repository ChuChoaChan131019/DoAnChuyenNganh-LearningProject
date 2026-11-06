'use client';

import { ExternalLink, Loader2, MessageCircle, UserRound, X } from 'lucide-react';

import type { DiscussionComment, DiscussionPostDetail } from '@/types/discussion';

import { CommentForm } from './comment-form';
import { CommentItem } from './comment-item';
import {
  DISCUSSION_TYPE_LABELS,
  formatDiscussionTime,
  wasEdited,
} from './discussion-format';

type Props = {
  post: DiscussionPostDetail | null;
  comments: DiscussionComment[];
  loading: boolean;
  error: string | null;
  nextCommentsCursor: string | null;
  loadingMoreComments: boolean;
  onClose: () => void;
  onRetry: () => void;
  onCreateComment: (content: string) => Promise<void>;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onRemoveComment: (commentId: string) => Promise<void>;
  onLoadMoreComments: () => void;
};

export function DiscussionPostDetail({
  post,
  comments,
  loading,
  error,
  nextCommentsCursor,
  loadingMoreComments,
  onClose,
  onRetry,
  onCreateComment,
  onUpdateComment,
  onRemoveComment,
  onLoadMoreComments,
}: Props) {
  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500" role="status">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Đang mở bài đăng…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800" role="alert">
        <p>{error}</p>
        <div className="mt-3 flex gap-3">
          <button type="button" onClick={onRetry} className="font-bold underline underline-offset-4">Thử lại</button>
          <button type="button" onClick={onClose} className="font-bold underline underline-offset-4">Đóng</button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        Chọn một bài đăng để đọc nội dung và bình luận.
      </div>
    );
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(0,44,62,0.04)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-[#e4444d]">
            {DISCUSSION_TYPE_LABELS[post.post_type]}
          </span>
          <h3 className="mt-3 text-xl font-black leading-7 text-[#0f3741]">{post.title}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng chi tiết bài đăng" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5" />
          {post.is_mine ? 'Bạn' : 'Học sinh'}
        </span>
        <span>{formatDiscussionTime(post.created_at)}</span>
        {wasEdited(post.created_at, post.updated_at) && <span>Đã chỉnh sửa</span>}
      </div>

      <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
        {post.content}
      </p>

      {post.resource_url && (
        <a
          href={post.resource_url}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#78bcc4]/50 bg-[#f1f8f8] px-3 py-2 text-sm font-bold text-[#145a68] hover:bg-[#e7f3f3]"
        >
          <ExternalLink className="h-4 w-4" />
          Mở tài liệu được chia sẻ
        </a>
      )}

      <section className="mt-7 border-t border-slate-200 pt-5" aria-labelledby={`comments-${post.id}`}>
        <h4 id={`comments-${post.id}`} className="flex items-center gap-2 text-base font-black text-[#0f3741]">
          <MessageCircle className="h-4 w-4 text-[#78bcc4]" />
          Bình luận ({post.comment_count})
        </h4>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <CommentForm onSubmit={onCreateComment} />
        </div>

        <div className="mt-4 space-y-3">
          {comments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
              Chưa có bình luận. Hãy bắt đầu cuộc trao đổi.
            </p>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onUpdate={onUpdateComment}
                onRemove={onRemoveComment}
              />
            ))
          )}
        </div>

        {nextCommentsCursor && (
          <button
            type="button"
            disabled={loadingMoreComments}
            onClick={onLoadMoreComments}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {loadingMoreComments && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loadingMoreComments ? 'Đang tải…' : 'Xem thêm bình luận'}
          </button>
        )}
      </section>
    </article>
  );
}
