-- Learner-owned AI practice sets grouped by chapter and sourced from one lesson.

CREATE TABLE IF NOT EXISTS public.ai_practice_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE RESTRICT,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'generating',
  difficulty text NOT NULL DEFAULT 'mixed',
  requested_count integer NOT NULL DEFAULT 5,
  generated_count integer NOT NULL DEFAULT 0,
  prompt text,
  error_code text,
  attempt_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  processing_started_at timestamptz,
  completed_at timestamptz,
  CONSTRAINT ai_practice_sets_status_check
    CHECK (status IN ('generating', 'ready', 'failed')),
  CONSTRAINT ai_practice_sets_difficulty_check
    CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')),
  CONSTRAINT ai_practice_sets_requested_count_check
    CHECK (requested_count BETWEEN 3 AND 10),
  CONSTRAINT ai_practice_sets_generated_count_check
    CHECK (generated_count BETWEEN 0 AND requested_count),
  CONSTRAINT ai_practice_sets_prompt_length_check
    CHECK (prompt IS NULL OR char_length(prompt) <= 500),
  CONSTRAINT ai_practice_sets_attempt_count_check
    CHECK (attempt_count >= 1)
);

CREATE INDEX IF NOT EXISTS ai_practice_sets_owner_chapter_created_idx
  ON public.ai_practice_sets (user_id, chapter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_practice_sets_owner_status_created_idx
  ON public.ai_practice_sets (user_id, status, created_at DESC);

ALTER TABLE public.ai_practice_sets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'ai_practice_sets_select_own'
      AND polrelid = 'public.ai_practice_sets'::regclass
  ) THEN
    CREATE POLICY ai_practice_sets_select_own
      ON public.ai_practice_sets
      FOR SELECT
      TO authenticated
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END
$$;

