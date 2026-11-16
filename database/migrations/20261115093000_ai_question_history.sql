-- Review metadata and append-only history for shared question authoring.

CREATE TABLE IF NOT EXISTS public.question_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  version integer NOT NULL,
  action text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  actor_id uuid,
  reason text,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_history_action_check
    CHECK (action IN ('created', 'updated', 'submitted', 'approved', 'rejected')),
  CONSTRAINT question_history_status_check
    CHECK (to_status IN ('draft', 'approved', 'rejected')),
  CONSTRAINT question_history_reason_length_check
    CHECK (reason IS NULL OR char_length(reason) <= 2000)
);

CREATE INDEX IF NOT EXISTS question_history_question_version_idx
  ON public.question_history (question_id, version DESC, created_at DESC);

ALTER TABLE public.question_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.question_history FROM PUBLIC;
REVOKE ALL ON TABLE public.question_history FROM anon;
REVOKE ALL ON TABLE public.question_history FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.question_history TO service_role;

COMMENT ON TABLE public.question_history IS
  'Append-only snapshots and review decisions for shared question bank content.';

CREATE OR REPLACE FUNCTION public.update_shared_question_with_history(
  p_actor_id uuid,
  p_question_id uuid,
  p_expected_version integer,
  p_payload jsonb
)
RETURNS TABLE (id uuid, version integer, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_question public.questions%ROWTYPE;
  v_course_id uuid;
  v_chapter_id uuid;
  v_lesson_id uuid;
  v_type text;
  v_difficulty text;
  v_options jsonb;
  v_option_count integer;
  v_correct_count integer;
  v_has_incorrect boolean;
  v_option jsonb;
  v_seen_options text[] := ARRAY[]::text[];
  v_normalized_option text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles AS profile WHERE profile.id = p_actor_id AND profile.role IN ('content_manager', 'admin')) THEN
    RAISE EXCEPTION 'Question management requires content_manager or admin' USING ERRCODE = '42501';
  END IF;

  SELECT questions.* INTO v_question
  FROM public.questions AS questions
  WHERE questions.id = p_question_id AND questions.generated_for_user_id IS NULL
  FOR UPDATE;
  IF v_question.id IS NULL THEN RAISE EXCEPTION 'Question not found' USING ERRCODE = 'P0002'; END IF;
  IF p_expected_version IS NOT NULL AND p_expected_version <> COALESCE(v_question.version, 1) THEN
    RAISE EXCEPTION 'Question version conflict' USING ERRCODE = '40001';
  END IF;

  v_course_id := (p_payload->>'course_id')::uuid;
  v_chapter_id := (p_payload->>'chapter_id')::uuid;
  v_lesson_id := (p_payload->>'lesson_id')::uuid;
  v_type := p_payload->>'question_type';
  v_difficulty := p_payload->>'difficulty';
  v_options := p_payload->'options';
  IF NULLIF(pg_catalog.btrim(p_payload->>'content'), '') IS NULL
    OR pg_catalog.char_length(p_payload->>'content') > 5000
    OR NULLIF(pg_catalog.btrim(p_payload->>'explanation'), '') IS NULL
    OR v_type NOT IN ('single_choice', 'multiple_choice', 'true_false', 'fill_in_blank')
    OR v_difficulty NOT IN ('easy', 'medium', 'hard')
    OR pg_catalog.jsonb_typeof(v_options) <> 'array'
    OR pg_catalog.jsonb_array_length(v_options) < 1
    OR pg_catalog.jsonb_array_length(v_options) > 8 THEN
    RAISE EXCEPTION 'Question payload is invalid' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.chapters AS chapter
    JOIN public.lessons AS lesson ON lesson.chapter_id = chapter.id
    WHERE chapter.id = v_chapter_id AND chapter.course_id = v_course_id AND lesson.id = v_lesson_id
  ) THEN
    RAISE EXCEPTION 'Question position does not match course, chapter and lesson' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE (option_row.value->>'is_correct')::boolean)::integer,
         bool_or(NOT (option_row.value->>'is_correct')::boolean)
  INTO v_option_count, v_correct_count, v_has_incorrect
  FROM pg_catalog.jsonb_array_elements(v_options) AS option_row(value);
  IF (v_type = 'single_choice' AND (v_option_count < 2 OR v_correct_count <> 1))
    OR (v_type = 'multiple_choice' AND (v_option_count < 3 OR v_correct_count < 2 OR NOT COALESCE(v_has_incorrect, false)))
    OR (v_type = 'true_false' AND (v_option_count <> 2 OR v_correct_count <> 1))
    OR (v_type = 'fill_in_blank' AND (v_option_count <> 1 OR v_correct_count <> 1)) THEN
    RAISE EXCEPTION 'Question options are invalid for %', v_type USING ERRCODE = '22023';
  END IF;

  FOR v_option IN SELECT value FROM pg_catalog.jsonb_array_elements(v_options)
  LOOP
    IF NULLIF(pg_catalog.btrim(v_option->>'option_text'), '') IS NULL
      OR pg_catalog.char_length(v_option->>'option_text') > 1000
      OR pg_catalog.jsonb_typeof(v_option->'is_correct') <> 'boolean' THEN
      RAISE EXCEPTION 'Question option is invalid' USING ERRCODE = '22023';
    END IF;
    v_normalized_option := pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(v_option->>'option_text'), '\s+', ' ', 'g'));
    IF v_normalized_option = ANY(v_seen_options) THEN
      RAISE EXCEPTION 'Question options must not be duplicated' USING ERRCODE = '22023';
    END IF;
    v_seen_options := array_append(v_seen_options, v_normalized_option);
  END LOOP;

  UPDATE public.questions
  SET course_id = v_course_id, chapter_id = v_chapter_id, lesson_id = v_lesson_id,
      question_type = v_type, difficulty = v_difficulty,
      content = pg_catalog.btrim(p_payload->>'content'),
      explanation = pg_catalog.btrim(p_payload->>'explanation'),
      status = 'draft', submitted_for_review_at = NULL,
      updated_by = p_actor_id, updated_at = pg_catalog.now(),
      version = COALESCE(v_question.version, 1) + 1
  WHERE questions.id = p_question_id;

  DELETE FROM public.question_options WHERE question_id = p_question_id;
  INSERT INTO public.question_options (question_id, option_text, is_correct, order_index)
  SELECT p_question_id, pg_catalog.btrim(option_row.value->>'option_text'),
         (option_row.value->>'is_correct')::boolean,
         COALESCE((option_row.value->>'order_index')::integer, option_row.ordinality - 1)
  FROM pg_catalog.jsonb_array_elements(v_options) WITH ORDINALITY AS option_row(value, ordinality);

  INSERT INTO public.question_history (question_id, version, action, from_status, to_status, actor_id, snapshot)
  VALUES (p_question_id, COALESCE(v_question.version, 1) + 1, 'updated', v_question.status, 'draft', p_actor_id, p_payload);
  id := p_question_id; version := COALESCE(v_question.version, 1) + 1; status := 'draft'; RETURN NEXT;
