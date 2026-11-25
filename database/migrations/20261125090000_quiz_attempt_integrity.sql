-- Quiz attempt integrity and question soft delete.
-- - Server-side deadline (expires_at) for timed quizzes.
-- - Idempotent, atomic submission with a stored score percentage.
-- - At most one open attempt per learner and quiz.
-- - Soft delete / restore for shared bank questions, recorded in question_history.
-- Re-runnable: every change uses IF NOT EXISTS / CREATE OR REPLACE.
BEGIN;

-- 1. Attempt columns -------------------------------------------------------
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_score double precision,
  ADD COLUMN IF NOT EXISTS score_percentage numeric(5, 2),
  ADD COLUMN IF NOT EXISTS end_reason varchar(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'quiz_attempts_end_reason_check'
      AND conrelid = 'public.quiz_attempts'::regclass
  ) THEN
    ALTER TABLE public.quiz_attempts
      ADD CONSTRAINT quiz_attempts_end_reason_check
      CHECK (end_reason IS NULL OR end_reason IN ('submitted', 'expired'));
  END IF;
END;
$$;

ALTER TABLE public.quiz_attempt_details
  ADD COLUMN IF NOT EXISTS score_weight double precision,
  ADD COLUMN IF NOT EXISTS earned_score double precision;

-- 2. Backfill existing rows ------------------------------------------------
-- Completed attempts: snapshot the maximum score from the current quiz
-- configuration (approximate for old data) and the official percentage.
UPDATE public.quiz_attempts AS attempt
SET max_score = totals.max_score,
    score_percentage = CASE
      WHEN totals.max_score > 0
        THEN LEAST(100, ROUND((COALESCE(attempt.total_score, 0) / totals.max_score * 100)::numeric, 2))
      ELSE 0
    END,
    end_reason = COALESCE(attempt.end_reason, 'submitted')
FROM (
  SELECT quiz_id, COALESCE(SUM(score_weight), 0)::double precision AS max_score
  FROM public.quiz_questions
  GROUP BY quiz_id
) AS totals
WHERE totals.quiz_id = attempt.quiz_id
  AND attempt.completed_at IS NOT NULL
  AND attempt.max_score IS NULL;

UPDATE public.quiz_attempts
SET end_reason = 'submitted',
    max_score = COALESCE(max_score, 0),
    score_percentage = COALESCE(score_percentage, 0)
WHERE completed_at IS NOT NULL AND end_reason IS NULL;

-- Several open attempts for the same learner and quiz: keep the newest, close the rest.
UPDATE public.quiz_attempts AS attempt
SET completed_at = attempt.started_at,
    total_score = 0,
    max_score = 0,
    score_percentage = 0,
    is_passed = false,
    end_reason = 'expired'
WHERE attempt.completed_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.quiz_attempts AS newer
    WHERE newer.quiz_id = attempt.quiz_id
      AND newer.user_id = attempt.user_id
      AND newer.completed_at IS NULL
      AND (newer.started_at > attempt.started_at
        OR (newer.started_at = attempt.started_at AND newer.id > attempt.id))
  );

-- Open attempts of timed quizzes get the deadline they should have had.
UPDATE public.quiz_attempts AS attempt
SET expires_at = attempt.started_at + pg_catalog.make_interval(mins => quiz.duration_minutes)
FROM public.quizzes AS quiz
WHERE quiz.id = attempt.quiz_id
  AND attempt.completed_at IS NULL
  AND attempt.expires_at IS NULL
  AND quiz.duration_minutes IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS quiz_attempts_one_open_per_learner_idx
  ON public.quiz_attempts (quiz_id, user_id)
  WHERE completed_at IS NULL;

-- 3. Attempt functions -----------------------------------------------------
-- Close one open attempt as expired with zero score. Caller must hold the row lock.
CREATE OR REPLACE FUNCTION public.quiz_attempt_close_expired(p_attempt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.quiz_attempts AS attempt
  SET completed_at = COALESCE(attempt.expires_at, pg_catalog.now()),
      total_score = 0,
      max_score = (
        SELECT COALESCE(SUM(link.score_weight), 0)::double precision
        FROM public.quiz_questions AS link
        WHERE link.quiz_id = attempt.quiz_id
      ),
      score_percentage = 0,
      is_passed = false,
      end_reason = 'expired'
  WHERE attempt.id = p_attempt_id
    AND attempt.completed_at IS NULL;
END;
$$;

-- Close every overdue open attempt of a learner for a quiz.
CREATE OR REPLACE FUNCTION public.expire_overdue_quiz_attempts(
  p_quiz_id uuid,
  p_user_id uuid,
  p_grace_seconds integer DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_attempt_id IN
    SELECT attempt.id
    FROM public.quiz_attempts AS attempt
    WHERE attempt.quiz_id = p_quiz_id
      AND attempt.user_id = p_user_id
      AND attempt.completed_at IS NULL
      AND attempt.expires_at IS NOT NULL
      AND pg_catalog.now() > attempt.expires_at + pg_catalog.make_interval(secs => GREATEST(p_grace_seconds, 0))
    FOR UPDATE
  LOOP
    PERFORM public.quiz_attempt_close_expired(v_attempt_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Return the learner's open attempt, or create one with the deadline of the quiz.
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
  v_now timestamptz := pg_catalog.now();
BEGIN
  SELECT quiz.* INTO v_quiz FROM public.quizzes AS quiz WHERE quiz.id = p_quiz_id;
  IF v_quiz.id IS NULL THEN
    RAISE EXCEPTION 'Quiz not found' USING ERRCODE = 'P0002';
  END IF;

  -- Serialize start requests of one learner for one quiz.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_quiz_id::text || ':' || p_user_id::text));
  PERFORM public.expire_overdue_quiz_attempts(p_quiz_id, p_user_id, p_grace_seconds);

  SELECT attempt.* INTO v_attempt
  FROM public.quiz_attempts AS attempt
  WHERE attempt.quiz_id = p_quiz_id
    AND attempt.user_id = p_user_id
    AND attempt.completed_at IS NULL
  ORDER BY attempt.started_at DESC
  LIMIT 1;

  IF v_attempt.id IS NULL THEN
    INSERT INTO public.quiz_attempts (quiz_id, user_id, started_at, expires_at, total_score, pass_percentage, is_passed)
    VALUES (
      p_quiz_id,
      p_user_id,
      v_now,
      CASE WHEN v_quiz.duration_minutes IS NULL THEN NULL
           ELSE v_now + pg_catalog.make_interval(mins => v_quiz.duration_minutes) END,
      0,
      COALESCE(v_quiz.pass_percentage, 50),
      false
    )
    RETURNING * INTO v_attempt;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'id', v_attempt.id,
    'quiz_id', v_attempt.quiz_id,
    'started_at', v_attempt.started_at,
    'expires_at', v_attempt.expires_at,
    'server_now', pg_catalog.clock_timestamp()
  );
