-- Creation snapshots belong to the same transaction as questions and options.
-- Preflight legacy history with scripts/deploy-ai-question-authoring.mjs (without --apply).
-- If duplicate creation records exist this index deliberately fails; do not delete audit data.
CREATE UNIQUE INDEX IF NOT EXISTS question_history_one_creation_idx
  ON public.question_history (question_id) WHERE action = 'created';

CREATE OR REPLACE FUNCTION public.save_ai_question_drafts(
  p_actor_id uuid,
  p_batch_id uuid,
  p_questions jsonb
)
RETURNS TABLE (client_id text, id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_question jsonb;
  v_option jsonb;
  v_existing record;
  v_question_id uuid;
  v_hash text;
  v_type text;
  v_difficulty text;
  v_option_count integer;
  v_correct_count integer;
  v_has_incorrect boolean;
  v_client_id text;
  v_course_id uuid;
  v_chapter_id uuid;
  v_lesson_id uuid;
  v_seen_clients text[] := ARRAY[]::text[];
  v_seen_options text[];
  v_normalized_option text;
BEGIN
  IF p_batch_id IS NULL
    OR p_questions IS NULL
    OR jsonb_typeof(p_questions) <> 'array'
    OR jsonb_array_length(p_questions) < 1
    OR jsonb_array_length(p_questions) > 10 THEN
    RAISE EXCEPTION 'AI draft batch must contain between 1 and 10 questions'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles AS profile
    WHERE profile.id = p_actor_id
      AND profile.role IN ('content_manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Question management requires content_manager or admin'
      USING ERRCODE = '42501';
  END IF;

  -- Serialize retries and concurrent requests for the same client batch.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_batch_id::text, 0));
  v_hash := pg_catalog.md5(p_questions::text);

  SELECT count(*)::integer AS total, min(q.ai_draft_payload_hash) AS payload_hash
  INTO v_existing
  FROM public.questions AS q
  WHERE q.ai_draft_batch_id = p_batch_id;

  IF v_existing.total > 0 THEN
    IF v_existing.total <> jsonb_array_length(p_questions)
      OR v_existing.payload_hash IS DISTINCT FROM v_hash
      OR EXISTS (SELECT 1 FROM public.questions q WHERE q.ai_draft_batch_id=p_batch_id AND q.created_by IS DISTINCT FROM p_actor_id) THEN
      RAISE EXCEPTION 'AI draft batch was already used with a different payload'
        USING ERRCODE = '23505';
    END IF;

    FOR v_question IN SELECT value FROM pg_catalog.jsonb_array_elements(p_questions)
    LOOP
      v_client_id := NULLIF(pg_catalog.btrim(v_question->>'client_id'), '');
      SELECT q.id, q.status, q.ai_draft_payload_hash
      INTO v_existing
      FROM public.questions AS q
      WHERE q.ai_draft_batch_id = p_batch_id
        AND q.ai_draft_client_id = v_client_id;
      IF v_existing.id IS NULL OR v_existing.ai_draft_payload_hash IS DISTINCT FROM v_hash THEN
        RAISE EXCEPTION 'AI draft batch was already used with a different payload'
          USING ERRCODE = '23505';
      END IF;
      client_id := v_client_id;
      id := v_existing.id;
      status := v_existing.status;
      RETURN NEXT;
    END LOOP;
    RETURN;
  END IF;

  FOR v_question IN SELECT value FROM pg_catalog.jsonb_array_elements(p_questions)
  LOOP
    v_client_id := NULLIF(pg_catalog.btrim(v_question->>'client_id'), '');
    IF v_client_id IS NULL OR v_client_id = ANY(v_seen_clients) THEN
      RAISE EXCEPTION 'Every AI draft question must have a unique client_id'
        USING ERRCODE = '22023';
    END IF;
    v_seen_clients := array_append(v_seen_clients, v_client_id);

    v_type := v_question->>'question_type';
    v_difficulty := v_question->>'difficulty';
    v_course_id := (v_question->>'course_id')::uuid;
    v_chapter_id := (v_question->>'chapter_id')::uuid;
    v_lesson_id := (v_question->>'lesson_id')::uuid;

    IF v_type NOT IN ('single_choice', 'multiple_choice', 'true_false', 'fill_in_blank')
      OR v_difficulty NOT IN ('easy', 'medium', 'hard')
      OR NULLIF(pg_catalog.btrim(v_question->>'content'), '') IS NULL
      OR pg_catalog.char_length(v_question->>'content') > 5000
      OR NULLIF(pg_catalog.btrim(v_question->>'explanation'), '') IS NULL
      OR pg_catalog.char_length(v_question->>'explanation') > 5000
      OR pg_catalog.jsonb_typeof(v_question->'options') <> 'array'
      OR pg_catalog.jsonb_array_length(v_question->'options') < 1
      OR pg_catalog.jsonb_array_length(v_question->'options') > 8 THEN
      RAISE EXCEPTION 'AI draft contains an invalid question'
        USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.chapters AS chapter
      JOIN public.courses AS course ON course.id = chapter.course_id
      JOIN public.lessons AS lesson ON lesson.id = v_lesson_id
      WHERE chapter.id = v_chapter_id
        AND chapter.course_id = v_course_id
        AND lesson.chapter_id = chapter.id
    ) THEN
      RAISE EXCEPTION 'AI draft position does not match course, chapter and lesson'
        USING ERRCODE = '22023';
    END IF;

    SELECT count(*)::integer,
           count(*) FILTER (WHERE (option_row.value->>'is_correct')::boolean)::integer,
           bool_or(NOT (option_row.value->>'is_correct')::boolean)
    INTO v_option_count, v_correct_count, v_has_incorrect
    FROM pg_catalog.jsonb_array_elements(v_question->'options') AS option_row(value);

    IF (v_type = 'single_choice' AND (v_option_count < 2 OR v_correct_count <> 1))
      OR (v_type = 'multiple_choice' AND (v_option_count < 3 OR v_correct_count < 2 OR NOT COALESCE(v_has_incorrect, false)))
      OR (v_type = 'true_false' AND (v_option_count <> 2 OR v_correct_count <> 1))
      OR (v_type = 'fill_in_blank' AND (v_option_count <> 1 OR v_correct_count <> 1)) THEN
      RAISE EXCEPTION 'AI draft contains invalid options for %', v_type
        USING ERRCODE = '22023';
    END IF;

    v_seen_options := ARRAY[]::text[];
    FOR v_option IN SELECT value FROM pg_catalog.jsonb_array_elements(v_question->'options')
    LOOP
      IF NULLIF(pg_catalog.btrim(v_option->>'option_text'), '') IS NULL
        OR pg_catalog.char_length(v_option->>'option_text') > 1000
        OR pg_catalog.jsonb_typeof(v_option->'is_correct') <> 'boolean' THEN
        RAISE EXCEPTION 'AI draft contains an invalid option'
          USING ERRCODE = '22023';
      END IF;
      v_normalized_option := pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(v_option->>'option_text'), '\s+', ' ', 'g'));
      IF v_normalized_option = ANY(v_seen_options) THEN
        RAISE EXCEPTION 'AI draft options must not be duplicated'
          USING ERRCODE = '22023';
      END IF;
      v_seen_options := array_append(v_seen_options, v_normalized_option);
    END LOOP;

    IF v_type = 'true_false'
      AND NOT (
        EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(v_question->'options') AS option_row(value) WHERE pg_catalog.lower(pg_catalog.btrim(option_row.value->>'option_text')) = 'đúng')
        AND EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(v_question->'options') AS option_row(value) WHERE pg_catalog.lower(pg_catalog.btrim(option_row.value->>'option_text')) = 'sai')
      ) THEN
      RAISE EXCEPTION 'true_false must contain Đúng and Sai options'
        USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.questions (
      course_id, chapter_id, lesson_id, question_type, difficulty, content,
      explanation, status, is_ai_generated, generated_for_user_id,
      ai_draft_batch_id, ai_draft_client_id, ai_draft_payload_hash,
      created_by, updated_by, updated_at, version
    ) VALUES (
      v_course_id, v_chapter_id, v_lesson_id, v_type, v_difficulty,
      pg_catalog.btrim(v_question->>'content'), pg_catalog.btrim(v_question->>'explanation'),
      'draft', true, NULL, p_batch_id, v_client_id, v_hash,
      p_actor_id, p_actor_id, pg_catalog.now(), 1
    ) RETURNING questions.id INTO v_question_id;

    INSERT INTO public.question_options (question_id, option_text, is_correct, order_index)
    SELECT v_question_id,
           pg_catalog.btrim(option_row.value->>'option_text'),
           (option_row.value->>'is_correct')::boolean,
           COALESCE((option_row.value->>'order_index')::integer, option_row.ordinality - 1)
    FROM pg_catalog.jsonb_array_elements(v_question->'options') WITH ORDINALITY AS option_row(value, ordinality);

    INSERT INTO public.question_history (question_id, version, action, from_status, to_status, actor_id, snapshot)
    SELECT q.id, q.version, 'created', NULL, q.status, p_actor_id,
      pg_catalog.to_jsonb(q) || pg_catalog.jsonb_build_object('options', (
        SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'option_text', o.option_text, 'is_correct', o.is_correct, 'order_index', o.order_index
        ) ORDER BY o.order_index), '[]'::jsonb) FROM public.question_options o WHERE o.question_id=q.id
      ))
    FROM public.questions q WHERE q.id=v_question_id;

    client_id := v_client_id;
    id := v_question_id;
    status := 'draft';
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.save_ai_question_drafts(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_ai_question_drafts(uuid, uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.save_ai_question_drafts(uuid, uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.save_ai_question_drafts(uuid, uuid, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.create_shared_question_with_history(
  p_actor_id uuid,
  p_payload jsonb
)
RETURNS TABLE (id uuid, version integer, status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_question_id uuid;
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

  v_course_id := (p_payload->>'course_id')::uuid;
  v_chapter_id := (p_payload->>'chapter_id')::uuid;
  v_lesson_id := (p_payload->>'lesson_id')::uuid;
  v_type := p_payload->>'question_type';
  v_difficulty := p_payload->>'difficulty';
  v_options := p_payload->'options';
  IF NULLIF(pg_catalog.btrim(p_payload->>'content'), '') IS NULL
    OR pg_catalog.char_length(p_payload->>'content') > 5000
    OR NULLIF(pg_catalog.btrim(p_payload->>'explanation'), '') IS NULL
    OR pg_catalog.char_length(p_payload->>'explanation') > 5000
    OR v_type IS NULL OR v_difficulty IS NULL
    OR v_type NOT IN ('single_choice', 'multiple_choice', 'true_false', 'fill_in_blank')
    OR v_difficulty NOT IN ('easy', 'medium', 'hard')
    OR pg_catalog.jsonb_typeof(v_options) <> 'array'
    OR pg_catalog.jsonb_array_length(v_options) < 1
    OR pg_catalog.jsonb_array_length(v_options) > 8 THEN
    RAISE EXCEPTION 'Question payload is invalid' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.chapters AS chapter
    WHERE chapter.id = v_chapter_id AND chapter.course_id = v_course_id
      AND (v_lesson_id IS NULL OR EXISTS (SELECT 1 FROM public.lessons lesson WHERE lesson.id=v_lesson_id AND lesson.chapter_id=chapter.id))
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

  IF v_type = 'true_false' AND NOT (v_seen_options @> ARRAY['đúng', 'sai']::text[]) THEN
    RAISE EXCEPTION 'true_false requires Đúng and Sai' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.questions (course_id, chapter_id, lesson_id, question_type, difficulty,
    content, explanation, status, is_ai_generated, generated_for_user_id, created_by, updated_by, version)
  VALUES (v_course_id, v_chapter_id, v_lesson_id, v_type, v_difficulty,
    pg_catalog.btrim(p_payload->>'content'), pg_catalog.btrim(p_payload->>'explanation'),
    'draft', false, NULL, p_actor_id, p_actor_id, 1)
  RETURNING questions.id INTO v_question_id;

  INSERT INTO public.question_options (question_id, option_text, is_correct, order_index)
  SELECT v_question_id, pg_catalog.btrim(option_row.value->>'option_text'),
         (option_row.value->>'is_correct')::boolean,
         COALESCE((option_row.value->>'order_index')::integer, option_row.ordinality - 1)
  FROM pg_catalog.jsonb_array_elements(v_options) WITH ORDINALITY AS option_row(value, ordinality);

  INSERT INTO public.question_history (question_id, version, action, from_status, to_status, actor_id, snapshot)
  SELECT q.id, q.version, 'created', NULL, q.status, p_actor_id,
    pg_catalog.to_jsonb(q) || pg_catalog.jsonb_build_object('options', (
    SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'option_text', o.option_text, 'is_correct', o.is_correct, 'order_index', o.order_index
    ) ORDER BY o.order_index), '[]'::jsonb) FROM public.question_options o WHERE o.question_id=q.id
    ))
  FROM public.questions q WHERE q.id=v_question_id;

  id := v_question_id; version := 1; status := 'draft'; RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.create_shared_question_with_history(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_shared_question_with_history(uuid, jsonb) TO service_role;
