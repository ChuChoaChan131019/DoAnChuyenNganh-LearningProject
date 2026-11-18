'use client';

import { ExternalLink, Loader2, MessageCircle, Pencil, Trash2, UserRound, X, ThumbsUp } from 'lucide-react';

import type { DiscussionComment, DiscussionPostDetail, UpdateDiscussionPostInput } from '@/types/discussion';

import { CommentForm } from './comment-form';
import { CommentItem } from './comment-item';
import { DiscussionReport } from './discussion-report';
import {
  DISCUSSION_TYPE_LABELS,
  formatDiscussionTime,
  wasEdited,
} from './discussion-format';
import { useState } from 'react';

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
  onTogglePostHelpful: (
    postId: string,
    isHelpful: boolean,
  ) => Promise<void>;

  onToggleCommentHelpful: (
    commentId: string,
    isHelpful: boolean,
  ) => Promise<void>;
  onUpdatePost: (postId: string, payload: UpdateDiscussionPostInput) => Promise<void>;
  onRemovePost: (postId: string) => Promise<void>;
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
  onTogglePostHelpful,
  onToggleCommentHelpful,
  onUpdatePost,
  onRemovePost,
}: Props) {
  const [helpfulLoading, setHelpfulLoading] = useState(false);
  const [helpfulError, setHelpfulError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const beginEdit = () => {
    if (!post) return;
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditUrl(post.resource_url ?? '');
    setEditError(null);
    setEditing(true);
  };

  const saveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!post || saving) return;
    const title = editTitle.trim();
    const content = editContent.trim();
    const resourceUrl = editUrl.trim();
    if (title.length < 5 || title.length > 160) { setEditError('Tiêu đề cần từ 5 đến 160 ký tự.'); return; }
    if (content.length < 10 || content.length > 20000) { setEditError('Nội dung cần từ 10 đến 20.000 ký tự.'); return; }
    if (post.post_type === 'resource') {
      try {
        const url = new URL(resourceUrl);
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
      } catch { setEditError('Hãy nhập đường dẫn HTTPS hợp lệ.'); return; }
    }
    setSaving(true);
    setEditError(null);
    try {
      await onUpdatePost(post.id, {
        title,
        content,
        ...(post.post_type === 'resource' ? { resource_url: resourceUrl } : {}),
      });
      setEditing(false);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Không thể lưu thay đổi.');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!post || removing || !window.confirm('Bạn có chắc muốn xóa bài đăng này?')) return;
    setRemoving(true);
    setRemoveError(null);
    try { await onRemovePost(post.id); }
    catch (error) {
      setRemoveError(error instanceof Error ? error.message : 'Không thể xóa bài đăng.');
      setRemoving(false);
    }
  };

  const handlePostHelpful = async () => {
    if (!post || helpfulLoading) return;

    setHelpfulLoading(true);
    setHelpfulError(null);

    try {
      await onTogglePostHelpful(
        post.id,
        post.is_helpful,
      );
    } catch (error) {
      setHelpfulError(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật lượt hữu ích.',
      );
    } finally {
      setHelpfulLoading(false);
    }
  };

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
    <article className="discussion-scrollbar h-full min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(0,44,62,0.04)] sm:p-6">
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

      {editing ? (
        <form onSubmit={(event) => void saveEdit(event)} className="mt-5 space-y-4 rounded-xl border border-[#b9d9d9] bg-[#f8fbfb] p-4" aria-label="Sửa bài thảo luận">
          <label className="block text-sm font-semibold text-slate-700">Tiêu đề
            <input autoFocus value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={160} disabled={saving} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#78bcc4]" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Nội dung
            <textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} maxLength={20000} disabled={saving} className="mt-1.5 min-h-36 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#78bcc4]" />
          </label>
          {post.post_type === 'resource' && <label className="block text-sm font-semibold text-slate-700">Đường dẫn tài liệu (HTTPS)
            <input type="url" value={editUrl} onChange={(event) => setEditUrl(event.target.value)} maxLength={2000} disabled={saving} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#78bcc4]" />
          </label>}
          {editError && <p role="alert" className="text-sm text-rose-700">{editError}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-white disabled:opacity-50">Hủy</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#0f3741] px-4 py-2 text-sm font-bold text-white hover:bg-[#175365] disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
          </div>
        </form>
      ) : <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{post.content}</p>}

      {post.is_mine && !editing && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <button type="button" onClick={beginEdit} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /> Sửa bài</button>
        <button type="button" disabled={removing} onClick={() => void remove()} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> {removing ? 'Đang xóa…' : 'Xóa bài'}</button>
        {removeError && <p role="alert" className="w-full text-xs text-rose-700">{removeError}</p>}
      </div>}

      <div className="mt-4">
        <button
          type="button"
          disabled={helpfulLoading}
          aria-pressed={post.is_helpful}
          onClick={() => void handlePostHelpful()}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition disabled:opacity-60 ${
            post.is_helpful
              ? 'border-[#78bcc4] bg-[#e0f3f2] text-[#146775]'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ThumbsUp
            className={`h-4 w-4 ${
              post.is_helpful ? 'fill-current' : ''
            }`}
          />

          {post.is_helpful
            ? 'Đã đánh dấu hữu ích'
            : 'Hữu ích'}

          <span>{post.helpful_count}</span>
        </button>

        {helpfulError && (
          <p
            role="alert"
            className="mt-2 text-xs text-rose-600"
          >
            {helpfulError}
          </p>
        )}
      </div>

      {!post.is_mine && <DiscussionReport key={post.id} targetType="post" targetId={post.id} />}

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

        <div className="mt-4 space-y-3" aria-label="Danh sách bình luận">
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
                onToggleHelpful={onToggleCommentHelpful}
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
