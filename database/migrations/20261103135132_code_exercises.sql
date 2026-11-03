-- C02: authoring data, versioned drafts and public/hidden test cases.
-- Prerequisites: public.profiles(id, role), public.lessons(id), Supabase roles.
-- Snapshot of the deployed schema; safe to rerun without changing existing rows.
BEGIN;

CREATE TABLE IF NOT EXISTS public.code_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL,
  created_by uuid NOT NULL,
  published_revision_id uuid,
  archived_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT code_exercises_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT code_exercises_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE RESTRICT,
  CONSTRAINT code_exercises_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.code_exercise_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL,
  revision_no integer NOT NULL,
  edit_version integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  objective text NOT NULL DEFAULT ''::text,
  description text NOT NULL DEFAULT ''::text,
  difficulty text NOT NULL DEFAULT 'easy'::text,
  input_format text NOT NULL DEFAULT ''::text,
  output_format text NOT NULL DEFAULT ''::text,
  starter_code text NOT NULL DEFAULT ''::text,
  hint_1 text NOT NULL DEFAULT ''::text,
  hint_2 text NOT NULL DEFAULT ''::text,
  hint_3 text NOT NULL DEFAULT ''::text,
  solution_code text NOT NULL DEFAULT ''::text,
  solution_explanation text NOT NULL DEFAULT ''::text,
  status text NOT NULL DEFAULT 'draft'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT code_exercise_revisions_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text]))),
  CONSTRAINT code_exercise_revisions_edit_version_check CHECK ((edit_version > 0)),
  CONSTRAINT code_exercise_revisions_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.code_exercises(id) ON DELETE CASCADE,
  CONSTRAINT code_exercise_revisions_exercise_id_revision_no_key UNIQUE (exercise_id, revision_no),
  CONSTRAINT code_exercise_revisions_id_exercise_id_key UNIQUE (id, exercise_id),
  CONSTRAINT code_exercise_revisions_pkey PRIMARY KEY (id),
  CONSTRAINT code_exercise_revisions_revision_no_check CHECK ((revision_no > 0)),
  CONSTRAINT code_exercise_revisions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'superseded'::text])))
);

CREATE TABLE IF NOT EXISTS public.code_test_cases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL,
  input_text text NOT NULL DEFAULT ''::text,
  expected_output text NOT NULL DEFAULT ''::text,
  is_public boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT code_test_cases_order_index_check CHECK ((order_index > 0)),
  CONSTRAINT code_test_cases_pkey PRIMARY KEY (id),
  CONSTRAINT code_test_cases_revision_id_fkey FOREIGN KEY (revision_id) REFERENCES public.code_exercise_revisions(id) ON DELETE CASCADE,
  CONSTRAINT code_test_cases_revision_id_order_index_key UNIQUE (revision_id, order_index)
);

-- A published revision must belong to this same exercise.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.code_exercises'::regclass
      AND conname = 'code_published_revision_fk'
  ) THEN
    ALTER TABLE public.code_exercises
      ADD CONSTRAINT code_published_revision_fk
      FOREIGN KEY (published_revision_id, id)
      REFERENCES public.code_exercise_revisions(id, exercise_id);
  END IF;
END;
$migration$;

CREATE UNIQUE INDEX IF NOT EXISTS code_one_draft_idx ON public.code_exercise_revisions USING btree (exercise_id) WHERE (status = 'draft'::text);
CREATE UNIQUE INDEX IF NOT EXISTS code_one_published_idx ON public.code_exercise_revisions USING btree (exercise_id) WHERE (status = 'published'::text);
CREATE INDEX IF NOT EXISTS code_revisions_exercise_idx ON public.code_exercise_revisions USING btree (exercise_id, revision_no DESC);
CREATE INDEX IF NOT EXISTS code_exercises_lesson_idx ON public.code_exercises USING btree (lesson_id);
CREATE INDEX IF NOT EXISTS code_exercises_author_idx ON public.code_exercises USING btree (created_by);
CREATE INDEX IF NOT EXISTS code_test_cases_revision_idx ON public.code_test_cases USING btree (revision_id, order_index);

