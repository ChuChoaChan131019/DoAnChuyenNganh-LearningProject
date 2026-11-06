import type { DiscussionPostType } from '@/types/discussion';

export const DISCUSSION_TYPE_LABELS: Record<DiscussionPostType, string> = {
  question: 'Câu hỏi',
  note: 'Ghi chú',
  resource: 'Tài liệu',
};

export function formatDiscussionTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function wasEdited(createdAt: string, updatedAt: string) {
  return Date.parse(updatedAt) - Date.parse(createdAt) > 1000;
}
