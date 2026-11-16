export interface DiscussionNotification {
  id: string;
  target_type: 'post' | 'comment';
  decision: 'hidden' | 'removed';
  post_title: string;
  content_excerpt: string;
  reason: string;
  created_at: string;
  read_at: string | null;
}

export interface DiscussionNotificationPage {
  items: DiscussionNotification[];
  total: number;
  unread: number;
  offset: number;
  limit: number;
}
