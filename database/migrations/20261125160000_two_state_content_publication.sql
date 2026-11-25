-- Learning content has two user-facing states: draft and published.
-- Publishing is available directly from a draft; unpublishing returns it to draft.
CREATE OR REPLACE FUNCTION public.apply_lesson_review_action(
  p_lesson_id uuid,
  p_actor_id uuid,
  p_version integer,
  p_action text,
  p_reason text DEFAULT NULL
) RETURNS public.lessons
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  lesson_row public.lessons;
  next_status text;
  actor_role text;
  previous_status text;
BEGIN
  SELECT * INTO lesson_row
  FROM public.lessons
  WHERE id = p_lesson_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson not found' USING ERRCODE = 'P0002';
  END IF;
  IF lesson_row.version <> p_version THEN
    RAISE EXCEPTION 'Lesson changed; reload and retry' USING ERRCODE = '40001';
  END IF;

  SELECT role INTO actor_role FROM public.profiles WHERE id = p_actor_id;
  IF actor_role NOT IN ('admin', 'content_manager') OR actor_role IS NULL THEN
    RAISE EXCEPTION 'Actor is not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_action IN ('publish', 'approve') AND lesson_row.status IN ('draft', 'approved') THEN
    next_status := 'published';
  ELSIF p_action = 'unpublish' AND lesson_row.status = 'published' THEN
    next_status := 'draft';
  ELSE
    RAISE EXCEPTION 'Invalid lesson status transition' USING ERRCODE = '40001';
  END IF;
  previous_status := lesson_row.status;

  IF p_action IN ('publish', 'approve') AND NOT EXISTS (
    SELECT 1 FROM public.lesson_validation_runs
    WHERE lesson_id = lesson_row.id
      AND lesson_version = lesson_row.version
      AND status = 'passed'
  ) THEN
    RAISE EXCEPTION 'Run lesson validation and resolve all errors before publication' USING ERRCODE = '22023';
  END IF;

  IF p_action = 'unpublish' AND length(trim(coalesce(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'A reason is required' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.lesson_review_write', 'on', true);
  UPDATE public.lessons SET
    status = next_status,
    version = lesson_row.version + 1,
    updated_by = p_actor_id,
    updated_at = now(),
    reviewed_by = CASE WHEN next_status = 'published' THEN p_actor_id ELSE NULL END,
    reviewed_at = CASE WHEN next_status = 'published' THEN now() ELSE NULL END
  WHERE id = p_lesson_id
  RETURNING * INTO lesson_row;

  INSERT INTO public.lesson_review_events
    (lesson_id, version, action, from_status, to_status, actor_id, reason, snapshot)
  VALUES
    (lesson_row.id, lesson_row.version, CASE WHEN p_action = 'approve' THEN 'publish' ELSE p_action END,
     previous_status,
     next_status, p_actor_id, nullif(trim(p_reason), ''),
     jsonb_build_object(
       'title', lesson_row.title,
       'content', lesson_row.content,
       'code_example', lesson_row.code_example,
       'estimated_duration_minutes', lesson_row.estimated_duration_minutes
     ));

  RETURN lesson_row;
END
$$;

REVOKE ALL ON FUNCTION public.apply_lesson_review_action(uuid, uuid, integer, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_lesson_review_action(uuid, uuid, integer, text, text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
