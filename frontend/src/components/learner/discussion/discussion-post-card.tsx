import { FileText, MapPin, MessageCircle, UserRound } from 'lucide-react';

import type { DiscussionPostListItem } from '@/types/discussion';

import {
  DISCUSSION_TYPE_LABELS,
  formatDiscussionTime,
  wasEdited,
} from './discussion-format';

type Props = {
  post: DiscussionPostListItem;
  active: boolean;
  locationLabel?: string;
  onSelect: () => void;
};

export function DiscussionPostCard({ post, active, locationLabel, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#78bcc4] ${
        active
          ? 'border-[#78bcc4] bg-[#f1f8f8] shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-[#e4444d]">
          <FileText className="h-3 w-3" />
          {DISCUSSION_TYPE_LABELS[post.post_type]}
        </span>
        <span className="text-[11px] text-slate-400">
          {formatDiscussionTime(post.created_at)}
        </span>
      </div>

      <h3 className="mt-3 line-clamp-2 text-base font-bold leading-6 text-[#0f3741]">
        {post.title}
      </h3>
      <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
        {post.content_preview}
      </p>

      {locationLabel ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#356b73]">
          <MapPin className="h-3.5 w-3.5" />
          {locationLabel}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5" />
          {post.is_mine ? 'Bạn' : 'Học sinh'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" />
          {post.comment_count} bình luận
        </span>
        {wasEdited(post.created_at, post.updated_at) && (
          <span className="text-slate-400">Đã chỉnh sửa</span>
        )}
      </div>
    </button>
  );
}
