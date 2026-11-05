-- Track rejected questions separately from drafts awaiting review.

DO $$
DECLARE
  v_status_attnum smallint;
  v_constraint record;
BEGIN
  SELECT attribute.attnum
  INTO v_status_attnum
  FROM pg_attribute AS attribute
  WHERE attribute.attrelid = 'public.questions'::regclass
    AND attribute.attname = 'status'
    AND NOT attribute.attisdropped;

  IF v_status_attnum IS NULL THEN
    RAISE EXCEPTION 'public.questions.status does not exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_info
    WHERE constraint_info.conrelid = 'public.questions'::regclass
      AND constraint_info.contype = 'c'
      AND v_status_attnum = ANY (constraint_info.conkey)
      AND position('rejected' IN pg_get_constraintdef(constraint_info.oid)) > 0
  ) THEN
    RETURN;
  END IF;

  FOR v_constraint IN
    SELECT constraint_info.conname
    FROM pg_constraint AS constraint_info
    WHERE constraint_info.conrelid = 'public.questions'::regclass
      AND constraint_info.contype = 'c'
      AND v_status_attnum = ANY (constraint_info.conkey)
  LOOP
    EXECUTE format(
      'ALTER TABLE public.questions DROP CONSTRAINT %I',
      v_constraint.conname
    );
  END LOOP;

  ALTER TABLE public.questions
    ADD CONSTRAINT questions_status_check
    CHECK (status IN ('draft', 'approved', 'rejected'))
    NOT VALID;

  ALTER TABLE public.questions
    VALIDATE CONSTRAINT questions_status_check;
END
$$;

CREATE INDEX IF NOT EXISTS questions_draft_created_idx
  ON public.questions (created_at DESC)
  WHERE status = 'draft';
