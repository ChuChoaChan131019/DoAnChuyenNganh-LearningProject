-- C06: learner code progress and published exercise listing.
-- Prerequisites: C02 code exercise tables and the published course tree.
BEGIN;

CREATE TABLE IF NOT EXISTS public.code_exercise_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  last_seen_revision_id uuid NOT NULL,
  saved_code text NOT NULL DEFAULT ''::text,
  save_version integer NOT NULL DEFAULT 1,
  run_count integer NOT NULL DEFAULT 0,
  highest_hint_level smallint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress'::text,
  completed_revision_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT code_exercise_progress_pkey PRIMARY KEY (id),
  CONSTRAINT code_exercise_progress_learner_exercise_key UNIQUE (learner_id, exercise_id),
  CONSTRAINT code_exercise_progress_learner_fkey
    FOREIGN KEY (learner_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT code_exercise_progress_exercise_fkey
    FOREIGN KEY (exercise_id) REFERENCES public.code_exercises(id) ON DELETE RESTRICT,
  CONSTRAINT code_exercise_progress_seen_revision_fkey
    FOREIGN KEY (last_seen_revision_id, exercise_id)
    REFERENCES public.code_exercise_revisions(id, exercise_id) ON DELETE RESTRICT,
  CONSTRAINT code_exercise_progress_completed_revision_fkey
    FOREIGN KEY (completed_revision_id, exercise_id)
    REFERENCES public.code_exercise_revisions(id, exercise_id) ON DELETE RESTRICT,
  CONSTRAINT code_exercise_progress_save_version_check CHECK (save_version > 0),
  CONSTRAINT code_exercise_progress_run_count_check CHECK (run_count >= 0),
  CONSTRAINT code_exercise_progress_hint_level_check CHECK (highest_hint_level BETWEEN 0 AND 3),
  CONSTRAINT code_exercise_progress_status_check CHECK (status IN ('in_progress', 'completed')),
  CONSTRAINT code_exercise_progress_code_size_check CHECK (char_length(saved_code) <= 100000)
);

CREATE INDEX IF NOT EXISTS code_exercise_progress_exercise_idx
  ON public.code_exercise_progress USING btree (exercise_id);
CREATE INDEX IF NOT EXISTS code_exercise_progress_seen_revision_idx
  ON public.code_exercise_progress USING btree (last_seen_revision_id);
CREATE INDEX IF NOT EXISTS code_exercise_progress_completed_revision_idx
  ON public.code_exercise_progress USING btree (completed_revision_id)
  WHERE completed_revision_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS code_exercise_progress_learner_status_idx
  ON public.code_exercise_progress USING btree (learner_id, status, updated_at DESC);

ALTER TABLE public.code_exercise_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.code_exercise_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.code_exercise_progress TO service_role;

-- The learner list is evaluated in PostgreSQL so search, filters and the
-- learner-specific status are applied before pagination.
CREATE OR REPLACE FUNCTION public.list_learner_code_exercises(
  p_actor_id uuid,
  p_search text DEFAULT NULL::text,
  p_course_id uuid DEFAULT NULL::uuid,
  p_chapter_id uuid DEFAULT NULL::uuid,
  p_lesson_id uuid DEFAULT NULL::uuid,
  p_difficulty text DEFAULT NULL::text,
  p_progress_status text DEFAULT NULL::text,
  p_cursor_updated_at timestamp with time zone DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL::uuid,
  p_limit integer DEFAULT 21
)
RETURNS TABLE (
  id uuid,
  title text,
  difficulty text,
  course_id uuid,
  course_slug text,
  course_title text,
  chapter_id uuid,
  chapter_title text,
  lesson_id uuid,
  lesson_title text,
  published_revision_id uuid,
  progress_status text,
  requires_resubmission boolean,
  last_saved_at timestamp with time zone,
  published_updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_role text;
BEGIN
  SELECT profile.role INTO v_role
  FROM public.profiles AS profile
  WHERE profile.id = p_actor_id;

  IF v_role IS DISTINCT FROM 'learner' THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  IF p_difficulty IS NOT NULL
     AND p_difficulty NOT IN ('easy', 'medium', 'hard') THEN
    RAISE EXCEPTION 'Invalid difficulty' USING ERRCODE = '22023';
  END IF;

  IF p_progress_status IS NOT NULL
     AND p_progress_status NOT IN ('not_started', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Invalid progress status' USING ERRCODE = '22023';
  END IF;

  IF p_limit < 1 OR p_limit > 51 THEN
    RAISE EXCEPTION 'Invalid page size' USING ERRCODE = '22023';
  END IF;

  IF (p_cursor_updated_at IS NULL) <> (p_cursor_id IS NULL) THEN
    RAISE EXCEPTION 'Invalid cursor' USING ERRCODE = '22023';
  END IF;

  IF p_course_id IS NOT NULL AND p_chapter_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.chapters AS chapter
       WHERE chapter.id = p_chapter_id AND chapter.course_id = p_course_id
     ) THEN
    RAISE EXCEPTION 'Chapter does not belong to course' USING ERRCODE = '22023';
  END IF;

  IF p_chapter_id IS NOT NULL AND p_lesson_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.lessons AS lesson
       WHERE lesson.id = p_lesson_id AND lesson.chapter_id = p_chapter_id
     ) THEN
    RAISE EXCEPTION 'Lesson does not belong to chapter' USING ERRCODE = '22023';
  END IF;

  IF p_course_id IS NOT NULL AND p_lesson_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.lessons AS lesson
       JOIN public.chapters AS chapter ON chapter.id = lesson.chapter_id
       WHERE lesson.id = p_lesson_id AND chapter.course_id = p_course_id
     ) THEN
    RAISE EXCEPTION 'Lesson does not belong to course' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    exercise.id,
    revision.title,
    revision.difficulty,
    course.id,
    course.slug::text,
    course.title::text,
    chapter.id,
    chapter.title::text,
    lesson.id,
    lesson.title::text,
    exercise.published_revision_id,
    CASE
      WHEN progress.id IS NULL THEN 'not_started'::text
      WHEN progress.completed_revision_id = exercise.published_revision_id
        THEN 'completed'::text
      ELSE 'in_progress'::text
    END,
    progress.completed_revision_id IS NOT NULL
      AND progress.completed_revision_id <> exercise.published_revision_id,
    progress.updated_at,
    revision.updated_at
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
  LEFT JOIN public.code_exercise_progress AS progress
    ON progress.exercise_id = exercise.id
   AND progress.learner_id = p_actor_id
  WHERE exercise.archived_at IS NULL
    AND (p_search IS NULL OR revision.title ILIKE ('%' || p_search || '%'))
    AND (p_course_id IS NULL OR course.id = p_course_id)
    AND (p_chapter_id IS NULL OR chapter.id = p_chapter_id)
    AND (p_lesson_id IS NULL OR lesson.id = p_lesson_id)
    AND (p_difficulty IS NULL OR revision.difficulty = p_difficulty)
    AND (
      p_progress_status IS NULL
      OR p_progress_status = CASE
        WHEN progress.id IS NULL THEN 'not_started'::text
        WHEN progress.completed_revision_id = exercise.published_revision_id
          THEN 'completed'::text
        ELSE 'in_progress'::text
      END
    )
    AND (
      p_cursor_updated_at IS NULL
      OR (revision.updated_at, exercise.id) < (p_cursor_updated_at, p_cursor_id)
    )
  ORDER BY revision.updated_at DESC, exercise.id DESC
  LIMIT p_limit;
