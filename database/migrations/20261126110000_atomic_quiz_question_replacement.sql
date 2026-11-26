-- Replace a quiz's question set and archive it in one transaction.
-- Only the backend service role may call this RPC.
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS order_index integer;

CREATE OR REPLACE FUNCTION public.replace_quiz_questions(
  p_quiz_id uuid,
  p_questions jsonb,
  p_settings jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_item jsonb;
  v_question_id uuid;
  v_weight double precision;
  v_question public.questions%ROWTYPE;
  v_course_id uuid;
  v_chapter_id uuid;
  v_position integer := 0;
  v_seen uuid[] := ARRAY[]::uuid[];
BEGIN
  IF pg_catalog.jsonb_typeof(p_questions) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Questions must be an array' USING ERRCODE = '22023';
  END IF;
  IF p_settings IS NOT NULL AND pg_catalog.jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION 'Quiz settings must be an object' USING ERRCODE = '22023';
  END IF;

  -- Lock the quiz so concurrent replacements cannot interleave.
  SELECT COALESCE((p_settings ->> 'course_id')::uuid, quiz.course_id),
         CASE WHEN p_settings ? 'chapter_id' THEN (p_settings ->> 'chapter_id')::uuid ELSE quiz.chapter_id END
  INTO v_course_id, v_chapter_id
  FROM public.quizzes AS quiz WHERE quiz.id = p_quiz_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_chapter_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.chapters AS chapter
    WHERE chapter.id = v_chapter_id AND chapter.course_id = v_course_id
  ) THEN
    RAISE EXCEPTION 'Chapter belongs to another course' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_questions)
  LOOP
    v_question_id := (v_item ->> 'question_id')::uuid;
    v_weight := (v_item ->> 'score_weight')::double precision;
    IF v_question_id IS NULL OR v_weight IS NULL OR v_weight < 0.1 OR v_weight = 'Infinity'::double precision OR v_weight = '-Infinity'::double precision OR v_weight = 'NaN'::double precision THEN
      RAISE EXCEPTION 'Invalid quiz question or score weight' USING ERRCODE = '22023';
    END IF;
    IF v_question_id = ANY(v_seen) THEN
      RAISE EXCEPTION 'Question ids must be unique' USING ERRCODE = '22023';
    END IF;
    v_seen := pg_catalog.array_append(v_seen, v_question_id);

    SELECT question.* INTO v_question
    FROM public.questions AS question
    WHERE question.id = v_question_id
    FOR SHARE;
    IF v_question.id IS NULL OR v_question.status <> 'approved' THEN
      RAISE EXCEPTION 'Only approved questions can be added to a quiz' USING ERRCODE = '22023';
    END IF;
    IF v_question.course_id IS DISTINCT FROM v_course_id THEN
      RAISE EXCEPTION 'Question belongs to another course' USING ERRCODE = '22023';
    END IF;
    IF v_question.deleted_at IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.quiz_questions AS link
      WHERE link.quiz_id = p_quiz_id AND link.question_id = v_question_id
    ) THEN
      RAISE EXCEPTION 'Deleted questions cannot be added to a quiz' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  UPDATE public.quizzes
  SET is_active = false,
      title = COALESCE(p_settings ->> 'title', title),
      description = CASE WHEN p_settings ? 'description' THEN p_settings ->> 'description' ELSE description END,
      course_id = COALESCE((p_settings ->> 'course_id')::uuid, course_id),
      chapter_id = CASE WHEN p_settings ? 'chapter_id' THEN (p_settings ->> 'chapter_id')::uuid ELSE chapter_id END,
      duration_minutes = CASE WHEN p_settings ? 'duration_minutes' THEN (p_settings ->> 'duration_minutes')::integer ELSE duration_minutes END,
      pass_percentage = COALESCE((p_settings ->> 'pass_score')::numeric, pass_percentage),
      quiz_type = COALESCE(p_settings ->> 'quiz_type', quiz_type),
      shuffle_questions = COALESCE((p_settings ->> 'shuffle_questions')::boolean, shuffle_questions),
      shuffle_options = COALESCE((p_settings ->> 'shuffle_options')::boolean, shuffle_options),
      is_required = COALESCE((p_settings ->> 'is_required')::boolean, is_required),
      counts_toward_progress = COALESCE((p_settings ->> 'counts_toward_progress')::boolean, counts_toward_progress)
  WHERE id = p_quiz_id;
  DELETE FROM public.quiz_questions WHERE quiz_id = p_quiz_id;

  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_questions)
  LOOP
    INSERT INTO public.quiz_questions (quiz_id, question_id, score_weight, order_index)
    VALUES (p_quiz_id, (v_item ->> 'question_id')::uuid, (v_item ->> 'score_weight')::double precision, v_position);
    v_position := v_position + 1;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_quiz_questions(uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_quiz_questions(uuid, jsonb, jsonb) TO service_role;
