-- Admins request corrections; editors receive an in-app notification in the
-- same transaction as the review decision.
CREATE TABLE public.authoring_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  target_type text NOT NULL CHECK (target_type IN ('lesson', 'question')),
  target_id uuid NOT NULL,
  title text NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX authoring_notifications_recipient_time_idx
  ON public.authoring_notifications (recipient_id, created_at DESC, id DESC);
CREATE INDEX authoring_notifications_unread_idx
  ON public.authoring_notifications (recipient_id) WHERE read_at IS NULL;
ALTER TABLE public.authoring_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.authoring_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.authoring_notifications TO service_role;
GRANT UPDATE (read_at) ON public.authoring_notifications TO service_role;

ALTER TABLE public.lesson_review_events DROP CONSTRAINT IF EXISTS lesson_review_events_action_check;
ALTER TABLE public.lesson_review_events ADD CONSTRAINT lesson_review_events_action_check
  CHECK (action IN ('create','edit','validate','submit','approve','return','publish','unpublish','workflow_migration','restore','request_changes'));

CREATE OR REPLACE FUNCTION public.request_lesson_changes(
  p_lesson_id uuid, p_actor_id uuid, p_version integer, p_reason text
) RETURNS public.lessons LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE l public.lessons; old_status text;
BEGIN
  IF length(trim(coalesce(p_reason, ''))) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'A reason between 1 and 2000 characters is required' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_actor_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can request changes' USING errcode = '42501';
  END IF;
  SELECT * INTO l FROM public.lessons WHERE id = p_lesson_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lesson not found' USING errcode = 'P0002'; END IF;
  IF l.version <> p_version THEN RAISE EXCEPTION 'Lesson changed; reload and retry' USING errcode = '40001'; END IF;
  IF l.created_by IS NULL OR l.created_by = p_actor_id OR NOT EXISTS
    (SELECT 1 FROM public.profiles WHERE id = l.created_by AND role = 'content_manager') THEN
    RAISE EXCEPTION 'No editor is assigned to this lesson' USING errcode = '22023';
  END IF;
  old_status := l.status;
  PERFORM set_config('app.lesson_review_write', 'on', true);
  UPDATE public.lessons SET status = 'draft', version = l.version + 1,
    updated_by = p_actor_id, updated_at = now(), reviewed_by = null, reviewed_at = null
    WHERE id = p_lesson_id RETURNING * INTO l;
  INSERT INTO public.lesson_review_events
    (lesson_id, version, action, from_status, to_status, actor_id, reason, snapshot)
  VALUES (l.id, l.version, 'request_changes', old_status, 'draft', p_actor_id, trim(p_reason),
    jsonb_build_object('title', l.title, 'content', l.content, 'code_example', l.code_example,
      'estimated_duration_minutes', l.estimated_duration_minutes));
  RETURN l;
END $$;
REVOKE ALL ON FUNCTION public.request_lesson_changes(uuid,uuid,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_lesson_changes(uuid,uuid,integer,text) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_lesson_change_request() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE recipient uuid;
BEGIN
  IF NEW.action <> 'request_changes' THEN RETURN NEW; END IF;
  SELECT created_by INTO recipient FROM public.lessons WHERE id = NEW.lesson_id;
  INSERT INTO public.authoring_notifications (recipient_id, actor_id, target_type, target_id, title, reason)
    SELECT recipient, NEW.actor_id, 'lesson', NEW.lesson_id,
      coalesce(NEW.snapshot->>'title', 'Bài học'), NEW.reason
    WHERE recipient IS NOT NULL AND recipient <> NEW.actor_id;
  RETURN NEW;
END $$;
CREATE TRIGGER lesson_change_request_notification
  AFTER INSERT ON public.lesson_review_events FOR EACH ROW
  EXECUTE FUNCTION public.notify_lesson_change_request();

CREATE OR REPLACE FUNCTION public.notify_question_change_request() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE recipient uuid;
BEGIN
  IF NEW.action NOT IN ('rejected', 'unapproved') OR NEW.reason IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.actor_id AND role = 'admin') THEN RETURN NEW; END IF;
  SELECT created_by INTO recipient FROM public.questions WHERE id = NEW.question_id;
  IF recipient IS NULL OR NOT EXISTS
    (SELECT 1 FROM public.profiles WHERE id = recipient AND role = 'content_manager') THEN
    RAISE EXCEPTION 'No content manager is assigned to this question' USING errcode = '22023';
  END IF;
  INSERT INTO public.authoring_notifications (recipient_id, actor_id, target_type, target_id, title, reason)
    SELECT recipient, NEW.actor_id, 'question', NEW.question_id,
      left(coalesce(NEW.snapshot->>'content', 'Câu hỏi'), 160), NEW.reason
    WHERE recipient IS NOT NULL AND recipient <> NEW.actor_id;
  RETURN NEW;
