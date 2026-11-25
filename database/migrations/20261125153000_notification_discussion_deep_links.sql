-- Moderation and report-result notices should open the relevant discussion.
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

CREATE OR REPLACE FUNCTION public.notify_discussion_report_event() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE target uuid; kind text; title text; excerpt text; admin_id uuid; discussion_href text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    target := coalesce(NEW.post_id, NEW.comment_id);
    kind := CASE WHEN NEW.post_id IS NOT NULL THEN 'post' ELSE 'comment' END;
    SELECT p.title, CASE WHEN NEW.post_id IS NOT NULL THEN p.content ELSE c.content END
      INTO title, excerpt
      FROM public.discussion_posts p
      LEFT JOIN public.discussion_comments c ON c.id = NEW.comment_id
      WHERE p.id = coalesce(NEW.post_id, c.post_id);
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
  PERFORM public.create_user_notification(
    NEW.reporter_id, 'report_resolved', 'report', NEW.id,
    CASE NEW.status WHEN 'dismissed' THEN 'Báo cáo đã được xem xét' WHEN 'hidden' THEN 'Báo cáo đã được xử lý' ELSE 'Nội dung đã được gỡ sau khi xem xét' END,
    'Kết quả: ' || NEW.status || E'\nLý do: ' || coalesce(NEW.moderator_reason, ''),
    coalesce(discussion_href, '/learner/discussions'), NEW.moderator_id,
    'discussion-report:resolved:' || NEW.id::text,
    jsonb_build_object('target_type', kind, 'target_id', target, 'decision', NEW.status)
  );
  RETURN NEW;
END $$;

ALTER FUNCTION public.create_user_notification(uuid,text,text,uuid,text,text,text,uuid,text,jsonb,timestamptz) SECURITY INVOKER;
ALTER FUNCTION public.notify_discussion_reply() SECURITY INVOKER;
ALTER FUNCTION public.notify_lesson_authoring_event() SECURITY INVOKER;
ALTER FUNCTION public.notify_question_authoring_event() SECURITY INVOKER;
ALTER FUNCTION public.notify_followers_content_published() SECURITY INVOKER;
ALTER FUNCTION public.notify_followers_code_exercise_published() SECURITY INVOKER;

-- Keep local identifiers distinct from table columns used by trigger queries.
CREATE OR REPLACE FUNCTION public.notify_followers_content_published() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE follow record; v_course_id uuid; target uuid; target_type text; title text; href text; content_key text; actor uuid; course_slug text;
BEGIN
  IF TG_TABLE_NAME = 'lessons' THEN
    IF NEW.status <> 'published' OR OLD.status = 'published' THEN RETURN NEW; END IF;
    SELECT c.id INTO v_course_id FROM public.chapters ch JOIN public.courses c ON c.id = ch.course_id WHERE ch.id = NEW.chapter_id;
    target := NEW.id; target_type := 'lesson'; title := NEW.title;
    SELECT c.slug INTO course_slug FROM public.courses c WHERE c.id = v_course_id;
    href := '/learner/courses/' || course_slug || '/lessons/' || NEW.id::text;
    content_key := 'lesson-published:' || NEW.id::text || ':' || NEW.version::text;
    actor := NEW.updated_by;
  ELSIF TG_TABLE_NAME = 'quizzes' THEN
    IF NEW.is_active IS NOT TRUE OR OLD.is_active IS TRUE THEN RETURN NEW; END IF;
    v_course_id := NEW.course_id; target := NEW.id; target_type := 'quiz'; title := NEW.title;
    SELECT c.slug INTO course_slug FROM public.courses c WHERE c.id = v_course_id;
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

NOTIFY pgrst, 'reload schema';
