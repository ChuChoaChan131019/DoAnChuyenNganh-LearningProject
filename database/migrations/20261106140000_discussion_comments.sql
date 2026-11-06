-- D02: learner comments and searchable discussion post listings.
-- Prerequisites: public.profiles, discussion_posts and Supabase API roles.
BEGIN;

CREATE TABLE IF NOT EXISTS public.discussion_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'visible'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT discussion_comments_pkey PRIMARY KEY (id),
  CONSTRAINT discussion_comments_post_id_fkey FOREIGN KEY (post_id)
    REFERENCES public.discussion_posts(id) ON DELETE RESTRICT,
  CONSTRAINT discussion_comments_author_id_fkey FOREIGN KEY (author_id)
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT discussion_comments_content_check CHECK (
    char_length(btrim(content)) >= 1
    AND char_length(btrim(content)) <= 5000
  ),
  CONSTRAINT discussion_comments_status_check CHECK (
    status = ANY (ARRAY['visible'::text, 'hidden'::text, 'removed'::text])
  )
);

CREATE INDEX IF NOT EXISTS idx_discussion_comments_post_visible
  ON public.discussion_comments (post_id, created_at, id)
  WHERE status = 'visible' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_discussion_comments_author
  ON public.discussion_comments (author_id);

-- Search stays scoped by chapter/lesson in the API. The simple configuration
-- tokenizes Vietnamese text without applying an incorrect English stemmer.
ALTER TABLE public.discussion_posts
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(content, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_discussion_posts_visible_search
  ON public.discussion_posts USING gin (search_vector)
  WHERE status = 'visible' AND deleted_at IS NULL;

-- Only the trusted backend client may access discussion data directly.
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.discussion_comments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.discussion_comments TO service_role;

COMMIT;