REVOKE ALL ON TABLE public.ai_practice_sets FROM PUBLIC;
REVOKE ALL ON TABLE public.ai_practice_sets FROM anon;
REVOKE ALL ON TABLE public.ai_practice_sets FROM authenticated;
GRANT SELECT ON TABLE public.ai_practice_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_practice_sets TO service_role;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS ai_practice_set_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'questions_ai_practice_set_id_fkey'
      AND conrelid = 'public.questions'::regclass
  ) THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT questions_ai_practice_set_id_fkey
      FOREIGN KEY (ai_practice_set_id)
      REFERENCES public.ai_practice_sets(id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS questions_ai_practice_set_created_idx
  ON public.questions (ai_practice_set_id, created_at)
  WHERE ai_practice_set_id IS NOT NULL;

COMMENT ON TABLE public.ai_practice_sets IS
  'Learner-owned groups of AI-generated questions sourced from one published lesson.';
COMMENT ON COLUMN public.questions.ai_practice_set_id IS
  'AI practice set containing this learner-owned question; NULL means it is not part of a generated set.';

CREATE OR REPLACE FUNCTION public.save_ai_practice_set_questions(
  p_user_id uuid,
  p_set_id uuid,
  p_questions jsonb
)
RETURNS TABLE (id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_set public.ai_practice_sets%ROWTYPE;
  v_question jsonb;
  v_option jsonb;
  v_question_id uuid;
  v_question_type text;
  v_difficulty text;
  v_options jsonb;
  v_option_count integer;
  v_correct_count integer;
  v_order_index integer;
BEGIN
  SELECT practice_set.*
  INTO v_set
  FROM public.ai_practice_sets AS practice_set
  WHERE practice_set.id = p_set_id
    AND practice_set.user_id = p_user_id
    AND practice_set.status = 'generating'
  FOR UPDATE;

  IF v_set.id IS NULL THEN
    RAISE EXCEPTION 'AI practice set is not available' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = p_user_id
      AND profile.role = 'learner'
  ) THEN
    RAISE EXCEPTION 'Learner profile is not available' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.lessons AS lesson
    JOIN public.chapters AS chapter ON chapter.id = lesson.chapter_id
    JOIN public.courses AS course ON course.id = chapter.course_id
    WHERE lesson.id = v_set.lesson_id
      AND chapter.id = v_set.chapter_id
      AND course.id = v_set.course_id
      AND lesson.status = 'published'
      AND chapter.status = 'published'
      AND course.status = 'published'
  ) THEN
    RAISE EXCEPTION 'Lesson is not available for this learner' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_questions) <> 'array'
    OR jsonb_array_length(p_questions) <> v_set.requested_count THEN
    RAISE EXCEPTION 'AI practice question count does not match the requested set'
      USING ERRCODE = '22023';
  END IF;

  FOR v_question IN SELECT value FROM jsonb_array_elements(p_questions)
  LOOP
    v_question_type := v_question->>'question_type';
    v_difficulty := v_question->>'difficulty';
    v_options := v_question->'options';

    IF NULLIF(btrim(v_question->>'content'), '') IS NULL
      OR NULLIF(btrim(v_question->>'explanation'), '') IS NULL
      OR v_question_type NOT IN ('single_choice', 'multiple_choice', 'true_false', 'fill_in_blank')
      OR v_difficulty NOT IN ('easy', 'medium', 'hard')
      OR jsonb_typeof(v_options) <> 'array' THEN
      RAISE EXCEPTION 'AI returned an invalid question' USING ERRCODE = '22023';
    END IF;

    SELECT count(*), count(*) FILTER (WHERE value->'is_correct' = 'true'::jsonb)
    INTO v_option_count, v_correct_count
    FROM jsonb_array_elements(v_options);

    IF (v_question_type = 'single_choice' AND (v_option_count < 2 OR v_correct_count <> 1))
      OR (v_question_type = 'multiple_choice' AND (v_option_count < 3 OR v_correct_count < 2))
      OR (v_question_type = 'true_false' AND (v_option_count <> 2 OR v_correct_count <> 1))
      OR (v_question_type = 'fill_in_blank' AND (v_option_count <> 1 OR v_correct_count <> 1)) THEN
      RAISE EXCEPTION 'AI returned invalid options for question type %', v_question_type
        USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.questions AS saved_question (
      course_id,
      chapter_id,
      lesson_id,
      question_type,
      difficulty,
      content,
      explanation,
      status,
      is_ai_generated,
      generated_for_user_id,
      ai_practice_set_id
    ) VALUES (
      v_set.course_id,
      v_set.chapter_id,
      v_set.lesson_id,
      v_question_type,
      v_difficulty,
      btrim(v_question->>'content'),
      btrim(v_question->>'explanation'),
      'approved',
      true,
      p_user_id,
      p_set_id
    )
    RETURNING saved_question.id INTO v_question_id;

    v_order_index := 0;
    FOR v_option IN SELECT value FROM jsonb_array_elements(v_options)
    LOOP
      IF NULLIF(btrim(v_option->>'option_text'), '') IS NULL
        OR jsonb_typeof(v_option->'is_correct') <> 'boolean' THEN
        RAISE EXCEPTION 'AI returned an invalid option' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.question_options (
        question_id,
        option_text,
        is_correct,
        order_index
      ) VALUES (
        v_question_id,
        btrim(v_option->>'option_text'),
        (v_option->>'is_correct')::boolean,
        v_order_index
      );
      v_order_index := v_order_index + 1;
    END LOOP;

    id := v_question_id;
    RETURN NEXT;
  END LOOP;

  UPDATE public.ai_practice_sets
  SET status = 'ready',
      generated_count = requested_count,
      error_code = NULL,
      completed_at = now()
  WHERE ai_practice_sets.id = p_set_id
    AND ai_practice_sets.user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_ai_practice_set_questions(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_ai_practice_set_questions(uuid, uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.save_ai_practice_set_questions(uuid, uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.save_ai_practice_set_questions(uuid, uuid, jsonb) TO service_role;
