BEGIN;

CREATE OR REPLACE FUNCTION public.publish_code_exercise_draft(
  p_actor_id uuid,
  p_exercise_id uuid,
  p_revision_id uuid,
  p_expected_edit_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_role text;
  v_exercise public.code_exercises%ROWTYPE;
  v_revision public.code_exercise_revisions%ROWTYPE;
  v_lesson_status text;
  v_chapter_status text;
  v_course_status text;
  v_public_count integer;
  v_hidden_count integer;
BEGIN
  -- Kiểm tra vai trò.
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = p_actor_id;

  IF v_role IS NULL
     OR v_role NOT IN ('content_manager', 'admin') THEN
    RAISE EXCEPTION 'Permission denied'
      USING ERRCODE = '42501';
  END IF;

  -- Khóa bản ghi bài thực hành để tránh
  -- xuất bản đồng thời với lưu nháp.
  SELECT *
  INTO v_exercise
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

  -- Khóa đúng revision cần xuất bản.
  SELECT *
  INTO v_revision
  FROM public.code_exercise_revisions
  WHERE id = p_revision_id
    AND exercise_id = p_exercise_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Revision not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_revision.status <> 'draft'
     OR v_revision.edit_version <> p_expected_edit_version THEN
    RAISE EXCEPTION 'Draft changed'
      USING ERRCODE = 'PT409';
  END IF;

  -- Phạm vi bài học phải được công bố.
  SELECT
    l.status,
    ch.status,
    c.status
  INTO
    v_lesson_status,
    v_chapter_status,
    v_course_status
  FROM public.lessons l
  JOIN public.chapters ch ON ch.id = l.chapter_id
  JOIN public.courses c ON c.id = ch.course_id
  WHERE l.id = v_exercise.lesson_id;

  IF v_lesson_status IS DISTINCT FROM 'published'
     OR v_chapter_status IS DISTINCT FROM 'published'
     OR v_course_status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'Parent content is not published'
      USING ERRCODE = '22023';
  END IF;

  -- Nội dung bắt buộc.
  IF trim(v_revision.title) = ''
     OR trim(v_revision.objective) = ''
     OR trim(v_revision.description) = ''
     OR trim(v_revision.input_format) = ''
     OR trim(v_revision.output_format) = ''
     OR trim(v_revision.hint_1) = ''
     OR trim(v_revision.hint_2) = ''
     OR trim(v_revision.hint_3) = ''
     OR trim(v_revision.solution_code) = ''
     OR trim(v_revision.solution_explanation) = '' THEN
    RAISE EXCEPTION 'Required content is missing'
      USING ERRCODE = '22023';
  END IF;

  SELECT
    count(*) FILTER (WHERE is_public),
    count(*) FILTER (WHERE NOT is_public)
  INTO v_public_count, v_hidden_count
  FROM public.code_test_cases
  WHERE revision_id = p_revision_id;

  IF v_public_count < 1 OR v_hidden_count < 1 THEN
    RAISE EXCEPTION 'Public and hidden tests required'
      USING ERRCODE = '22023';
  END IF;

  -- Hạ trạng thái phiên bản xuất bản cũ.
  -- Mọi bước chạy trong cùng transaction.
  IF v_exercise.published_revision_id IS NOT NULL THEN
    UPDATE public.code_exercise_revisions
    SET status = 'superseded',
        updated_at = now()
    WHERE id = v_exercise.published_revision_id
      AND exercise_id = p_exercise_id
      AND status = 'published';
  END IF;

  -- Đưa phiên bản mới lên published.
  UPDATE public.code_exercise_revisions
  SET status = 'published',
      updated_at = now()
  WHERE id = p_revision_id
    AND exercise_id = p_exercise_id
    AND status = 'draft';

  -- Trỏ bài thực hành tới phiên bản mới.
  UPDATE public.code_exercises
  SET published_revision_id = p_revision_id,
      updated_at = now()
  WHERE id = p_exercise_id;

  RETURN jsonb_build_object(
    'id', p_exercise_id,
    'revision_id', p_revision_id,
    'status', 'published'
  );
END;
$$;

-- Chỉ Backend có service_role được phép gọi RPC.
REVOKE ALL ON FUNCTION public.publish_code_exercise_draft(
  uuid, uuid, uuid, integer
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.publish_code_exercise_draft(
  uuid, uuid, uuid, integer
) TO service_role;

COMMIT;