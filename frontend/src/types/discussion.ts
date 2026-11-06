export type DiscussionPostType = 'question' | 'note' | 'resource';

export type DiscussionPostListItem = {
  id: string;
  chapter_id: string;
  lesson_id: string | null;
  author_id: string;
  post_type: DiscussionPostType;
  title: string;
  content_preview: string;
  resource_url: string | null;
  created_at: string;
  updated_at: string;
  is_mine: boolean;
  comment_count: number;
  course_id?: string;
  course_title?: string;
  course_slug?: string;
  chapter_title?: string;
  lesson_title?: string | null;
};

export type DiscussionPostDetail = Omit<
  DiscussionPostListItem,
  'content_preview'
> & {
  content: string;
  status: 'visible';
  deleted_at: null;
};

export type DiscussionComment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  status: 'visible';
  created_at: string;
  updated_at: string;
  deleted_at: null;
  is_mine: boolean;
};

export type CursorPage<T> = {
  items: T[];
  next_cursor: string | null;
};

export type DiscussionPostFilters = {
  scope?: 'all';
  course_id?: string;
  chapter_id?: string;
  lesson_id?: string;
  post_type?: DiscussionPostType;
  search?: string;
  limit?: number;
  cursor?: string;
};

export type DiscussionChapterOption = {
  id: string;
  title: string;
  lessons: Array<{
    id: string;
    title: string;
  }>;
};