END;
$$;

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
  IF NOT EXISTS (SELECT 1 FROM public.profiles AS profile WHERE profile.id = p_actor_id AND profile.role IN ('content_manager', 'admin')) THEN
    RAISE EXCEPTION 'Question management requires content_manager or admin' USING ERRCODE = '42501';
  END IF;
  SELECT questions.* INTO v_question FROM public.questions AS questions WHERE questions.id = p_question_id AND questions.generated_for_user_id IS NULL FOR UPDATE;
  IF v_question.id IS NULL THEN RAISE EXCEPTION 'Question not found' USING ERRCODE = 'P0002'; END IF;
  IF p_expected_version IS NOT NULL AND p_expected_version <> COALESCE(v_question.version, 1) THEN
    RAISE EXCEPTION 'Question version conflict' USING ERRCODE = '40001';
  END IF;
  IF p_action NOT IN ('submit', 'approve', 'reject') THEN RAISE EXCEPTION 'Unsupported question transition' USING ERRCODE = '22023'; END IF;
  IF p_action = 'reject' AND NULLIF(pg_catalog.btrim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'A reason is required when rejecting a question' USING ERRCODE = '22023'; END IF;
  IF p_action IN ('approve', 'reject') AND (v_question.status <> 'draft' OR v_question.submitted_for_review_at IS NULL) THEN
    RAISE EXCEPTION 'Question must be submitted before review' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'submit' AND v_question.status <> 'draft' THEN RAISE EXCEPTION 'Only draft questions can be submitted' USING ERRCODE = '22023'; END IF;

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
    v_to_status := 'draft'; v_history_action := 'submitted';
    UPDATE public.questions SET submitted_for_review_at = pg_catalog.now(), updated_by = p_actor_id, updated_at = pg_catalog.now(), version = v_next_version WHERE questions.id = p_question_id;
  ELSE
    v_to_status := CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END;
    v_history_action := v_to_status;
    UPDATE public.questions SET status = v_to_status, reviewed_by = p_actor_id, reviewed_at = pg_catalog.now(), updated_by = p_actor_id, updated_at = pg_catalog.now(), version = v_next_version WHERE questions.id = p_question_id;
  END IF;
  INSERT INTO public.question_history (question_id, version, action, from_status, to_status, actor_id, reason, snapshot)
  VALUES (p_question_id, v_next_version, v_history_action, v_question.status, v_to_status, p_actor_id, NULLIF(pg_catalog.btrim(p_reason), ''), v_snapshot);
  id := p_question_id; version := v_next_version; status := v_to_status; RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.update_shared_question_with_history(uuid, uuid, integer, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_shared_question_with_history(uuid, uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_shared_question_with_history(uuid, uuid, integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_shared_question_with_history(uuid, uuid, text, integer, text) TO service_role;
