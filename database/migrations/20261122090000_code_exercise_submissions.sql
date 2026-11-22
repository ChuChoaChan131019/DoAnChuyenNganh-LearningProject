-- C07: learner code run counter, ordered hints, submissions and completion.
-- Prerequisites: C02 code exercise tables and C06 code_exercise_progress.
BEGIN;

CREATE TABLE IF NOT EXISTS public.code_exercise_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  revision_id uuid NOT NULL,
  submitted_code text NOT NULL,
  total_cases integer NOT NULL,
  passed_cases integer NOT NULL,
  all_passed boolean NOT NULL,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT code_exercise_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT code_exercise_submissions_learner_fkey
    FOREIGN KEY (learner_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT code_exercise_submissions_exercise_fkey
    FOREIGN KEY (exercise_id) REFERENCES public.code_exercises(id) ON DELETE RESTRICT,
  CONSTRAINT code_exercise_submissions_revision_fkey
    FOREIGN KEY (revision_id, exercise_id)
    REFERENCES public.code_exercise_revisions(id, exercise_id) ON DELETE RESTRICT,
  CONSTRAINT code_exercise_submissions_counts_check
    CHECK (total_cases > 0 AND passed_cases BETWEEN 0 AND total_cases),
  CONSTRAINT code_exercise_submissions_all_passed_check
    CHECK (all_passed = (passed_cases = total_cases)),
  CONSTRAINT code_exercise_submissions_code_size_check
    CHECK (char_length(submitted_code) <= 100000)
);

CREATE INDEX IF NOT EXISTS code_exercise_submissions_learner_exercise_idx
  ON public.code_exercise_submissions USING btree (learner_id, exercise_id, created_at DESC);
CREATE INDEX IF NOT EXISTS code_exercise_submissions_revision_idx
  ON public.code_exercise_submissions USING btree (revision_id, exercise_id);

ALTER TABLE public.code_exercise_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.code_exercise_submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.code_exercise_submissions TO service_role;

