BEGIN;

CREATE OR REPLACE FUNCTION public.transition_shared_question_with_history(
  p_actor_id uuid,
  p_question_id uuid,
  p_action text,
  p_expected_version integer DEFAULT NULL,
  p_reason text DEFAULT NULL
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
  v_to_status text;
  v_history_action text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles AS profile
    WHERE profile.id = p_actor_id AND profile.role IN ('content_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Question management requires content_manager or admin' USING ERRCODE = '42501';
  END IF;

  SELECT questions.* INTO v_question
  FROM public.questions AS questions
  WHERE questions.id = p_question_id AND questions.generated_for_user_id IS NULL
  FOR UPDATE;

  IF v_question.id IS NULL THEN
    RAISE EXCEPTION 'Question not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_expected_version IS NOT NULL AND p_expected_version <> COALESCE(v_question.version, 1) THEN
    RAISE EXCEPTION 'Question version conflict' USING ERRCODE = '40001';
  END IF;
  IF p_action NOT IN ('submit', 'approve', 'reject') THEN
    RAISE EXCEPTION 'Unsupported question transition' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'reject' AND NULLIF(pg_catalog.btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'A reason is required when rejecting a question' USING ERRCODE = '22023';
  END IF;
  IF v_question.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft questions can be changed' USING ERRCODE = '22023';
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
  IF p_action = 'submit' THEN
    v_to_status := 'draft';
    v_history_action := 'submitted';
    UPDATE public.questions
    SET submitted_for_review_at = pg_catalog.now(), updated_by = p_actor_id,
        updated_at = pg_catalog.now(), version = v_next_version
    WHERE questions.id = p_question_id;
  ELSE
    v_to_status := CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END;
    v_history_action := v_to_status;
    UPDATE public.questions
    SET status = v_to_status, submitted_for_review_at = NULL,
        reviewed_by = p_actor_id, reviewed_at = pg_catalog.now(),
        updated_by = p_actor_id, updated_at = pg_catalog.now(), version = v_next_version
    WHERE questions.id = p_question_id;
  END IF;

  INSERT INTO public.question_history
    (question_id, version, action, from_status, to_status, actor_id, reason, snapshot)
  VALUES
    (p_question_id, v_next_version, v_history_action, v_question.status,
     v_to_status, p_actor_id, NULLIF(pg_catalog.btrim(p_reason), ''), v_snapshot);

  id := p_question_id;
  version := v_next_version;
  status := v_to_status;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_shared_question_with_history(uuid, uuid, text, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_shared_question_with_history(uuid, uuid, text, integer, text)
  TO service_role;

COMMIT;