END;
$function$;

-- Save the latest code in a short transaction and reject stale browser tabs.
CREATE OR REPLACE FUNCTION public.save_learner_code_progress(
  p_actor_id uuid,
  p_exercise_id uuid,
  p_code text,
  p_expected_version integer DEFAULT 0
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
  v_saved public.code_exercise_progress%ROWTYPE;
BEGIN
  SELECT profile.role INTO v_role
  FROM public.profiles AS profile
  WHERE profile.id = p_actor_id;

  IF v_role IS DISTINCT FROM 'learner' THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  IF p_code IS NULL OR char_length(p_code) > 100000 THEN
    RAISE EXCEPTION 'Code exceeds the allowed size' USING ERRCODE = '22023';
  END IF;

  IF p_expected_version < 0 THEN
    RAISE EXCEPTION 'Invalid save version' USING ERRCODE = '22023';
  END IF;

  SELECT exercise.published_revision_id INTO v_revision_id
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

  IF v_revision_id IS NULL THEN
    RAISE EXCEPTION 'Published exercise not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_progress
  FROM public.code_exercise_progress
  WHERE learner_id = p_actor_id
    AND exercise_id = p_exercise_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_progress.save_version <> p_expected_version THEN
      RAISE EXCEPTION 'Saved code changed; reload before saving again'
        USING ERRCODE = 'PT409';
    END IF;

    UPDATE public.code_exercise_progress
    SET saved_code = p_code,
        last_seen_revision_id = v_revision_id,
        save_version = save_version + 1,
        updated_at = now()
    WHERE id = v_progress.id
    RETURNING * INTO v_saved;
  ELSE
    IF p_expected_version <> 0 THEN
      RAISE EXCEPTION 'Saved code changed; reload before saving again'
        USING ERRCODE = 'PT409';
    END IF;

    INSERT INTO public.code_exercise_progress (
      learner_id,
      exercise_id,
      last_seen_revision_id,
      saved_code
    )
    VALUES (
      p_actor_id,
      p_exercise_id,
      v_revision_id,
      p_code
    )
    ON CONFLICT (learner_id, exercise_id) DO NOTHING
    RETURNING * INTO v_saved;

    IF v_saved.id IS NULL THEN
      RAISE EXCEPTION 'Saved code changed; reload before saving again'
        USING ERRCODE = 'PT409';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'exercise_id', v_saved.exercise_id,
    'save_version', v_saved.save_version,
    'updated_at', v_saved.updated_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.list_learner_code_exercises(
  uuid, text, uuid, uuid, uuid, text, text, timestamp with time zone, uuid, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_learner_code_exercises(
  uuid, text, uuid, uuid, uuid, text, text, timestamp with time zone, uuid, integer
) TO service_role;

REVOKE ALL ON FUNCTION public.save_learner_code_progress(uuid, uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_learner_code_progress(uuid, uuid, text, integer)
  TO service_role;

COMMIT;
