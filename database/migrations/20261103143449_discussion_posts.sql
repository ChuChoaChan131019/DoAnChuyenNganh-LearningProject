-- D01: discussion posts attached to chapters or lessons.
-- Prerequisites: public.profiles, courses, chapters, lessons and Supabase roles.
-- Recreates the deployed structure without deleting existing rows.
BEGIN;

CREATE TABLE IF NOT EXISTS public.discussion_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL,
  lesson_id uuid,
  author_id uuid NOT NULL,
  post_type text NOT NULL,
  title character varying(160) NOT NULL,
  content text NOT NULL,
  resource_url text,
  status text NOT NULL DEFAULT 'visible'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT discussion_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT discussion_posts_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE RESTRICT,
  CONSTRAINT discussion_posts_content_check CHECK (((char_length(btrim(content)) >= 10) AND (char_length(btrim(content)) <= 20000))),
  CONSTRAINT discussion_posts_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE RESTRICT,
  CONSTRAINT discussion_posts_pkey PRIMARY KEY (id),
  CONSTRAINT discussion_posts_post_type_check CHECK ((post_type = ANY (ARRAY['question'::text, 'note'::text, 'resource'::text]))),
  CONSTRAINT discussion_posts_status_check CHECK ((status = ANY (ARRAY['visible'::text, 'hidden'::text, 'removed'::text]))),
  CONSTRAINT discussion_posts_title_check CHECK (((char_length(btrim((title)::text)) >= 5) AND (char_length(btrim((title)::text)) <= 160))),
  CONSTRAINT discussion_resource_check CHECK ((((post_type = 'resource'::text) AND (resource_url IS NOT NULL) AND (char_length(resource_url) <= 2000) AND (resource_url ~* '^https://[^[:space:]]+$'::text)) OR ((post_type = ANY (ARRAY['question'::text, 'note'::text])) AND (resource_url IS NULL))))
);

CREATE INDEX IF NOT EXISTS idx_discussion_posts_chapter
  ON public.discussion_posts (chapter_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_discussion_posts_lesson
  ON public.discussion_posts (lesson_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_discussion_posts_author ON public.discussion_posts (author_id);

-- Only the backend may access posts; it enforces authorship from the JWT.
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.discussion_posts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.discussion_posts TO service_role;

CREATE OR REPLACE FUNCTION public.validate_discussion_post_target()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
BEGIN
    -- Chương và khóa học phải được xuất bản
    IF NOT EXISTS (
        SELECT 1
        FROM public.chapters ch
        JOIN public.courses c ON c.id = ch.course_id
        WHERE ch.id = NEW.chapter_id
          AND ch.status = 'published'
          AND c.status = 'published'
    ) THEN
        RAISE EXCEPTION
            'Chapter or course is not published'
            USING ERRCODE = '23514';
    END IF;

    -- Nếu chọn bài học, bài phải nằm đúng chương
    IF NEW.lesson_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.lessons l
        WHERE l.id = NEW.lesson_id
          AND l.chapter_id = NEW.chapter_id
          AND l.status = 'published'
    ) THEN
        RAISE EXCEPTION
            'Lesson is not published or belongs to another chapter'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$function$;

-- Validate relation consistency and publication when creating/moving a post.
DROP TRIGGER IF EXISTS trg_validate_discussion_post_target ON public.discussion_posts;
CREATE TRIGGER trg_validate_discussion_post_target BEFORE INSERT OR UPDATE OF chapter_id, lesson_id ON public.discussion_posts FOR EACH ROW EXECUTE FUNCTION public.validate_discussion_post_target();

REVOKE ALL ON FUNCTION public.validate_discussion_post_target() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_discussion_post_target() TO service_role;

COMMIT;
