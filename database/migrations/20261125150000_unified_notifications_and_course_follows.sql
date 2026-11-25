-- One in-app notification inbox for all roles. Existing specialized inboxes
-- remain as audit/backwards-compatible stores and are copied into this inbox.
CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'discussion_reply', 'discussion_moderation', 'report_resolved',
    'authoring_change', 'content_published', 'discussion_report'
  )),
  target_type text NOT NULL CHECK (target_type IN (
    'post', 'comment', 'report', 'lesson', 'question', 'quiz', 'code_exercise', 'course'
  )),
  target_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  href text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX user_notifications_recipient_created_idx
  ON public.user_notifications (recipient_id, created_at DESC, id DESC);
CREATE INDEX user_notifications_unread_idx
  ON public.user_notifications (recipient_id) WHERE read_at IS NULL;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE (read_at) ON public.user_notifications TO service_role;

CREATE TABLE public.user_course_follows (
  learner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id, course_id)
);
CREATE INDEX user_course_follows_course_idx ON public.user_course_follows (course_id, learner_id);
ALTER TABLE public.user_course_follows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_course_follows FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_course_follows TO service_role;

-- Preserve the existing inbox history and read states.
INSERT INTO public.user_notifications
  (recipient_id, event_type, target_type, target_id, title, body, href, event_key, created_at, read_at, metadata)
SELECT recipient_id, 'discussion_moderation', target_type, target_id,
  CASE WHEN target_type = 'comment' THEN 'Bình luận của bạn đã bị ' ELSE 'Bài đăng của bạn đã bị ' END ||
    CASE WHEN decision = 'hidden' THEN 'ẩn' ELSE 'gỡ' END,
  coalesce(content_excerpt, '') || E'\nLý do: ' || coalesce(reason, ''),
  '/learner/discussions', 'legacy-discussion:' || id::text, created_at, read_at,
  jsonb_build_object('post_title', post_title, 'content_excerpt', content_excerpt, 'reason', reason, 'decision', decision)
FROM public.discussion_notifications
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.user_notifications
  (recipient_id, event_type, target_type, target_id, title, body, href, event_key, created_at, read_at, metadata)
SELECT recipient_id, 'authoring_change', target_type, target_id,
  'Admin yêu cầu chỉnh sửa: ' || title, reason,
  CASE WHEN target_type = 'lesson'
    THEN '/content-manager/learning-content/lessons/' || target_id::text
    ELSE '/content-manager/questions/editor?id=' || target_id::text END,
  'legacy-authoring:' || id::text, created_at, read_at,
  jsonb_build_object('reason', reason)
FROM public.authoring_notifications
ON CONFLICT (event_key) DO NOTHING;

-- Keep the established specialized event writers active and mirror every new
-- row into the common inbox, avoiding duplicate rows for those event types.
CREATE OR REPLACE FUNCTION public.mirror_legacy_discussion_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE discussion_href text;
BEGIN
  IF NEW.target_type = 'post' THEN
    SELECT '/learner/courses/' || course.slug || '/discussion/' || post.chapter_id::text || '?post=' || post.id::text
      INTO discussion_href FROM public.discussion_posts post
      JOIN public.chapters chapter ON chapter.id = post.chapter_id
      JOIN public.courses course ON course.id = chapter.course_id WHERE post.id = NEW.target_id;
  ELSE
    SELECT '/learner/courses/' || course.slug || '/discussion/' || post.chapter_id::text || '?post=' || post.id::text
      INTO discussion_href FROM public.discussion_comments comment
      JOIN public.discussion_posts post ON post.id = comment.post_id
      JOIN public.chapters chapter ON chapter.id = post.chapter_id
      JOIN public.courses course ON course.id = chapter.course_id WHERE comment.id = NEW.target_id;
  END IF;
  PERFORM public.create_user_notification(
    NEW.recipient_id, 'discussion_moderation', NEW.target_type, NEW.target_id,
    CASE WHEN NEW.target_type = 'comment' THEN 'Bình luận của bạn đã bị ' ELSE 'Bài đăng của bạn đã bị ' END ||
      CASE WHEN NEW.decision = 'hidden' THEN 'ẩn' ELSE 'gỡ' END,
    coalesce(NEW.content_excerpt, '') || E'\nLý do: ' || coalesce(NEW.reason, ''),
    coalesce(discussion_href, '/learner/discussions'), NULL, 'legacy-discussion:' || NEW.id::text,
    jsonb_build_object('post_title', NEW.post_title, 'content_excerpt', NEW.content_excerpt, 'reason', NEW.reason, 'decision', NEW.decision),
    NEW.created_at
  );
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.mirror_legacy_discussion_notification() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER mirror_discussion_notification
  AFTER INSERT ON public.discussion_notifications FOR EACH ROW EXECUTE FUNCTION public.mirror_legacy_discussion_notification();

