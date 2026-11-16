BEGIN;

ALTER TABLE public.discussion_reports
  ADD COLUMN restored_at timestamptz,
  ADD COLUMN restored_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN restoration_reason text,
  ADD CONSTRAINT discussion_reports_restoration_check CHECK (
    (restored_at IS NULL AND restored_by IS NULL AND restoration_reason IS NULL)
    OR (status = 'hidden' AND restored_at IS NOT NULL AND restored_by IS NOT NULL
      AND restoration_reason IS NOT NULL AND char_length(btrim(restoration_reason)) BETWEEN 10 AND 1000)
  );
CREATE INDEX discussion_reports_restored_by_idx ON public.discussion_reports(restored_by)
  WHERE restored_by IS NOT NULL;

CREATE FUNCTION public.restore_hidden_discussion_report(p_report_id uuid, p_admin_id uuid, p_reason text)
RETURNS public.discussion_reports LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_report public.discussion_reports;
BEGIN
  IF char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'Invalid restoration reason' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_report FROM public.discussion_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found' USING ERRCODE = 'P0002'; END IF;
  IF v_report.status <> 'hidden' OR v_report.restored_at IS NOT NULL THEN
    RAISE EXCEPTION 'Report cannot be restored' USING ERRCODE = 'P0001';
  END IF;
  IF v_report.post_id IS NOT NULL THEN
    UPDATE public.discussion_posts SET status = 'visible', updated_at = now()
      WHERE id = v_report.post_id AND status = 'hidden' AND deleted_at IS NULL;
  ELSE
    UPDATE public.discussion_comments SET status = 'visible', updated_at = now()
      WHERE id = v_report.comment_id AND status = 'hidden' AND deleted_at IS NULL;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Content cannot be restored' USING ERRCODE = 'P0001'; END IF;
  UPDATE public.discussion_reports SET restored_at = now(), restored_by = p_admin_id,
    restoration_reason = btrim(p_reason)
    WHERE status = 'hidden' AND restored_at IS NULL
      AND ((v_report.post_id IS NOT NULL AND post_id = v_report.post_id)
        OR (v_report.comment_id IS NOT NULL AND comment_id = v_report.comment_id));
  SELECT * INTO v_report FROM public.discussion_reports WHERE id = p_report_id;
  RETURN v_report;
END;
$$;
REVOKE ALL ON FUNCTION public.restore_hidden_discussion_report(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_hidden_discussion_report(uuid, uuid, text) TO service_role;

-- A later moderation after restoration must produce a new notification.
ALTER TABLE public.discussion_notifications DROP CONSTRAINT discussion_notifications_target_type_target_id_key;
ALTER TABLE public.discussion_notifications ADD CONSTRAINT discussion_notifications_event_unique
  UNIQUE(target_type, target_id, created_at);
CREATE OR REPLACE FUNCTION public.notify_discussion_removal() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.status IN ('hidden', 'removed') AND OLD.status = 'pending' THEN
    IF NEW.post_id IS NOT NULL THEN
      INSERT INTO public.discussion_notifications
        (recipient_id, target_type, target_id, post_title, content_excerpt, reason, decision, created_at)
      SELECT author_id, 'post', id, title, left(content, 300), NEW.moderator_reason, NEW.status, NEW.resolved_at
      FROM public.discussion_posts WHERE id = NEW.post_id
      ON CONFLICT (target_type, target_id, created_at) DO NOTHING;
    ELSE
      INSERT INTO public.discussion_notifications
        (recipient_id, target_type, target_id, post_title, content_excerpt, reason, decision, created_at)
      SELECT c.author_id, 'comment', c.id, p.title, left(c.content, 300), NEW.moderator_reason, NEW.status, NEW.resolved_at
      FROM public.discussion_comments c JOIN public.discussion_posts p ON p.id = c.post_id
      WHERE c.id = NEW.comment_id
      ON CONFLICT (target_type, target_id, created_at) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
COMMIT;