END $$;
CREATE TRIGGER question_change_request_notification
  AFTER INSERT ON public.question_history FOR EACH ROW
  EXECUTE FUNCTION public.notify_question_change_request();

CREATE OR REPLACE FUNCTION public.save_lesson_content(
  p_lesson_id uuid, p_actor_id uuid, p_version integer, p_content jsonb
) RETURNS public.lessons LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE l public.lessons; new_status text; old_status text;
BEGIN
  SELECT * INTO l FROM public.lessons WHERE id = p_lesson_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lesson not found' USING errcode = 'P0002'; END IF;
  IF l.version <> p_version THEN RAISE EXCEPTION 'Lesson changed; reload and retry' USING errcode = '40001'; END IF;
  IF l.status NOT IN ('draft','approved') THEN
    RAISE EXCEPTION 'This lesson cannot be edited in its current status' USING errcode = '40001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_actor_id AND role = 'content_manager') THEN
    RAISE EXCEPTION 'Only content managers can edit lessons' USING errcode = '42501';
  END IF;
  IF p_content ? 'title' AND length(trim(p_content->>'title')) < 2 THEN
    RAISE EXCEPTION 'Title is required' USING errcode = '22023';
  END IF;
  new_status := CASE WHEN l.status = 'approved' THEN 'draft' ELSE l.status END;
  old_status := l.status;
  PERFORM set_config('app.lesson_review_write', 'on', true);
  UPDATE public.lessons SET
    title = coalesce(nullif(trim(p_content->>'title'), ''), l.title),
    content = CASE WHEN p_content ? 'content' THEN nullif(p_content->>'content','') ELSE l.content END,
    code_example = CASE WHEN p_content ? 'code_example' THEN nullif(p_content->>'code_example','') ELSE l.code_example END,
    estimated_duration_minutes = CASE WHEN p_content ? 'estimated_duration_minutes'
      THEN (p_content->>'estimated_duration_minutes')::integer ELSE l.estimated_duration_minutes END,
    status = new_status, version = l.version + 1, updated_by = p_actor_id, updated_at = now(),
    reviewed_by = CASE WHEN new_status = 'draft' THEN null ELSE l.reviewed_by END,
    reviewed_at = CASE WHEN new_status = 'draft' THEN null ELSE l.reviewed_at END
    WHERE id = p_lesson_id RETURNING * INTO l;
  INSERT INTO public.lesson_review_events (lesson_id,version,action,from_status,to_status,actor_id,snapshot)
    VALUES (l.id,l.version,'edit',old_status,new_status,p_actor_id,
      jsonb_build_object('title',l.title,'content',l.content,'code_example',l.code_example,
        'estimated_duration_minutes',l.estimated_duration_minutes));
  RETURN l;
END $$;
REVOKE ALL ON FUNCTION public.save_lesson_content(uuid,uuid,integer,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_lesson_content(uuid,uuid,integer,jsonb) TO service_role;
