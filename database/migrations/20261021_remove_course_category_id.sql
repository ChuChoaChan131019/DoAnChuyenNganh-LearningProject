-- Apply after the backend no longer reads or writes courses.category_id.
-- Keeps courses, chapters, lessons, questions, quiz attempts, and category rows intact.
-- The foreign key on this column is removed automatically with the column.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.courses DROP COLUMN IF EXISTS category_id RESTRICT;

COMMIT;