CREATE OR REPLACE FUNCTION public.mirror_legacy_authoring_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM public.create_user_notification(
    NEW.recipient_id, 'authoring_change', NEW.target_type, NEW.target_id,
    'Admin yêu cầu chỉnh sửa: ' || NEW.title, NEW.reason,
    CASE WHEN NEW.target_type = 'lesson'
      THEN '/content-manager/learning-content/lessons/' || NEW.target_id::text
      ELSE '/content-manager/questions/editor?id=' || NEW.target_id::text END,
    NEW.actor_id, 'legacy-authoring:' || NEW.id::text, jsonb_build_object('reason', NEW.reason), NEW.created_at
  );
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.mirror_legacy_authoring_notification() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER mirror_authoring_notification
  AFTER INSERT ON public.authoring_notifications FOR EACH ROW EXECUTE FUNCTION public.mirror_legacy_authoring_notification();

CREATE OR REPLACE FUNCTION public.create_user_notification(
  p_recipient uuid, p_event_type text, p_target_type text, p_target_id uuid,
  p_title text, p_body text, p_href text, p_actor uuid, p_event_key text,
  p_metadata jsonb DEFAULT '{}'::jsonb, p_created_at timestamptz DEFAULT now()
) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  INSERT INTO public.user_notifications
    (recipient_id, event_type, target_type, target_id, title, body, href, actor_id, event_key, metadata, created_at)
  SELECT p_recipient, p_event_type, p_target_type, p_target_id, p_title, coalesce(p_body, ''),
    p_href, p_actor, p_event_key, coalesce(p_metadata, '{}'::jsonb), p_created_at
  WHERE p_recipient IS NOT NULL AND (p_actor IS NULL OR p_recipient <> p_actor)
  ON CONFLICT (event_key) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.create_user_notification(uuid,text,text,uuid,text,text,text,uuid,text,jsonb,timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_notification(uuid,text,text,uuid,text,text,text,uuid,text,jsonb,timestamptz)
  TO service_role;

-- Let the author know when another learner replies to their post.
CREATE OR REPLACE FUNCTION public.notify_discussion_reply() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE post public.discussion_posts%ROWTYPE; course_slug text;
BEGIN
  SELECT * INTO post FROM public.discussion_posts WHERE id = NEW.post_id;
  IF NOT FOUND OR post.author_id = NEW.author_id OR NEW.status <> 'visible' THEN RETURN NEW; END IF;
  SELECT c.slug INTO course_slug FROM public.chapters ch JOIN public.courses c ON c.id = ch.course_id WHERE ch.id = post.chapter_id;
  PERFORM public.create_user_notification(
    post.author_id, 'discussion_reply', 'post', post.id, 'Bài thảo luận của bạn có bình luận mới',
    left(NEW.content, 300), '/learner/courses/' || course_slug || '/discussion/' ||
      post.chapter_id::text || '?post=' || post.id::text,
    NEW.author_id, 'discussion-reply:' || NEW.id::text,
    jsonb_build_object('comment_id', NEW.id, 'post_title', post.title)
  );
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_discussion_reply() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER discussion_comment_reply_notification
  AFTER INSERT ON public.discussion_comments FOR EACH ROW EXECUTE FUNCTION public.notify_discussion_reply();

-- A report author receives the outcome; admins get a queue notification for new reports.
CREATE OR REPLACE FUNCTION public.notify_discussion_report_event() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE target uuid; kind text; title text; excerpt text; admin_id uuid; discussion_href text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    target := coalesce(NEW.post_id, NEW.comment_id);
    kind := CASE WHEN NEW.post_id IS NOT NULL THEN 'post' ELSE 'comment' END;
    SELECT CASE WHEN kind = 'post' THEN p.title ELSE p.title END,
      CASE WHEN kind = 'post' THEN p.content ELSE c.content END
      INTO title, excerpt
      FROM public.discussion_posts p
      LEFT JOIN public.discussion_comments c ON c.id = NEW.comment_id
      WHERE p.id = coalesce(NEW.post_id, c.post_id);
    IF NEW.post_id IS NOT NULL THEN
      SELECT '/learner/courses/' || course.slug || '/discussion/' || post.chapter_id::text || '?post=' || post.id::text
        INTO discussion_href FROM public.discussion_posts post
        JOIN public.chapters chapter ON chapter.id = post.chapter_id
        JOIN public.courses course ON course.id = chapter.course_id WHERE post.id = NEW.post_id;
    ELSE
      SELECT '/learner/courses/' || course.slug || '/discussion/' || post.chapter_id::text || '?post=' || post.id::text
        INTO discussion_href FROM public.discussion_comments comment
        JOIN public.discussion_posts post ON post.id = comment.post_id
        JOIN public.chapters chapter ON chapter.id = post.chapter_id
        JOIN public.courses course ON course.id = chapter.course_id WHERE comment.id = NEW.comment_id;
    END IF;
    FOR admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
      PERFORM public.create_user_notification(
        admin_id, 'discussion_report', 'report', NEW.id, 'Có báo cáo thảo luận mới',
        left(coalesce(title, 'Nội dung thảo luận'), 160),
        '/admin/discussion-reports?report=' || NEW.id::text,
        NEW.reporter_id, 'discussion-report:new:' || NEW.id::text,
        jsonb_build_object('target_type', kind, 'content_excerpt', left(coalesce(excerpt, ''), 240))
      );
    END LOOP;
    RETURN NEW;
  END IF;
  IF OLD.status <> 'pending' OR NEW.status = 'pending' THEN RETURN NEW; END IF;
  target := coalesce(NEW.post_id, NEW.comment_id);
  kind := CASE WHEN NEW.post_id IS NOT NULL THEN 'post' ELSE 'comment' END;
  PERFORM public.create_user_notification(
    NEW.reporter_id, 'report_resolved', 'report', NEW.id,
    CASE NEW.status WHEN 'dismissed' THEN 'Báo cáo đã được xem xét' WHEN 'hidden' THEN 'Báo cáo đã được xử lý' ELSE 'Nội dung đã được gỡ sau khi xem xét' END,
    'Kết quả: ' || NEW.status || E'\nLý do: ' || coalesce(NEW.moderator_reason, ''),
    coalesce(discussion_href, '/learner/discussions'), NEW.moderator_id, 'discussion-report:resolved:' || NEW.id::text,
    jsonb_build_object('target_type', kind, 'target_id', target, 'decision', NEW.status)
  );
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_discussion_report_event() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER discussion_report_created_notification
  AFTER INSERT ON public.discussion_reports FOR EACH ROW EXECUTE FUNCTION public.notify_discussion_report_event();
CREATE TRIGGER discussion_report_resolved_notification
  AFTER UPDATE OF status ON public.discussion_reports FOR EACH ROW EXECUTE FUNCTION public.notify_discussion_report_event();

-- Request/review decisions notify the content creator when someone else acted.
CREATE OR REPLACE FUNCTION public.notify_lesson_authoring_event() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE lesson public.lessons%ROWTYPE; event_type text; title text; body text;
BEGIN
  IF NEW.action NOT IN ('unpublish', 'approve', 'publish', 'return') THEN RETURN NEW; END IF;
  SELECT * INTO lesson FROM public.lessons WHERE id = NEW.lesson_id;
  IF NOT FOUND OR lesson.created_by IS NULL OR lesson.created_by = NEW.actor_id THEN RETURN NEW; END IF;
  IF NEW.action = 'request_changes' THEN
    event_type := 'authoring_change'; title := 'Admin yêu cầu chỉnh sửa bài học'; body := coalesce(NEW.reason, '');
  ELSIF NEW.action = 'unpublish' THEN
    event_type := 'authoring_change'; title := 'Bài học của bạn đã bị gỡ xuất bản'; body := coalesce(NEW.reason, 'Bài học được chuyển về trạng thái đã duyệt.');
  ELSE
    event_type := 'authoring_change'; title := CASE NEW.action WHEN 'approve' THEN 'Bài học của bạn đã được duyệt' WHEN 'publish' THEN 'Bài học của bạn đã được xuất bản' ELSE 'Bài học của bạn cần được xem lại' END;
    body := coalesce(NEW.reason, '');
  END IF;
  PERFORM public.create_user_notification(
    lesson.created_by, event_type, 'lesson', lesson.id, title, body,
    '/content-manager/learning-content/lessons/' || lesson.id::text,
    NEW.actor_id, 'lesson-review:' || NEW.id::text
  );
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_lesson_authoring_event() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER lesson_authoring_notification
  AFTER INSERT ON public.lesson_review_events FOR EACH ROW EXECUTE FUNCTION public.notify_lesson_authoring_event();

CREATE OR REPLACE FUNCTION public.notify_question_authoring_event() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE question public.questions%ROWTYPE; event_title text; body text;
BEGIN
  IF NEW.action NOT IN ('rejected', 'unapproved', 'approved') THEN RETURN NEW; END IF;
  IF NEW.action IN ('rejected', 'unapproved') AND EXISTS
    (SELECT 1 FROM public.profiles WHERE id = NEW.actor_id AND role = 'admin') THEN RETURN NEW; END IF;
  SELECT * INTO question FROM public.questions WHERE id = NEW.question_id;
  IF NOT FOUND OR question.created_by IS NULL OR question.created_by = NEW.actor_id THEN RETURN NEW; END IF;
  event_title := CASE NEW.action WHEN 'approved' THEN 'Câu hỏi của bạn đã được duyệt' ELSE 'Câu hỏi của bạn đã được gỡ duyệt' END;
  body := coalesce(NEW.reason, '');
  PERFORM public.create_user_notification(
    question.created_by, 'authoring_change', 'question', question.id, event_title, body,
    '/content-manager/questions/editor?id=' || question.id::text,
    NEW.actor_id, 'question-review:' || NEW.id::text
  );
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_question_authoring_event() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER question_authoring_notification
  AFTER INSERT ON public.question_history FOR EACH ROW EXECUTE FUNCTION public.notify_question_authoring_event();

-- Publish events fan out only to learners who opted into that course.
CREATE OR REPLACE FUNCTION public.notify_followers_content_published() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE follow record; v_course_id uuid; target uuid; target_type text; title text; href text; content_key text; actor uuid; course_slug text;
BEGIN
  IF TG_TABLE_NAME = 'lessons' THEN
    IF NEW.status <> 'published' OR OLD.status = 'published' THEN RETURN NEW; END IF;
    SELECT c.id INTO v_course_id FROM public.chapters ch JOIN public.courses c ON c.id = ch.course_id WHERE ch.id = NEW.chapter_id;
    target := NEW.id; target_type := 'lesson'; title := NEW.title;
    course_slug := (SELECT c.slug FROM public.courses c WHERE c.id = v_course_id);
    href := '/learner/courses/' || course_slug || '/lessons/' || NEW.id::text;
    content_key := 'lesson-published:' || NEW.id::text || ':' || NEW.version::text;
    actor := NEW.updated_by;
  ELSIF TG_TABLE_NAME = 'quizzes' THEN
    IF NEW.is_active IS NOT TRUE OR OLD.is_active IS TRUE THEN RETURN NEW; END IF;
    v_course_id := NEW.course_id; target := NEW.id; target_type := 'quiz'; title := NEW.title;
    course_slug := (SELECT c.slug FROM public.courses c WHERE c.id = v_course_id);
    href := '/learner/courses/' || course_slug || '/tests/' || NEW.id::text;
    content_key := 'quiz-published:' || NEW.id::text || ':' || txid_current()::text;
    actor := NULL;
  ELSE
    RETURN NEW;
  END IF;
  FOR follow IN SELECT f.learner_id FROM public.user_course_follows f WHERE f.course_id = v_course_id LOOP
    PERFORM public.create_user_notification(
      follow.learner_id, 'content_published', target_type, target,
      'Nội dung mới trong khóa học: ' || title, title, href,
      actor, content_key || ':' || follow.learner_id::text,
      jsonb_build_object('course_id', v_course_id)
    );
  END LOOP;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_followers_content_published() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER lesson_published_followers_notification
  AFTER UPDATE OF status ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.notify_followers_content_published();
CREATE TRIGGER quiz_published_followers_notification
  AFTER UPDATE OF is_active ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.notify_followers_content_published();

CREATE OR REPLACE FUNCTION public.notify_followers_code_exercise_published() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE exercise public.code_exercises%ROWTYPE; lesson public.lessons%ROWTYPE; v_course_id uuid; course_slug text; follow record;
BEGIN
  IF NEW.published_revision_id IS NULL OR NEW.published_revision_id = OLD.published_revision_id THEN RETURN NEW; END IF;
  SELECT * INTO exercise FROM public.code_exercises WHERE id = NEW.id;
  SELECT * INTO lesson FROM public.lessons WHERE id = exercise.lesson_id;
  SELECT ch.course_id INTO v_course_id FROM public.chapters ch WHERE ch.id = lesson.chapter_id;
  SELECT c.slug INTO course_slug FROM public.courses c WHERE c.id = v_course_id;
  FOR follow IN SELECT f.learner_id FROM public.user_course_follows f WHERE f.course_id = v_course_id LOOP
    PERFORM public.create_user_notification(
      follow.learner_id, 'content_published', 'code_exercise', exercise.id,
      'Bài thực hành mới trong khóa học: ' || lesson.title, lesson.title,
      '/learner/code-exercises/' || exercise.id::text, NULL,
      'code-exercise-published:' || NEW.id::text || ':' || NEW.published_revision_id::text || ':' || follow.learner_id::text,
      jsonb_build_object('course_id', v_course_id, 'course_slug', course_slug)
    );
  END LOOP;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_followers_code_exercise_published() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER code_exercise_published_followers_notification
  AFTER UPDATE OF published_revision_id ON public.code_exercises FOR EACH ROW EXECUTE FUNCTION public.notify_followers_code_exercise_published();

NOTIFY pgrst, 'reload schema';