END;
$$;

-- Save a graded submission once. p_details is a JSON array of
-- { question_id, answer_text, is_correct, score_weight, earned_score, selected_option_ids[] }
-- graded by the backend. Returns { status: 'submitted' | 'already_submitted' | 'expired', ... }.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_attempt_id uuid,
  p_user_id uuid,
  p_details jsonb,
  p_max_score double precision,
  p_grace_seconds integer DEFAULT 30
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
    AND pg_catalog.now() > v_attempt.expires_at + pg_catalog.make_interval(secs => GREATEST(p_grace_seconds, 0)) THEN
    PERFORM public.quiz_attempt_close_expired(v_attempt.id);
    v_status := 'expired';
  ELSE
    FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(COALESCE(p_details, '[]'::jsonb))
    LOOP
      INSERT INTO public.quiz_attempt_details (attempt_id, question_id, answer_text, is_correct, ai_feedback, score_weight, earned_score)
      VALUES (
        v_attempt.id,
        (v_item ->> 'question_id')::uuid,
        v_item ->> 'answer_text',
        COALESCE((v_item ->> 'is_correct')::boolean, false),
        NULL,
        COALESCE((v_item ->> 'score_weight')::double precision, 1),
        COALESCE((v_item ->> 'earned_score')::double precision, 0)
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
        completed_at = pg_catalog.now(),
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

-- 4. Question soft delete --------------------------------------------------
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS idx_questions_not_deleted
  ON public.questions (status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.question_history DROP CONSTRAINT IF EXISTS question_history_action_check;
ALTER TABLE public.question_history
  ADD CONSTRAINT question_history_action_check
  CHECK (action IN ('created', 'updated', 'submitted', 'approved', 'rejected', 'deleted', 'restored'));

CREATE OR REPLACE FUNCTION public.set_shared_question_deleted(
  p_actor_id uuid,
  p_question_id uuid,
  p_deleted boolean
)
RETURNS TABLE (id uuid, version integer, status text, deleted_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_question public.questions%ROWTYPE;
  v_next_version integer;
  v_snapshot jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles AS profile WHERE profile.id = p_actor_id AND profile.role IN ('content_manager', 'admin')) THEN
    RAISE EXCEPTION 'Question management requires content_manager or admin' USING ERRCODE = '42501';
  END IF;
  SELECT questions.* INTO v_question FROM public.questions AS questions
  WHERE questions.id = p_question_id AND questions.generated_for_user_id IS NULL
  FOR UPDATE;
  IF v_question.id IS NULL THEN RAISE EXCEPTION 'Question not found' USING ERRCODE = 'P0002'; END IF;
  IF p_deleted AND v_question.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Question is already deleted' USING ERRCODE = '22023';
  END IF;
  IF NOT p_deleted AND v_question.deleted_at IS NULL THEN
    RAISE EXCEPTION 'Question is not deleted' USING ERRCODE = '22023';
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
  UPDATE public.questions AS questions
  SET deleted_at = CASE WHEN p_deleted THEN pg_catalog.now() ELSE NULL END,
      deleted_by = CASE WHEN p_deleted THEN p_actor_id ELSE NULL END,
      updated_by = p_actor_id,
      updated_at = pg_catalog.now(),
      version = v_next_version
  WHERE questions.id = p_question_id;

  INSERT INTO public.question_history (question_id, version, action, from_status, to_status, actor_id, snapshot)
  VALUES (p_question_id, v_next_version, CASE WHEN p_deleted THEN 'deleted' ELSE 'restored' END,
          v_question.status, v_question.status, p_actor_id, v_snapshot);

  RETURN QUERY
  SELECT questions.id, questions.version, questions.status::text, questions.deleted_at
  FROM public.questions AS questions WHERE questions.id = p_question_id;
END;
$$;

-- 5. Privileges ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.quiz_attempt_close_expired(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_overdue_quiz_attempts(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_quiz_attempt(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, uuid, jsonb, double precision, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_shared_question_deleted(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_attempt_close_expired(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_overdue_quiz_attempts(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.start_quiz_attempt(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, uuid, jsonb, double precision, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_shared_question_deleted(uuid, uuid, boolean) TO service_role;

COMMIT;
