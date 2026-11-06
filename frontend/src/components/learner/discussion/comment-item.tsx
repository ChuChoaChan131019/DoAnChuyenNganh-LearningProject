'use client';

import { useState } from 'react';
import { Pencil, Trash2, UserRound } from 'lucide-react';

import type { DiscussionComment } from '@/types/discussion';

import { CommentForm } from './comment-form';
import { formatDiscussionTime, wasEdited } from './discussion-format';

type Props = {
  comment: DiscussionComment;
  onUpdate: (commentId: string, content: string) => Promise<void>;
  onRemove: (commentId: string) => Promise<void>;
};

export function CommentItem({ comment, onUpdate, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await onRemove(comment.id);
    } catch (requestError) {
      setRemoveError(
        requestError instanceof Error
          ? requestError.message
          : 'Không thể xóa bình luận.',
      );
      setRemoving(false);
    }
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
          <UserRound className="h-3.5 w-3.5" />
          {comment.is_mine ? 'Bạn' : 'Học sinh'}
        </span>
        <span>
          {formatDiscussionTime(comment.created_at)}
          {wasEdited(comment.created_at, comment.updated_at) ? ' · Đã chỉnh sửa' : ''}
        </span>
      </div>

      {editing ? (
        <div className="mt-3">
          <CommentForm
            autoFocus
            initialValue={comment.content}
            submitLabel="Lưu thay đổi"
            onCancel={() => setEditing(false)}
            onSubmit={async (content) => {
              await onUpdate(comment.id, content);
              setEditing(false);
            }}
          />
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
          {comment.content}
        </p>
      )}

      {comment.is_mine && !editing && (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-2">
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-white">
            <Pencil className="h-3 w-3" /> Sửa
          </button>
          <button type="button" disabled={removing} onClick={() => void handleRemove()} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60">
            <Trash2 className="h-3 w-3" /> {removing ? 'Đang xóa…' : 'Xóa'}
          </button>
        </div>
      )}
      {removeError && <p className="mt-2 text-xs text-rose-700" role="alert">{removeError}</p>}
    </article>
  );
}
