CREATE OR REPLACE FUNCTION public.create_question_atomic(p_payload jsonb, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  question_id uuid := gen_random_uuid();
  v_chapter_id uuid := NULLIF(p_payload->>'chapter_id', '')::uuid;
  v_lesson_id uuid := NULLIF(p_payload->>'lesson_id', '')::uuid;
  status_value varchar(20) := COALESCE(p_payload->>'status', 'draft');
  actor_role varchar(20);
BEGIN
  SELECT role INTO actor_role FROM profiles WHERE id = p_actor_id;
  IF actor_role IS NULL OR actor_role NOT IN ('content_manager', 'admin') THEN
    RAISE EXCEPTION 'question management requires content_manager or admin';
  END IF;
  IF status_value = 'approved' AND actor_role <> 'admin' THEN
    RAISE EXCEPTION 'only admin can approve questions';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM courses WHERE id = (p_payload->>'course_id')::uuid) THEN
    RAISE EXCEPTION 'course not found';
  END IF;
  IF v_chapter_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM chapters c WHERE c.id = v_chapter_id AND c.course_id = (p_payload->>'course_id')::uuid
  ) THEN
    RAISE EXCEPTION 'chapter does not belong to course';
  END IF;
  IF v_lesson_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.id = v_lesson_id AND l.chapter_id = v_chapter_id
  ) THEN
    RAISE EXCEPTION 'lesson does not belong to chapter';
  END IF;

  INSERT INTO questions (id, course_id, chapter_id, lesson_id, question_type, difficulty, content, explanation, status)
  VALUES (question_id, (p_payload->>'course_id')::uuid, v_chapter_id, v_lesson_id,
    p_payload->>'question_type', p_payload->>'difficulty', p_payload->>'content',
    p_payload->>'explanation', status_value);

  INSERT INTO question_options (question_id, option_text, is_correct, order_index)
  SELECT question_id, item->>'option_text', COALESCE((item->>'is_correct')::boolean, false),
    COALESCE((item->>'order_index')::integer, 0)
  FROM jsonb_array_elements(COALESCE(p_payload->'options', '[]'::jsonb)) item;

  INSERT INTO question_topics (question_id, topic_id)
  SELECT question_id, topic_id::uuid
  FROM jsonb_array_elements_text(COALESCE(p_payload->'topic_ids', '[]'::jsonb)) topic_id;

  RETURN jsonb_build_object('id', question_id, 'status', status_value);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_question_atomic(p_payload jsonb, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_id uuid := (p_payload->>'id')::uuid;
  v_chapter_id uuid := NULLIF(p_payload->>'chapter_id', '')::uuid;
  v_lesson_id uuid := NULLIF(p_payload->>'lesson_id', '')::uuid;
  status_value varchar(20) := COALESCE(p_payload->>'status', 'draft');
  actor_role varchar(20);
BEGIN
  SELECT role INTO actor_role FROM profiles WHERE id = p_actor_id;
  IF actor_role IS NULL OR actor_role NOT IN ('content_manager', 'admin') THEN
    RAISE EXCEPTION 'question management requires content_manager or admin';
  END IF;
  IF status_value = 'approved' AND actor_role <> 'admin' THEN
    RAISE EXCEPTION 'only admin can approve questions';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM questions WHERE id = v_question_id) THEN
    RAISE EXCEPTION 'question not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM courses WHERE id = (p_payload->>'course_id')::uuid) THEN
    RAISE EXCEPTION 'course not found';
  END IF;
  IF v_chapter_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM chapters c WHERE c.id = v_chapter_id AND c.course_id = (p_payload->>'course_id')::uuid
  ) THEN
    RAISE EXCEPTION 'chapter does not belong to course';
  END IF;
  IF v_lesson_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.id = v_lesson_id AND l.chapter_id = v_chapter_id
  ) THEN
    RAISE EXCEPTION 'lesson does not belong to chapter';
  END IF;

  UPDATE questions SET course_id = (p_payload->>'course_id')::uuid, chapter_id = v_chapter_id,
    lesson_id = v_lesson_id, question_type = p_payload->>'question_type', difficulty = p_payload->>'difficulty',
    content = p_payload->>'content', explanation = p_payload->>'explanation', status = status_value
  WHERE id = v_question_id;
  DELETE FROM question_options qo WHERE qo.question_id = v_question_id;
  DELETE FROM question_topics qt WHERE qt.question_id = v_question_id;
  INSERT INTO question_options (question_id, option_text, is_correct, order_index)
  SELECT v_question_id, item->>'option_text', COALESCE((item->>'is_correct')::boolean, false),
    COALESCE((item->>'order_index')::integer, 0)
  FROM jsonb_array_elements(COALESCE(p_payload->'options', '[]'::jsonb)) item;
  INSERT INTO question_topics (question_id, topic_id)
  SELECT v_question_id, topic_id::uuid
  FROM jsonb_array_elements_text(COALESCE(p_payload->'topic_ids', '[]'::jsonb)) topic_id;
  RETURN jsonb_build_object('id', v_question_id, 'status', status_value);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_question_status(p_question_id uuid, p_status varchar, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role varchar(20);
BEGIN
  SELECT role INTO actor_role FROM profiles WHERE id = p_actor_id;
  IF NOT EXISTS (SELECT 1 FROM questions WHERE id = p_question_id) THEN
    RAISE EXCEPTION 'question not found';
  END IF;
  IF p_status = 'approved' AND actor_role <> 'admin' THEN
    RAISE EXCEPTION 'only admin can approve questions';
  END IF;
  UPDATE questions SET status = p_status WHERE id = p_question_id;
  RETURN jsonb_build_object('id', p_question_id, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_question_atomic(p_question_id uuid, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count integer;
  quiz_link_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_actor_id AND role IN ('content_manager', 'admin')) THEN
    RAISE EXCEPTION 'question management requires content_manager or admin';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM questions WHERE id = p_question_id) THEN
    RAISE EXCEPTION 'question not found';
  END IF;
  SELECT COUNT(*) INTO attempt_count FROM quiz_attempt_details WHERE question_id = p_question_id;
  IF attempt_count > 0 THEN
    RAISE EXCEPTION 'question has quiz attempts and cannot be deleted';
  END IF;
  SELECT COUNT(*) INTO quiz_link_count FROM quiz_questions WHERE question_id = p_question_id;
  IF quiz_link_count > 0 THEN
    RAISE EXCEPTION 'question is linked to quiz_questions; unlink it before deleting';
  END IF;
  DELETE FROM questions WHERE id = p_question_id;
  RETURN jsonb_build_object('id', p_question_id, 'deleted', true);
END;
$$;