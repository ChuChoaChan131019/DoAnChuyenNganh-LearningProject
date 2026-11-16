BEGIN;

-- Metadata stays separate from file bytes so attachments can be listed without
-- revealing their Storage path or a public URL.
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  file_url text NOT NULL,
  file_type varchar(50) NOT NULL,
  file_size bigint,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id)
);
CREATE INDEX IF NOT EXISTS materials_lesson_created_idx
  ON public.materials (lesson_id, created_at DESC, id DESC);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.materials FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.materials TO service_role;

-- FR-44 installs this restrictive policy on existing public tables. Recreate it
-- here because this table may be added after that migration on a new project.
DROP POLICY IF EXISTS account_must_be_active ON public.materials;
CREATE POLICY account_must_be_active ON public.materials AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (private.account_access_allowed())
  WITH CHECK (private.account_access_allowed());

-- The application backend is the only client that talks to Storage. Files are
-- served through short-lived signed URLs after the API verifies role and lesson
-- publication state, therefore this bucket must never be public.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-materials',
  'lesson-materials',
  false,
  6291456,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'application/zip'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;
