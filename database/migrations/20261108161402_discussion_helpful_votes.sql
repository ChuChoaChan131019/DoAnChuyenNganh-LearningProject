-- D03: helpful votes for discussion posts and comments.
-- Prerequisites: D01/D02 migrations, public.profiles and Supabase API roles.
-- Reapplying this migration preserves existing votes.
BEGIN;

CREATE TABLE IF NOT EXISTS public.discussion_post_helpful_votes (
  post_id uuid NOT NULL REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discussion_post_helpful_votes_pkey PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_helpful_user ON public.discussion_post_helpful_votes(user_id);

ALTER TABLE public.discussion_post_helpful_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.discussion_post_helpful_votes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.discussion_post_helpful_votes TO service_role;

CREATE TABLE IF NOT EXISTS public.discussion_comment_helpful_votes (
  comment_id uuid NOT NULL REFERENCES public.discussion_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discussion_comment_helpful_votes_pkey PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_helpful_user ON public.discussion_comment_helpful_votes(user_id);

ALTER TABLE public.discussion_comment_helpful_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.discussion_comment_helpful_votes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.discussion_comment_helpful_votes TO service_role;

CREATE OR REPLACE FUNCTION public.discussion_comment_helpful_stats(p_ids uuid[], p_user_id uuid)
 RETURNS TABLE(target_id uuid, helpful_count bigint, is_helpful boolean)
 LANGUAGE sql
 SECURITY INVOKER
 STABLE
 SET search_path TO ''
AS $function$
    SELECT
        cm.id AS target_id,
        COUNT(v.user_id)::bigint AS helpful_count,
        COALESCE(
            BOOL_OR(v.user_id = p_user_id),
            false
        ) AS is_helpful

    FROM public.discussion_comments cm

    JOIN public.discussion_posts p
        ON p.id = cm.post_id
       AND p.status = 'visible'
       AND p.deleted_at IS NULL

    JOIN public.chapters ch
        ON ch.id = p.chapter_id
       AND ch.status = 'published'

    JOIN public.courses c
        ON c.id = ch.course_id
       AND c.status = 'published'

    LEFT JOIN public.lessons l
        ON l.id = p.lesson_id

    LEFT JOIN public.discussion_comment_helpful_votes v
        ON v.comment_id = cm.id

    WHERE cm.id = ANY(p_ids)
      AND cm.status = 'visible'
      AND cm.deleted_at IS NULL
      AND (
          p.lesson_id IS NULL
          OR l.status = 'published'
      )

    GROUP BY cm.id;
$function$;

CREATE OR REPLACE FUNCTION public.discussion_post_helpful_stats(p_ids uuid[], p_user_id uuid)
 RETURNS TABLE(target_id uuid, helpful_count bigint, is_helpful boolean)
 LANGUAGE sql
 SECURITY INVOKER
 STABLE
 SET search_path TO ''
AS $function$
    SELECT
        p.id AS target_id,
        COUNT(v.user_id)::bigint AS helpful_count,
        COALESCE(
            BOOL_OR(v.user_id = p_user_id),
            false
        ) AS is_helpful
    FROM public.discussion_posts p

    JOIN public.chapters ch
        ON ch.id = p.chapter_id
       AND ch.status = 'published'

    JOIN public.courses c
        ON c.id = ch.course_id
       AND c.status = 'published'

    LEFT JOIN public.lessons l
        ON l.id = p.lesson_id

    LEFT JOIN public.discussion_post_helpful_votes v
        ON v.post_id = p.id

    WHERE p.id = ANY(p_ids)
      AND p.status = 'visible'
      AND p.deleted_at IS NULL
      AND (
          p.lesson_id IS NULL
          OR l.status = 'published'
      )

    GROUP BY p.id;
$function$;

REVOKE ALL ON FUNCTION public.discussion_post_helpful_stats(uuid[], uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discussion_post_helpful_stats(uuid[], uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.discussion_comment_helpful_stats(uuid[], uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discussion_comment_helpful_stats(uuid[], uuid)
  TO service_role;

COMMIT;
