-- D04: discussion reports and atomic moderation decisions.
BEGIN;

CREATE TABLE public.discussion_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.discussion_posts(id) ON DELETE RESTRICT,
  comment_id uuid REFERENCES public.discussion_comments(id) ON DELETE RESTRICT,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  moderator_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  moderator_reason text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discussion_reports_one_target CHECK ((post_id IS NULL) <> (comment_id IS NULL)),
  CONSTRAINT discussion_reports_reason_length CHECK (char_length(btrim(reason)) BETWEEN 10 AND 1000),
  CONSTRAINT discussion_reports_status_check CHECK (status IN ('pending', 'dismissed', 'hidden', 'removed')),
  CONSTRAINT discussion_reports_resolution_check CHECK (
    (status = 'pending' AND moderator_id IS NULL AND moderator_reason IS NULL AND resolved_at IS NULL)
    OR
    (status <> 'pending' AND moderator_id IS NOT NULL AND moderator_reason IS NOT NULL
      AND char_length(btrim(moderator_reason)) BETWEEN 10 AND 1000 AND resolved_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX discussion_reports_pending_post_unique
  ON public.discussion_reports (reporter_id, post_id)
  WHERE status = 'pending' AND post_id IS NOT NULL;
CREATE UNIQUE INDEX discussion_reports_pending_comment_unique
  ON public.discussion_reports (reporter_id, comment_id)
  WHERE status = 'pending' AND comment_id IS NOT NULL;
CREATE INDEX discussion_reports_pending_queue
  ON public.discussion_reports (created_at DESC, id DESC) WHERE status = 'pending';
CREATE INDEX discussion_reports_post_id_idx ON public.discussion_reports (post_id) WHERE post_id IS NOT NULL;
CREATE INDEX discussion_reports_comment_id_idx ON public.discussion_reports (comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX discussion_reports_reporter_id_idx ON public.discussion_reports (reporter_id);
CREATE INDEX discussion_reports_moderator_id_idx ON public.discussion_reports (moderator_id)
  WHERE moderator_id IS NOT NULL;

ALTER TABLE public.discussion_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.discussion_reports FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.discussion_reports TO service_role;

CREATE FUNCTION public.resolve_discussion_report(
  p_report_id uuid,
  p_moderator_id uuid,
  p_decision text,
  p_reason text
) RETURNS public.discussion_reports
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_report public.discussion_reports;
BEGIN
  IF p_decision NOT IN ('dismissed', 'hidden', 'removed')
     OR char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'Invalid moderation decision' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_report FROM public.discussion_reports
    WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_report.status <> 'pending' THEN
    RAISE EXCEPTION 'Report already resolved' USING ERRCODE = 'P0001';
  END IF;

  IF p_decision IN ('hidden', 'removed') THEN
    IF v_report.post_id IS NOT NULL THEN
      UPDATE public.discussion_posts
        SET status = p_decision, updated_at = now()
        WHERE id = v_report.post_id AND status = 'visible' AND deleted_at IS NULL;
    ELSE
      UPDATE public.discussion_comments
        SET status = p_decision, updated_at = now()
        WHERE id = v_report.comment_id AND status = 'visible' AND deleted_at IS NULL;
    END IF;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Reported content is no longer visible' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.discussion_reports
      SET status = p_decision, moderator_id = p_moderator_id,
          moderator_reason = btrim(p_reason), resolved_at = now()
      WHERE status = 'pending'
        AND ((v_report.post_id IS NOT NULL AND post_id = v_report.post_id)
          OR (v_report.comment_id IS NOT NULL AND comment_id = v_report.comment_id));
  ELSE
    UPDATE public.discussion_reports
      SET status = 'dismissed', moderator_id = p_moderator_id,
          moderator_reason = btrim(p_reason), resolved_at = now()
      WHERE id = p_report_id;
  END IF;

  SELECT * INTO v_report FROM public.discussion_reports WHERE id = p_report_id;
  RETURN v_report;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_discussion_report(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_discussion_report(uuid, uuid, text, text)
  TO service_role;

COMMIT;
