-- Applied to the shared Supabase database on 2026-10-21.
-- Apply after removing courses.category_id and Category API usage elsewhere.
-- Deletes the five orphaned legacy category rows; course and learning data are retained.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DROP TABLE IF EXISTS public.categories RESTRICT;

COMMIT;
