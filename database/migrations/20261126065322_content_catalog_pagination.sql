BEGIN;

-- One JSON result keeps page metadata independent of PostgREST's row cap.
-- Only the selected page is serialized. Filters and counts run in PostgreSQL.
CREATE OR REPLACE FUNCTION public.content_catalog_page(
  p_kind text, p_actor_id uuid, p_filters jsonb DEFAULT '{}'::jsonb,
  p_page integer DEFAULT 1, p_page_size integer DEFAULT 10
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_search text := '%' || lower(trim(coalesce(p_filters->>'search', ''))) || '%';
  v_level text := lower(coalesce(p_filters->>'level', ''));
  v_status text := lower(coalesce(p_filters->>'status', ''));
  v_source text := coalesce(p_filters->>'source', 'all');
  v_offset bigint;
  v_result jsonb;
  v_stats jsonb := '{}'::jsonb;
BEGIN
  IF p_page IS NULL OR p_page < 1 OR p_page > 1000000 OR p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 50 THEN
    RAISE EXCEPTION 'Invalid pagination' USING ERRCODE = '22023';
  END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = p_actor_id;
  IF v_role IS NULL OR NOT (v_role IN ('admin', 'content_manager') OR (v_role = 'learner' AND p_kind IN ('courses', 'lessons'))) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  v_offset := (p_page::bigint - 1) * p_page_size;

  IF p_kind = 'courses' THEN
    WITH filtered AS NOT MATERIALIZED (
      SELECT c.*,
        (SELECT count(*) FROM public.chapters ch WHERE ch.course_id = c.id AND (v_role <> 'learner' OR ch.status = 'published')) AS chapter_count,
        (SELECT count(*) FROM public.lessons l JOIN public.chapters ch ON ch.id = l.chapter_id
          WHERE ch.course_id = c.id AND (v_role <> 'learner' OR (ch.status = 'published' AND l.status = 'published'))) AS lesson_count
      FROM public.courses c
      WHERE (v_role <> 'learner' OR c.status = 'published')
        AND lower(c.title || ' ' || c.slug || ' ' || coalesce(c.description, '')) LIKE v_search
        AND (v_level = '' OR lower(c.level) = v_level)
        AND (v_status = '' OR (v_status = 'published' AND c.status = 'published') OR (v_status = 'draft' AND c.status <> 'published'))
    ), selected AS (
      SELECT * FROM filtered ORDER BY
        CASE WHEN p_filters->>'sort' = 'Title A-Z' THEN title END ASC,
        CASE WHEN p_filters->>'sort' = 'Most lessons' THEN lesson_count END DESC,
        CASE WHEN coalesce(p_filters->>'sort', '') NOT IN ('Title A-Z', 'Most lessons') THEN updated_at END DESC,
        title, id LIMIT p_page_size OFFSET v_offset
    ) SELECT jsonb_build_object('total', (SELECT count(*) FROM filtered), 'items', coalesce((SELECT jsonb_agg(
      jsonb_build_object('id', id, 'title', title, 'slug', slug, 'description', coalesce(description, ''),
        'level', initcap(coalesce(level, 'beginner')), 'status', CASE WHEN status = 'published' THEN 'Published' ELSE 'Draft' END,
        'chapters', chapter_count, 'lessons', lesson_count, 'updated', to_char(updated_at, 'YYYY-MM-DD'),
        'gradient', 'from-[#d9eef0] to-[#fbe8e4]')
    ) FROM selected), '[]'::jsonb)) INTO v_result;

  ELSIF p_kind = 'lessons' THEN
    WITH filtered AS NOT MATERIALIZED (
      SELECT l.id, l.title, l.status, l.order_index, l.is_ai_generated, l.estimated_duration_minutes,
        l.created_at, ch.title AS chapter_title, c.title AS course_title, c.slug AS course_slug
      FROM public.lessons l JOIN public.chapters ch ON ch.id = l.chapter_id JOIN public.courses c ON c.id = ch.course_id
      WHERE (v_role <> 'learner' OR (l.status = 'published' AND ch.status = 'published' AND c.status = 'published'))
        AND lower(l.title || ' ' || ch.title || ' ' || c.title || ' ' || l.id::text) LIKE v_search
    ), selected AS (SELECT * FROM filtered ORDER BY course_title, chapter_title, order_index, id LIMIT p_page_size OFFSET v_offset)
    SELECT jsonb_build_object('total', (SELECT count(*) FROM filtered), 'items', coalesce((SELECT jsonb_agg(
      jsonb_build_object('id', id, 'title', title, 'slug', id::text, 'code', 'L' || lpad(order_index::text, 2, '0'),
        'duration', coalesce(estimated_duration_minutes, 0)::text || 'm', 'ai', coalesce(is_ai_generated, false),
        'status', CASE WHEN status = 'published' THEN 'Published' ELSE 'Draft' END,
        'course', course_title, 'chapter', chapter_title, 'courseTitle', course_title, 'courseSlug', course_slug, 'chapterTitle', chapter_title)
    ) FROM selected), '[]'::jsonb)) INTO v_result;

  ELSIF p_kind = 'questions' THEN
    WITH filtered AS NOT MATERIALIZED (
      SELECT q.*, c.title AS course_title, ch.title AS chapter_title, l.title AS lesson_title
      FROM public.questions q JOIN public.courses c ON c.id = q.course_id
      LEFT JOIN public.chapters ch ON ch.id = q.chapter_id LEFT JOIN public.lessons l ON l.id = q.lesson_id
      WHERE q.generated_for_user_id IS NULL AND q.deleted_at IS NULL
        AND lower(q.content || ' ' || c.title || ' ' || coalesce(ch.title, '') || ' ' || coalesce(l.title, '')) LIKE v_search
        AND (coalesce(p_filters->>'course_id', '') = '' OR q.course_id = (p_filters->>'course_id')::uuid)
        AND (coalesce(p_filters->>'chapter_id', '') = '' OR q.chapter_id = (p_filters->>'chapter_id')::uuid)
        AND (coalesce(p_filters->>'lesson_id', '') = '' OR q.lesson_id = (p_filters->>'lesson_id')::uuid)
        AND (coalesce(p_filters->>'question_type', '') = '' OR q.question_type = p_filters->>'question_type')
        AND (coalesce(p_filters->>'difficulty', '') = '' OR q.difficulty = p_filters->>'difficulty')
        AND (v_status = '' OR q.status = v_status)
        AND (v_source = 'all' OR coalesce(q.is_ai_generated, false) = (v_source = 'ai'))
        AND NOT (q.id::text = ANY(string_to_array(coalesce(p_filters->>'exclude_ids', ''), ',')))
    ), selected AS (SELECT * FROM filtered ORDER BY created_at DESC, id DESC LIMIT p_page_size OFFSET v_offset)
    SELECT jsonb_build_object('total', (SELECT count(*) FROM filtered), 'items', coalesce((SELECT jsonb_agg(
      (to_jsonb(q) - 'course_title' - 'chapter_title' - 'lesson_title') || jsonb_build_object(
        'course', jsonb_build_object('id', course_id, 'title', course_title),
        'chapter', CASE WHEN chapter_id IS NULL THEN NULL ELSE jsonb_build_object('id', chapter_id, 'title', chapter_title) END,
        'lesson', CASE WHEN lesson_id IS NULL THEN NULL ELSE jsonb_build_object('id', lesson_id, 'title', lesson_title) END,
        'options', coalesce((SELECT jsonb_agg(jsonb_build_object('id', o.id, 'option_text', o.option_text, 'is_correct', o.is_correct, 'order_index', o.order_index) ORDER BY o.order_index, o.id)
          FROM public.question_options o WHERE o.question_id = q.id), '[]'::jsonb))
    ) FROM selected q), '[]'::jsonb)) INTO v_result;
    SELECT jsonb_build_object('total', count(*), 'drafts', count(*) FILTER (WHERE status = 'draft'),
      'approved', count(*) FILTER (WHERE status = 'approved'), 'rejected', count(*) FILTER (WHERE status = 'rejected'))
      INTO v_stats FROM public.questions WHERE generated_for_user_id IS NULL AND deleted_at IS NULL;

  ELSIF p_kind = 'quizzes' THEN
    WITH filtered AS NOT MATERIALIZED (
      SELECT q.*, c.title AS course_title,
        q.is_active AND EXISTS(SELECT 1 FROM public.quiz_questions qq JOIN public.questions x ON x.id = qq.question_id WHERE qq.quiz_id = q.id AND x.status = 'approved') AS published,
        (SELECT count(*) FROM public.quiz_questions qq WHERE qq.quiz_id = q.id) AS questions_count
      FROM public.quizzes q JOIN public.courses c ON c.id = q.course_id
      WHERE lower(q.title || ' ' || c.title) LIKE v_search
    ), selected AS (SELECT * FROM filtered ORDER BY created_at DESC, id DESC LIMIT p_page_size OFFSET v_offset)
    SELECT jsonb_build_object('total', (SELECT count(*) FROM filtered), 'items', coalesce((SELECT jsonb_agg(
      (to_jsonb(q) - 'published') || jsonb_build_object('is_active', coalesce(published, false),
        'status', CASE WHEN published THEN 'published' ELSE 'draft' END, 'pass_score', pass_percentage, 'attempts_count', 0, 'difficulty', 'medium')
    ) FROM selected q), '[]'::jsonb)) INTO v_result;

  ELSIF p_kind = 'code' THEN
    WITH filtered AS NOT MATERIALIZED (
      SELECT e.*, r.title, r.difficulty, r.status, r.revision_no, r.edit_version,
        EXISTS(SELECT 1 FROM public.code_exercise_revisions d WHERE d.exercise_id = e.id AND d.status = 'draft') AS has_draft
      FROM public.code_exercises e
      LEFT JOIN LATERAL (SELECT x.* FROM public.code_exercise_revisions x WHERE x.exercise_id = e.id AND x.status IN ('draft', 'published')
        ORDER BY (x.status = 'draft') DESC, (x.id = e.published_revision_id) DESC NULLS LAST, x.revision_no DESC, x.id LIMIT 1) r ON true
      WHERE e.archived_at IS NULL AND lower(coalesce(r.title, '')) LIKE v_search
    ), selected AS (SELECT * FROM filtered ORDER BY updated_at DESC, id DESC LIMIT p_page_size OFFSET v_offset)
    SELECT jsonb_build_object('total', (SELECT count(*) FROM filtered), 'items', coalesce((SELECT jsonb_agg(
      to_jsonb(e) || jsonb_build_object('can_edit', v_role = 'admin' OR created_by = p_actor_id,
        'is_published', published_revision_id IS NOT NULL, 'title', coalesce(title, ''), 'difficulty', coalesce(difficulty, 'easy'),
        'status', coalesce(status, 'draft'), 'revision_no', coalesce(revision_no, 1), 'edit_version', coalesce(edit_version, 1))
    ) FROM selected e), '[]'::jsonb)) INTO v_result;

  ELSIF p_kind = 'review' THEN
    -- Paginate review targets, rather than serializing every lesson below 5 courses.
    WITH targets AS NOT MATERIALIZED (
      SELECT c.id, c.title AS sort_course, -1 AS sort_chapter, -1 AS sort_lesson,
        jsonb_build_object('course', jsonb_build_object('id', c.id, 'title', c.title, 'slug', c.slug, 'status', c.status)) AS item
        FROM public.courses c WHERE lower(c.title) LIKE v_search
      UNION ALL
      SELECT ch.id, c.title, ch.order_index, -1,
        jsonb_build_object('course', jsonb_build_object('id', c.id, 'title', c.title, 'slug', c.slug, 'status', c.status),
          'chapter', jsonb_build_object('id', ch.id, 'title', ch.title, 'status', ch.status, 'order_index', ch.order_index))
        FROM public.chapters ch JOIN public.courses c ON c.id = ch.course_id WHERE lower(ch.title || ' ' || c.title) LIKE v_search
      UNION ALL
      SELECT l.id, c.title, ch.order_index, l.order_index,
        jsonb_build_object('course', jsonb_build_object('id', c.id, 'title', c.title, 'slug', c.slug, 'status', c.status),
          'chapter', jsonb_build_object('id', ch.id, 'title', ch.title, 'status', ch.status, 'order_index', ch.order_index),
          'lesson', jsonb_build_object('id', l.id, 'title', l.title, 'status', l.status, 'version', l.version,
            'is_ai_generated', coalesce(l.is_ai_generated, false), 'order_index', l.order_index,
            'validation', (SELECT to_jsonb(v) FROM public.lesson_validation_runs v WHERE v.lesson_id = l.id ORDER BY v.created_at DESC, v.id DESC LIMIT 1)))
        FROM public.lessons l JOIN public.chapters ch ON ch.id = l.chapter_id JOIN public.courses c ON c.id = ch.course_id
        WHERE lower(l.title || ' ' || ch.title || ' ' || c.title) LIKE v_search
          AND (v_source = 'all' OR coalesce(l.is_ai_generated, false) = (v_source = 'ai'))
    ), selected AS (SELECT * FROM targets ORDER BY sort_course, sort_chapter, sort_lesson, id LIMIT p_page_size OFFSET v_offset)
    SELECT jsonb_build_object('total', (SELECT count(*) FROM targets), 'items', coalesce((SELECT jsonb_agg(item) FROM selected), '[]'::jsonb)) INTO v_result;
    SELECT jsonb_build_object('courses', (SELECT count(*) FROM public.courses), 'chapters', (SELECT count(*) FROM public.chapters),
      'lessons', (SELECT count(*) FROM public.lessons), 'drafts', (SELECT count(*) FROM public.courses WHERE status <> 'published')
        + (SELECT count(*) FROM public.chapters WHERE status <> 'published') + (SELECT count(*) FROM public.lessons WHERE status <> 'published')) INTO v_stats;
  ELSE
    RAISE EXCEPTION 'Invalid catalog' USING ERRCODE = '22023';
  END IF;
  RETURN v_result || jsonb_build_object('page', p_page, 'page_size', p_page_size,
    'total_pages', ceil((v_result->>'total')::numeric / p_page_size), 'stats', v_stats);
END;
$$;

REVOKE ALL ON FUNCTION public.content_catalog_page(text, uuid, jsonb, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.content_catalog_page(text, uuid, jsonb, integer, integer) TO service_role;

CREATE INDEX IF NOT EXISTS ai_tutor_messages_conversation_cursor_idx ON public.ai_tutor_messages(conversation_id, created_at DESC, id DESC);
COMMIT;
