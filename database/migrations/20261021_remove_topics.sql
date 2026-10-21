-- Applied to the shared Supabase database on 2026-10-21.
-- Deploy the chapter-based backend before applying this to another database.
-- Questions without chapter_id remain unchanged; classify them separately.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE
  unclassified_links bigint;
BEGIN
  IF to_regclass('public.question_topics') IS NOT NULL THEN
    EXECUTE '
      SELECT count(*)
      FROM public.question_topics AS link
      LEFT JOIN public.questions AS question ON question.id = link.question_id
      WHERE question.id IS NULL OR question.chapter_id IS NULL
    ' INTO unclassified_links;
    IF unclassified_links > 0 THEN
      RAISE EXCEPTION 'Some linked questions have no chapter_id; classify them before dropping question_topics';
    END IF;
  END IF;
END;
$$;

DROP TABLE IF EXISTS public.question_topics RESTRICT;
DROP TABLE IF EXISTS public.lesson_topics RESTRICT;
DROP TABLE IF EXISTS public.topics RESTRICT;

COMMIT;
