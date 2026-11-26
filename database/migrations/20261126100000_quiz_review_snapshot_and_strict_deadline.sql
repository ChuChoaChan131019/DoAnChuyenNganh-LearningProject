-- Keep each submitted review independent of later edits to the question bank.
-- Enforce the deadline even if an older caller supplies a grace period.
BEGIN;

ALTER TABLE public.quiz_attempt_details
  ADD COLUMN IF NOT EXISTS question_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS selected_option_ids jsonb;

-- Freeze the best available version of older submissions at migration time.
-- Versions edited before this migration cannot be reconstructed exactly.
UPDATE public.quiz_attempt_details AS detail
SET question_snapshot = pg_catalog.jsonb_build_object(
      'id', question.id,
      'content', question.content,
      'question_type', question.question_type,
      'difficulty', question.difficulty,
      'explanation', question.explanation,
      'options', (
        SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'id', option.id,
          'option_text', option.option_text,
          'order_index', option.order_index,
          'is_correct', option.is_correct
        ) ORDER BY option.order_index), '[]'::jsonb)
        FROM public.question_options AS option
        WHERE option.question_id = question.id
      )
    ),
    selected_option_ids = (
      SELECT COALESCE(pg_catalog.jsonb_agg(answer.option_id), '[]'::jsonb)
      FROM public.quiz_attempt_answers AS answer
      WHERE answer.detail_id = detail.id
    )
FROM public.questions AS question
WHERE question.id = detail.question_id
  AND detail.question_snapshot IS NULL;

-- A selected option ID is part of the historical submission. It must survive
-- deletion/replacement of the current question options.
DO $$
DECLARE
  v_constraint record;
BEGIN
  FOR v_constraint IN
    SELECT constraint_name.conname
    FROM pg_catalog.pg_constraint AS constraint_name
    WHERE constraint_name.conrelid = 'public.quiz_attempt_answers'::regclass
      AND constraint_name.confrelid = 'public.question_options'::regclass
      AND constraint_name.contype = 'f'
  LOOP
    EXECUTE pg_catalog.format(
      'ALTER TABLE public.quiz_attempt_answers DROP CONSTRAINT %I',
      v_constraint.conname
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_attempt_id uuid,
  p_user_id uuid,
  p_details jsonb,
  p_max_score double precision,
  p_grace_seconds integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt public.quiz_attempts%ROWTYPE;
  v_item jsonb;
  v_detail_id uuid;
  v_total double precision := 0;
  v_percentage numeric(5, 2);
  v_status text := 'submitted';
BEGIN
  SELECT attempt.* INTO v_attempt
  FROM public.quiz_attempts AS attempt
  WHERE attempt.id = p_attempt_id AND attempt.user_id = p_user_id
  FOR UPDATE;
  IF v_attempt.id IS NULL THEN
    RAISE EXCEPTION 'Quiz attempt not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_attempt.completed_at IS NOT NULL THEN
    v_status := 'already_submitted';
  ELSIF v_attempt.expires_at IS NOT NULL
    AND pg_catalog.clock_timestamp() > v_attempt.expires_at THEN
    PERFORM public.quiz_attempt_close_expired(v_attempt.id);
    v_status := 'expired';
  ELSE
    FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(COALESCE(p_details, '[]'::jsonb))
    LOOP
      INSERT INTO public.quiz_attempt_details (
        attempt_id, question_id, answer_text, is_correct, ai_feedback,
        score_weight, earned_score, question_snapshot, selected_option_ids
      )
      VALUES (
        v_attempt.id,
        (v_item ->> 'question_id')::uuid,
        v_item ->> 'answer_text',
        COALESCE((v_item ->> 'is_correct')::boolean, false),
        NULL,
        COALESCE((v_item ->> 'score_weight')::double precision, 1),
        COALESCE((v_item ->> 'earned_score')::double precision, 0),
        v_item -> 'question_snapshot',
        COALESCE(v_item -> 'selected_option_ids', '[]'::jsonb)
      )
      RETURNING id INTO v_detail_id;

      INSERT INTO public.quiz_attempt_answers (detail_id, option_id)
      SELECT DISTINCT v_detail_id, option_id.value::uuid
      FROM pg_catalog.jsonb_array_elements_text(COALESCE(v_item -> 'selected_option_ids', '[]'::jsonb)) AS option_id(value);

      v_total := v_total + COALESCE((v_item ->> 'earned_score')::double precision, 0);
    END LOOP;

    v_percentage := CASE
      WHEN COALESCE(p_max_score, 0) > 0 THEN LEAST(100, ROUND((v_total / p_max_score * 100)::numeric, 2))
      ELSE 0
    END;

    UPDATE public.quiz_attempts AS attempt
    SET total_score = v_total,
        max_score = COALESCE(p_max_score, 0),
        score_percentage = v_percentage,
        is_passed = v_percentage >= COALESCE(attempt.pass_percentage, 50),
        completed_at = pg_catalog.clock_timestamp(),
        end_reason = 'submitted'
    WHERE attempt.id = v_attempt.id;
  END IF;

  SELECT attempt.* INTO v_attempt FROM public.quiz_attempts AS attempt WHERE attempt.id = p_attempt_id;
  RETURN pg_catalog.jsonb_build_object(
    'status', v_status,
    'attempt_id', v_attempt.id,
    'quiz_id', v_attempt.quiz_id,
    'started_at', v_attempt.started_at,
    'expires_at', v_attempt.expires_at,
    'completed_at', v_attempt.completed_at,
    'end_reason', v_attempt.end_reason,
    'score', v_attempt.total_score,
    'max_score', v_attempt.max_score,
    'percentage', v_attempt.score_percentage,
    'pass_percentage', v_attempt.pass_percentage,
    'passed', v_attempt.is_passed
  );
END;
$$;

COMMIT;
