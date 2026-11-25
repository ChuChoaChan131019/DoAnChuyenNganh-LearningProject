-- A review decision can be reversed without rewriting the question content.
ALTER TABLE public.question_history
  DROP CONSTRAINT IF EXISTS question_history_action_check;
ALTER TABLE public.question_history
  ADD CONSTRAINT question_history_action_check
  CHECK (action IN ('created', 'updated', 'submitted', 'approved', 'rejected', 'unapproved'));

CREATE OR REPLACE FUNCTION public.revoke_shared_question_approval(
  p_actor_id uuid,
  p_question_id uuid,
  p_expected_version integer,
  p_reason text
)
RETURNS TABLE (id uuid, version integer, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_question public.questions%ROWTYPE;
  v_next_version integer;
  v_snapshot jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles AS profile
    WHERE profile.id = p_actor_id AND profile.role IN ('content_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Question management requires content_manager or admin' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(pg_catalog.btrim(p_reason), '') IS NULL
    OR pg_catalog.char_length(pg_catalog.btrim(p_reason)) > 2000 THEN
    RAISE EXCEPTION 'A reason of at most 2000 characters is required' USING ERRCODE = '22023';
  END IF;

  SELECT question.* INTO v_question
  FROM public.questions AS question
  WHERE question.id = p_question_id AND question.generated_for_user_id IS NULL
  FOR UPDATE;
  IF v_question.id IS NULL THEN RAISE EXCEPTION 'Question not found' USING ERRCODE = 'P0002'; END IF;
  IF p_expected_version IS NULL OR p_expected_version <> COALESCE(v_question.version, 1) THEN
    RAISE EXCEPTION 'Question version conflict' USING ERRCODE = '40001';
  END IF;
  IF v_question.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved questions can be unapproved' USING ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.jsonb_build_object(
    'id', v_question.id, 'course_id', v_question.course_id, 'chapter_id', v_question.chapter_id,
    'lesson_id', v_question.lesson_id, 'question_type', v_question.question_type,
    'difficulty', v_question.difficulty, 'content', v_question.content,
    'explanation', v_question.explanation,
    'options', COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'option_text', option.option_text, 'is_correct', option.is_correct, 'order_index', option.order_index
    ) ORDER BY option.order_index), '[]'::jsonb)
  ) INTO v_snapshot
  FROM public.question_options AS option WHERE option.question_id = p_question_id;

  v_next_version := COALESCE(v_question.version, 1) + 1;
  UPDATE public.questions AS question
  SET status = 'draft', submitted_for_review_at = NULL,
      reviewed_by = NULL, reviewed_at = NULL,
      updated_by = p_actor_id, updated_at = pg_catalog.now(), version = v_next_version
  WHERE question.id = p_question_id;

  INSERT INTO public.question_history
    (question_id, version, action, from_status, to_status, actor_id, reason, snapshot)
  VALUES
    (p_question_id, v_next_version, 'unapproved', 'approved', 'draft',
     p_actor_id, pg_catalog.btrim(p_reason), v_snapshot);

  -- A published quiz with no remaining approved question becomes a draft.
  UPDATE public.quizzes AS quiz
  SET is_active = false
  WHERE quiz.is_active IS TRUE
    AND EXISTS (
      SELECT 1 FROM public.quiz_questions AS link
      WHERE link.quiz_id = quiz.id AND link.question_id = p_question_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.quiz_questions AS link
      JOIN public.questions AS question ON question.id = link.question_id
      WHERE link.quiz_id = quiz.id AND question.status = 'approved'
    );

  id := p_question_id;
  version := v_next_version;
  status := 'draft';
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_shared_question_approval(uuid, uuid, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_shared_question_approval(uuid, uuid, integer, text)
  TO service_role;
