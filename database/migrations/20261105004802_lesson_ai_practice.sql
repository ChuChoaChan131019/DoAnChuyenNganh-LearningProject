-- Learner-owned AI practice questions generated from published lessons.

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS generated_for_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'questions_generated_for_user_id_fkey'
      AND conrelid = 'public.questions'::regclass
  ) THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT questions_generated_for_user_id_fkey
      FOREIGN KEY (generated_for_user_id)
      REFERENCES public.profiles(id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS questions_generated_for_user_idx
  ON public.questions (generated_for_user_id, created_at DESC)
  WHERE generated_for_user_id IS NOT NULL;

COMMENT ON COLUMN public.questions.generated_for_user_id IS
  'Learner who owns an AI-generated practice question; NULL means shared question bank content.';

CREATE OR REPLACE FUNCTION public.save_ai_practice_questions(
  p_user_id uuid,
  p_lesson_id uuid,
  p_questions jsonb
)
RETURNS TABLE (id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_course_id uuid;
  v_chapter_id uuid;
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
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = p_user_id
      AND p.role = 'learner'
  ) THEN
    RAISE EXCEPTION 'Learner profile is not available' USING ERRCODE = '42501';
  END IF;

  SELECT c.id, ch.id
  INTO v_course_id, v_chapter_id
  FROM public.lessons AS l
  JOIN public.chapters AS ch ON ch.id = l.chapter_id
  JOIN public.courses AS c ON c.id = ch.course_id
  WHERE l.id = p_lesson_id
    AND l.status = 'published'
    AND ch.status = 'published'
    AND c.status = 'published';

  IF v_course_id IS NULL OR v_chapter_id IS NULL THEN
    RAISE EXCEPTION 'Lesson is not available for this learner' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_questions) <> 'array'
    OR jsonb_array_length(p_questions) < 3
    OR jsonb_array_length(p_questions) > 10 THEN
    RAISE EXCEPTION 'AI practice must contain between 3 and 10 questions'
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
      generated_for_user_id
    ) VALUES (
      v_course_id,
      v_chapter_id,
      p_lesson_id,
      v_question_type,
      v_difficulty,
      btrim(v_question->>'content'),
      btrim(v_question->>'explanation'),
      'approved',
      true,
      p_user_id
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
END;
$$;

REVOKE ALL ON FUNCTION public.save_ai_practice_questions(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_ai_practice_questions(uuid, uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.save_ai_practice_questions(uuid, uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.save_ai_practice_questions(uuid, uuid, jsonb) TO service_role;
