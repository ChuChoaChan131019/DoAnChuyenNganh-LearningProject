-- Freeze the questions and answer key when an attempt starts. Existing open
-- attempts get the best available snapshot at migration time.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.quiz_attempt_snapshots (
  attempt_id uuid PRIMARY KEY REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  questions jsonb NOT NULL
);
ALTER TABLE private.quiz_attempt_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.quiz_attempt_snapshots FROM PUBLIC, anon, authenticated;

INSERT INTO private.quiz_attempt_snapshots (attempt_id, questions)
SELECT attempt.id, COALESCE((
  SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'question_id', link.question_id,
    'score_weight', link.score_weight,
    'question', pg_catalog.jsonb_build_object(
      'id', question.id,
      'content', question.content,
      'question_type', question.question_type,
      'difficulty', question.difficulty,
      'explanation', question.explanation,
      'options', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'id', option.id,
          'option_text', option.option_text,
          'order_index', option.order_index,
          'is_correct', option.is_correct
        ) ORDER BY option.order_index, option.id)
        FROM public.question_options AS option
        WHERE option.question_id = question.id
      ), '[]'::jsonb)
    )
  ) ORDER BY link.order_index NULLS LAST, link.question_id)
  FROM public.quiz_questions AS link
  JOIN public.questions AS question ON question.id = link.question_id
  WHERE link.quiz_id = attempt.quiz_id
), '[]'::jsonb)
FROM public.quiz_attempts AS attempt
WHERE attempt.completed_at IS NULL
ON CONFLICT (attempt_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.quiz_attempt_close_expired(p_attempt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.quiz_attempts AS attempt
  SET completed_at = COALESCE(attempt.expires_at, pg_catalog.clock_timestamp()),
      total_score = 0,
      max_score = COALESCE((
        SELECT SUM((item.value ->> 'score_weight')::double precision)
        FROM private.quiz_attempt_snapshots AS snapshot,
             pg_catalog.jsonb_array_elements(snapshot.questions) AS item(value)
        WHERE snapshot.attempt_id = attempt.id
      ), 0),
      score_percentage = 0,
      is_passed = false,
      end_reason = 'expired'
  WHERE attempt.id = p_attempt_id AND attempt.completed_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_quiz_attempt(
  p_quiz_id uuid,
  p_user_id uuid,
  p_grace_seconds integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_quiz public.quizzes%ROWTYPE;
  v_attempt public.quiz_attempts%ROWTYPE;
  v_questions jsonb;
  v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
  -- Serialize requests for the same learner and block a simultaneous quiz
  -- replacement while capturing the start snapshot.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_quiz_id::text || ':' || p_user_id::text));
  SELECT quiz.* INTO v_quiz FROM public.quizzes AS quiz WHERE quiz.id = p_quiz_id FOR SHARE;
  IF v_quiz.id IS NULL THEN
    RAISE EXCEPTION 'Quiz not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.courses AS course
    WHERE course.id = v_quiz.course_id AND course.status = 'published'
    FOR SHARE
  ) OR (v_quiz.chapter_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.chapters AS chapter
    WHERE chapter.id = v_quiz.chapter_id AND chapter.course_id = v_quiz.course_id
      AND chapter.status = 'published'
    FOR SHARE
  )) THEN
    RAISE EXCEPTION 'Quiz course or chapter is not published' USING ERRCODE = '42501';
  END IF;

  PERFORM public.expire_overdue_quiz_attempts(p_quiz_id, p_user_id, 0);
  SELECT attempt.* INTO v_attempt
  FROM public.quiz_attempts AS attempt
  WHERE attempt.quiz_id = p_quiz_id AND attempt.user_id = p_user_id
    AND attempt.completed_at IS NULL
  ORDER BY attempt.started_at DESC
  LIMIT 1;

  IF v_attempt.id IS NULL THEN
    IF v_quiz.is_active IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Only published quizzes can be attempted' USING ERRCODE = '42501';
    END IF;

    SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'question_id', link.question_id,
      'score_weight', link.score_weight,
      'question', pg_catalog.jsonb_build_object(
        'id', question.id,
        'content', question.content,
        'question_type', question.question_type,
        'difficulty', question.difficulty,
        'explanation', question.explanation,
        'options', COALESCE((
          SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
            'id', option.id,
            'option_text', option.option_text,
            'order_index', option.order_index,
            'is_correct', option.is_correct
          ) ORDER BY CASE WHEN COALESCE(v_quiz.shuffle_options, false) THEN pg_catalog.random() END,
                     option.order_index, option.id)
          FROM public.question_options AS option
          WHERE option.question_id = question.id
        ), '[]'::jsonb)
      )
    ) ORDER BY CASE WHEN COALESCE(v_quiz.shuffle_questions, false) THEN pg_catalog.random() END,
               link.order_index NULLS LAST, link.question_id)
    INTO v_questions
    FROM public.quiz_questions AS link
    JOIN public.questions AS question ON question.id = link.question_id
    WHERE link.quiz_id = p_quiz_id AND question.status = 'approved';

    IF v_questions IS NULL OR pg_catalog.jsonb_array_length(v_questions) = 0 THEN
      RAISE EXCEPTION 'Quiz has no approved questions' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.quiz_attempts (
      quiz_id, user_id, started_at, expires_at, total_score,
      pass_percentage, is_passed
    ) VALUES (
      p_quiz_id, p_user_id, v_now,
      CASE WHEN v_quiz.duration_minutes IS NULL THEN NULL
           ELSE v_now + pg_catalog.make_interval(mins => v_quiz.duration_minutes) END,
      0, COALESCE(v_quiz.pass_percentage, 50), false
    ) RETURNING * INTO v_attempt;
    INSERT INTO private.quiz_attempt_snapshots (attempt_id, questions)
    VALUES (v_attempt.id, v_questions);
  ELSE
    SELECT snapshot.questions INTO v_questions
    FROM private.quiz_attempt_snapshots AS snapshot
    WHERE snapshot.attempt_id = v_attempt.id;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'id', v_attempt.id,
    'quiz_id', v_attempt.quiz_id,
    'started_at', v_attempt.started_at,
    'expires_at', v_attempt.expires_at,
    'server_now', pg_catalog.clock_timestamp(),
    'questions', COALESCE(v_questions, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_quiz_attempt_snapshot(
  p_attempt_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_questions jsonb;
BEGIN
  SELECT snapshot.questions INTO v_questions
  FROM private.quiz_attempt_snapshots AS snapshot
  JOIN public.quiz_attempts AS attempt ON attempt.id = snapshot.attempt_id
  WHERE attempt.id = p_attempt_id AND attempt.user_id = p_user_id;
  IF v_questions IS NULL THEN
    RAISE EXCEPTION 'Quiz attempt snapshot not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_questions;
END;
$$;

REVOKE ALL ON FUNCTION public.start_quiz_attempt(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_quiz_attempt(uuid, uuid, integer) TO service_role;
REVOKE ALL ON FUNCTION public.quiz_attempt_close_expired(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_attempt_close_expired(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.get_quiz_attempt_snapshot(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_attempt_snapshot(uuid, uuid) TO service_role;

COMMIT;
