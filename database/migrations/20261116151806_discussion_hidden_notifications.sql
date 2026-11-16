BEGIN;

-- Existing notifications represent removals; preserve their meaning.
ALTER TABLE public.discussion_notifications
  ADD COLUMN decision text NOT NULL DEFAULT 'removed'
  CHECK (decision IN ('hidden', 'removed'));

CREATE OR REPLACE FUNCTION public.notify_discussion_removal() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.status IN ('hidden', 'removed') AND OLD.status = 'pending' THEN
    IF NEW.post_id IS NOT NULL THEN
      INSERT INTO public.discussion_notifications
        (recipient_id, target_type, target_id, post_title, content_excerpt, reason, decision)
      SELECT author_id, 'post', id, title, left(content, 300), NEW.moderator_reason, NEW.status
      FROM public.discussion_posts WHERE id = NEW.post_id
      ON CONFLICT (target_type, target_id) DO NOTHING;
    ELSE
      INSERT INTO public.discussion_notifications
        (recipient_id, target_type, target_id, post_title, content_excerpt, reason, decision)
      SELECT c.author_id, 'comment', c.id, p.title, left(c.content, 300), NEW.moderator_reason, NEW.status
      FROM public.discussion_comments c JOIN public.discussion_posts p ON p.id = c.post_id
      WHERE c.id = NEW.comment_id
      ON CONFLICT (target_type, target_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
