BEGIN;

CREATE TABLE public.discussion_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id uuid NOT NULL,
  post_title text NOT NULL,
  content_excerpt text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  UNIQUE (target_type, target_id)
);
CREATE INDEX discussion_notifications_recipient_created
  ON public.discussion_notifications (recipient_id, created_at DESC, id DESC);
CREATE INDEX discussion_notifications_unread
  ON public.discussion_notifications (recipient_id) WHERE read_at IS NULL;
ALTER TABLE public.discussion_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discussion_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.discussion_notifications TO service_role;
GRANT UPDATE (read_at) ON public.discussion_notifications TO service_role;

-- Runs inside the moderation transaction. Multiple reports produce one notification.
CREATE FUNCTION public.notify_discussion_removal() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'removed' AND OLD.status = 'pending' THEN
    IF NEW.post_id IS NOT NULL THEN
      INSERT INTO public.discussion_notifications
        (recipient_id, target_type, target_id, post_title, content_excerpt, reason)
      SELECT author_id, 'post', id, title, left(content, 300), NEW.moderator_reason
      FROM public.discussion_posts WHERE id = NEW.post_id
      ON CONFLICT (target_type, target_id) DO NOTHING;
    ELSE
      INSERT INTO public.discussion_notifications
        (recipient_id, target_type, target_id, post_title, content_excerpt, reason)
      SELECT c.author_id, 'comment', c.id, p.title, left(c.content, 300), NEW.moderator_reason
      FROM public.discussion_comments c JOIN public.discussion_posts p ON p.id = c.post_id
      WHERE c.id = NEW.comment_id
      ON CONFLICT (target_type, target_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_discussion_removal() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER discussion_report_removal_notification
  AFTER UPDATE OF status ON public.discussion_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_discussion_removal();

COMMIT;
