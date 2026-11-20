BEGIN;

CREATE TABLE IF NOT EXISTS public.learner_lesson_progress (
  learner_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,

  lesson_id uuid NOT NULL
    REFERENCES public.lessons(id) ON DELETE CASCADE,

  last_opened_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,

  CONSTRAINT learner_lesson_progress_pkey
    PRIMARY KEY (learner_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS learner_lesson_progress_lesson_idx
  ON public.learner_lesson_progress (lesson_id);

ALTER TABLE public.learner_lesson_progress
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.learner_lesson_progress
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE
  ON public.learner_lesson_progress
  TO service_role;


-- RPC để ghi nhận xem hoặc hoàn thành lesson.
-- Chỉ Backend service_role gọi được.
CREATE OR REPLACE FUNCTION public.record_learner_lesson_activity(
  p_actor_id uuid,
  p_lesson_id uuid,
  p_complete boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_progress public.learner_lesson_progress%ROWTYPE;
BEGIN
  -- Chỉ học viên được ghi nhận tiến độ của mình.
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_actor_id AND role = 'learner'
  ) THEN
    RAISE EXCEPTION 'Permission denied'
      USING ERRCODE = '42501';
  END IF;

  -- Chỉ ghi nhận lesson thuộc cây nội dung
  -- đã xuất bản.
  IF NOT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.chapters ch ON ch.id = l.chapter_id
    JOIN public.courses c ON c.id = ch.course_id
    WHERE l.id = p_lesson_id
      AND l.status = 'published'
      AND ch.status = 'published'
      AND c.status = 'published'
  ) THEN
    RAISE EXCEPTION 'Lesson is not available'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.learner_lesson_progress (
    learner_id,
    lesson_id,
    last_opened_at,
    completed_at
  )
  VALUES (
    p_actor_id,
    p_lesson_id,
    now(),
    CASE WHEN p_complete THEN now() ELSE NULL END
  )
  ON CONFLICT (learner_id, lesson_id)
  DO UPDATE SET
    last_opened_at = EXCLUDED.last_opened_at,
    completed_at = COALESCE(
      public.learner_lesson_progress.completed_at,
      EXCLUDED.completed_at
    )
  RETURNING * INTO v_progress;

  RETURN jsonb_build_object(
    'lesson_id', v_progress.lesson_id,
    'completed', v_progress.completed_at IS NOT NULL,
    'completed_at', v_progress.completed_at,
    'last_opened_at', v_progress.last_opened_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_learner_lesson_activity(
  uuid, uuid, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_learner_lesson_activity(
  uuid, uuid, boolean
) TO service_role;

COMMIT;