-- Backend-only access. No learner policy: hidden tests and solutions stay private.
ALTER TABLE public.code_exercises ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.code_exercises FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.code_exercises TO service_role;
ALTER TABLE public.code_exercise_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.code_exercise_revisions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.code_exercise_revisions TO service_role;
ALTER TABLE public.code_test_cases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.code_test_cases FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.code_test_cases TO service_role;
GRANT DELETE ON TABLE public.code_test_cases TO service_role;

-- Saves content and test cases in one transaction; locks prevent lost updates.
CREATE OR REPLACE FUNCTION public.save_code_exercise_draft(p_actor_id uuid, p_payload jsonb, p_exercise_id uuid DEFAULT NULL::uuid, p_expected_version integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
DECLARE
    v_role TEXT;
    v_exercise public.code_exercises%ROWTYPE;
    v_draft public.code_exercise_revisions%ROWTYPE;
    v_exercise_id UUID;
    v_revision_id UUID;
    v_revision_no INTEGER;
    v_edit_version INTEGER;
    v_lesson_id UUID;
    v_cases JSONB;
BEGIN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = p_actor_id;

    IF v_role IS NULL OR
       v_role NOT IN ('content_manager', 'admin') THEN
        RAISE EXCEPTION 'Permission denied'
            USING ERRCODE = '42501';
    END IF;

    v_lesson_id := (p_payload->>'lesson_id')::UUID;

    IF NOT EXISTS (
        SELECT 1 FROM public.lessons
        WHERE id = v_lesson_id
    ) THEN
        RAISE EXCEPTION 'Lesson not found'
            USING ERRCODE = 'P0002';
    END IF;

    v_cases := COALESCE(
        p_payload->'test_cases', '[]'::jsonb
    );

    IF jsonb_typeof(v_cases) <> 'array' THEN
        RAISE EXCEPTION 'test_cases must be an array'
            USING ERRCODE = '22023';
    END IF;

    -- Tạo một bài thực hành mới
    IF p_exercise_id IS NULL THEN
        IF p_expected_version <> 0 THEN
            RAISE EXCEPTION 'Invalid draft version'
                USING ERRCODE = 'PT409';
        END IF;

        INSERT INTO public.code_exercises (
            lesson_id, created_by
        )
        VALUES (v_lesson_id, p_actor_id)
        RETURNING id INTO v_exercise_id;

    ELSE
        -- Khóa bài để tránh hai lần lưu đồng thời
        SELECT * INTO v_exercise
        FROM public.code_exercises
        WHERE id = p_exercise_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Exercise not found'
                USING ERRCODE = 'P0002';
        END IF;

        IF v_exercise.created_by <> p_actor_id
           AND v_role <> 'admin' THEN
            RAISE EXCEPTION 'Permission denied'
                USING ERRCODE = '42501';
        END IF;

        IF v_exercise.archived_at IS NOT NULL THEN
            RAISE EXCEPTION 'Exercise is archived'
                USING ERRCODE = 'PT409';
        END IF;

        IF v_exercise.published_revision_id IS NOT NULL
           AND v_exercise.lesson_id <> v_lesson_id THEN
            RAISE EXCEPTION
                'Cannot move a published exercise to another lesson'
                USING ERRCODE = 'PT409';
        END IF;

        v_exercise_id := v_exercise.id;

        UPDATE public.code_exercises
        SET lesson_id = v_lesson_id,
            updated_at = now()
        WHERE id = v_exercise_id;
    END IF;

    -- Tìm nháp hiện tại
    SELECT * INTO v_draft
    FROM public.code_exercise_revisions
    WHERE exercise_id = v_exercise_id
      AND status = 'draft'
    FOR UPDATE;

    IF FOUND THEN
        IF v_draft.edit_version <> p_expected_version THEN
            RAISE EXCEPTION 'Draft changed; reload and retry'
                USING ERRCODE = 'PT409';
        END IF;

        v_revision_id := v_draft.id;
        v_revision_no := v_draft.revision_no;
        v_edit_version := v_draft.edit_version + 1;

        UPDATE public.code_exercise_revisions
        SET title = trim(p_payload->>'title'),
            objective = COALESCE(p_payload->>'objective', ''),
            description = COALESCE(p_payload->>'description', ''),
            difficulty = p_payload->>'difficulty',
            input_format = COALESCE(p_payload->>'input_format', ''),
            output_format = COALESCE(p_payload->>'output_format', ''),
            starter_code = COALESCE(p_payload->>'starter_code', ''),
            hint_1 = COALESCE(p_payload->>'hint_1', ''),
            hint_2 = COALESCE(p_payload->>'hint_2', ''),
            hint_3 = COALESCE(p_payload->>'hint_3', ''),
            solution_code = COALESCE(p_payload->>'solution_code', ''),
            solution_explanation =
                COALESCE(p_payload->>'solution_explanation', ''),
            edit_version = v_edit_version,
            updated_at = now()
        WHERE id = v_revision_id;

        DELETE FROM public.code_test_cases
        WHERE revision_id = v_revision_id;

    ELSE
        -- Khi đã xuất bản, sửa đề sẽ tạo revision mới
        IF p_expected_version <> 0 THEN
            RAISE EXCEPTION 'Invalid version for new draft'
                USING ERRCODE = 'PT409';
        END IF;

        SELECT COALESCE(MAX(revision_no), 0) + 1
        INTO v_revision_no
        FROM public.code_exercise_revisions
        WHERE exercise_id = v_exercise_id;

        INSERT INTO public.code_exercise_revisions (
            exercise_id, revision_no,
            title, objective, description, difficulty,
            input_format, output_format, starter_code,
            hint_1, hint_2, hint_3,
            solution_code, solution_explanation,
            status
        )
        VALUES (
            v_exercise_id,
            v_revision_no,
            trim(p_payload->>'title'),
            COALESCE(p_payload->>'objective', ''),
            COALESCE(p_payload->>'description', ''),
            p_payload->>'difficulty',
            COALESCE(p_payload->>'input_format', ''),
            COALESCE(p_payload->>'output_format', ''),
            COALESCE(p_payload->>'starter_code', ''),
            COALESCE(p_payload->>'hint_1', ''),
            COALESCE(p_payload->>'hint_2', ''),
            COALESCE(p_payload->>'hint_3', ''),
            COALESCE(p_payload->>'solution_code', ''),
            COALESCE(p_payload->>'solution_explanation', ''),
            'draft'
        )
        RETURNING id, edit_version
        INTO v_revision_id, v_edit_version;
    END IF;

    -- Lưu toàn bộ bộ kiểm tra của revision
    INSERT INTO public.code_test_cases (
        revision_id,
        input_text,
        expected_output,
        is_public,
        order_index
    )
    SELECT
        v_revision_id,
        COALESCE(t.item->>'input', ''),
        COALESCE(t.item->>'expected_output', ''),
        (t.item->>'is_public')::BOOLEAN,
        t.ord::INTEGER
    FROM jsonb_array_elements(v_cases)
        WITH ORDINALITY AS t(item, ord);

    RETURN jsonb_build_object(
        'id', v_exercise_id,
        'revision_id', v_revision_id,
        'revision_no', v_revision_no,
        'edit_version', v_edit_version,
        'status', 'draft'
    );
END;
$function$;

-- The actor ID is trusted only because this RPC can be called by the backend.
REVOKE ALL ON FUNCTION public.save_code_exercise_draft(uuid, jsonb, uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_code_exercise_draft(uuid, jsonb, uuid, integer)
  TO service_role;

COMMIT;