-- Resolve the published revision of an exercise the learner may open.
CREATE OR REPLACE FUNCTION public.code_exercise_published_revision(
  p_exercise_id uuid
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT exercise.published_revision_id
  FROM public.code_exercises AS exercise
  JOIN public.code_exercise_revisions AS revision
    ON revision.id = exercise.published_revision_id
   AND revision.exercise_id = exercise.id
   AND revision.status = 'published'
  JOIN public.lessons AS lesson
    ON lesson.id = exercise.lesson_id
   AND lesson.status = 'published'
  JOIN public.chapters AS chapter
    ON chapter.id = lesson.chapter_id
   AND chapter.status = 'published'
  JOIN public.courses AS course
    ON course.id = chapter.course_id
   AND course.status = 'published'
  WHERE exercise.id = p_exercise_id
    AND exercise.archived_at IS NULL;
$function$;

-- Count one execution (custom input or public check) for this learner and exercise.
CREATE OR REPLACE FUNCTION public.record_code_exercise_run(
  p_actor_id uuid,
  p_exercise_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_role text;
  v_revision_id uuid;
  v_run_count integer;
BEGIN
  SELECT profile.role INTO v_role
  FROM public.profiles AS profile
  WHERE profile.id = p_actor_id;

  IF v_role IS DISTINCT FROM 'learner' THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  v_revision_id := public.code_exercise_published_revision(p_exercise_id);
  IF v_revision_id IS NULL THEN
    RAISE EXCEPTION 'Published exercise not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.code_exercise_progress AS progress (
    learner_id, exercise_id, last_seen_revision_id, run_count
  )
  VALUES (p_actor_id, p_exercise_id, v_revision_id, 1)
  ON CONFLICT (learner_id, exercise_id) DO UPDATE
    SET run_count = progress.run_count + 1,
        last_seen_revision_id = v_revision_id,
        updated_at = now()
  RETURNING progress.run_count INTO v_run_count;

  RETURN jsonb_build_object('exercise_id', p_exercise_id, 'run_count', v_run_count);
END;
$function$;

-- Open hint levels strictly in order. Re-opening an opened level is allowed.
CREATE OR REPLACE FUNCTION public.open_code_exercise_hint(
  p_actor_id uuid,
  p_exercise_id uuid,
  p_level integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_role text;
  v_revision_id uuid;
  v_progress public.code_exercise_progress%ROWTYPE;
  v_hints text[];
  v_highest smallint;
  v_hint text;
BEGIN
  SELECT profile.role INTO v_role
  FROM public.profiles AS profile
  WHERE profile.id = p_actor_id;

  IF v_role IS DISTINCT FROM 'learner' THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  IF p_level IS NULL OR p_level NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'Invalid hint level' USING ERRCODE = '22023';
  END IF;

  v_revision_id := public.code_exercise_published_revision(p_exercise_id);
  IF v_revision_id IS NULL THEN
    RAISE EXCEPTION 'Published exercise not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT ARRAY[revision.hint_1, revision.hint_2, revision.hint_3]
  INTO v_hints
  FROM public.code_exercise_revisions AS revision
  WHERE revision.id = v_revision_id;

  -- Make sure the progress row exists, then lock it.
  INSERT INTO public.code_exercise_progress (
    learner_id, exercise_id, last_seen_revision_id
  )
  VALUES (p_actor_id, p_exercise_id, v_revision_id)
  ON CONFLICT (learner_id, exercise_id) DO NOTHING;

  SELECT * INTO v_progress
  FROM public.code_exercise_progress
  WHERE learner_id = p_actor_id
    AND exercise_id = p_exercise_id
  FOR UPDATE;

  v_highest := v_progress.highest_hint_level;

  IF p_level > v_highest + 1 THEN
    RAISE EXCEPTION 'Hints must be opened in order' USING ERRCODE = 'PT409';
  END IF;

  IF p_level > v_highest THEN
    UPDATE public.code_exercise_progress
    SET highest_hint_level = p_level,
        last_seen_revision_id = v_revision_id,
        updated_at = now()
    WHERE id = v_progress.id;
    v_highest := p_level;
  END IF;

  v_hint := v_hints[p_level];

  RETURN jsonb_build_object(
    'exercise_id', p_exercise_id,
    'level', p_level,
    'hint', v_hint,
    'highest_hint_level', v_highest
  );
END;
$function$;

-- Record a graded submission and mark the exercise completed when it passed.
-- The revision graded by the backend must still be the published revision.
CREATE OR REPLACE FUNCTION public.submit_code_exercise(
  p_actor_id uuid,
  p_exercise_id uuid,
  p_revision_id uuid,
  p_code text,
  p_total_cases integer,
  p_passed_cases integer,
  p_results jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_role text;
  v_revision_id uuid;
  v_all_passed boolean;
  v_submission public.code_exercise_submissions%ROWTYPE;
  v_progress public.code_exercise_progress%ROWTYPE;
BEGIN
  SELECT profile.role INTO v_role
  FROM public.profiles AS profile
  WHERE profile.id = p_actor_id;

  IF v_role IS DISTINCT FROM 'learner' THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  IF p_code IS NULL OR char_length(p_code) > 100000
     OR p_total_cases IS NULL OR p_total_cases < 1
     OR p_passed_cases IS NULL
     OR p_passed_cases < 0 OR p_passed_cases > p_total_cases THEN
    RAISE EXCEPTION 'Invalid submission' USING ERRCODE = '22023';
  END IF;

  v_revision_id := public.code_exercise_published_revision(p_exercise_id);
  IF v_revision_id IS NULL THEN
    RAISE EXCEPTION 'Published exercise not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_revision_id <> p_revision_id THEN
    RAISE EXCEPTION 'Exercise has a newer revision' USING ERRCODE = 'PT409';
  END IF;

  v_all_passed := p_passed_cases = p_total_cases;

  INSERT INTO public.code_exercise_submissions (
    learner_id, exercise_id, revision_id, submitted_code,
    total_cases, passed_cases, all_passed, results
  )
  VALUES (
    p_actor_id, p_exercise_id, p_revision_id, p_code,
    p_total_cases, p_passed_cases, v_all_passed,
    COALESCE(p_results, '[]'::jsonb)
  )
  RETURNING * INTO v_submission;

  INSERT INTO public.code_exercise_progress AS progress (
    learner_id, exercise_id, last_seen_revision_id, saved_code,
    status, completed_revision_id
  )
  VALUES (
    p_actor_id, p_exercise_id, p_revision_id, p_code,
    CASE WHEN v_all_passed THEN 'completed' ELSE 'in_progress' END,
    CASE WHEN v_all_passed THEN p_revision_id ELSE NULL END
  )
  ON CONFLICT (learner_id, exercise_id) DO UPDATE
    SET last_seen_revision_id = p_revision_id,
        status = CASE
          WHEN v_all_passed OR progress.completed_revision_id IS NOT NULL
            THEN 'completed' ELSE 'in_progress' END,
        completed_revision_id = CASE
          WHEN v_all_passed THEN p_revision_id
          ELSE progress.completed_revision_id END,
        updated_at = now()
  RETURNING progress.* INTO v_progress;

  RETURN jsonb_build_object(
    'submission_id', v_submission.id,
    'exercise_id', p_exercise_id,
    'revision_id', p_revision_id,
    'total_cases', v_submission.total_cases,
    'passed_cases', v_submission.passed_cases,
    'all_passed', v_submission.all_passed,
    'submitted_at', v_submission.created_at,
    'status', CASE
      WHEN v_progress.completed_revision_id = p_revision_id THEN 'completed'
      ELSE 'in_progress' END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.code_exercise_published_revision(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.code_exercise_published_revision(uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.record_code_exercise_run(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_code_exercise_run(uuid, uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.open_code_exercise_hint(uuid, uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_code_exercise_hint(uuid, uuid, integer)
  TO service_role;

REVOKE ALL ON FUNCTION public.submit_code_exercise(
  uuid, uuid, uuid, text, integer, integer, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_code_exercise(
  uuid, uuid, uuid, text, integer, integer, jsonb
) TO service_role;

COMMIT;
