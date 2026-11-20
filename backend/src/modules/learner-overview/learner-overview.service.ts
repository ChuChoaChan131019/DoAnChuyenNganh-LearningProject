import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../config/supabase.service.js';

type CourseRow = {
  id: string;
  title: string;
  slug: string;
};

type ChapterRow = {
  id: string;
  course_id: string;
  order_index: number;
};

type LessonRow = {
  id: string;
  chapter_id: string;
  title: string;
  order_index: number;
  counts_toward_progress: boolean;
};

type QuizRow = {
  id: string;
  course_id: string;
  chapter_id: string | null;
  title: string;
  counts_toward_progress: boolean;
};

type ExerciseRow = {
  id: string;
  lesson_id: string;
  published_revision_id: string;
};

type LessonProgressRow = {
  lesson_id: string;
  last_opened_at: string;
  completed_at: string | null;
};

type QuizAttemptRow = {
  quiz_id: string;
  started_at: string;
  completed_at: string | null;
  is_passed: boolean;
};

type CodeProgressRow = {
  exercise_id: string;
  completed_revision_id: string | null;
  updated_at: string;
};

type UnitKind = 'lesson' | 'quiz' | 'code';

export type ContinueItem = {
  kind: UnitKind;
  title: string;
  course_title: string;
  course_slug: string;
  href: string;
  last_activity_at: string | null;
};

type Unit = ContinueItem & {
  id: string;
  completed: boolean;
  counts_toward_progress: boolean;
};

type PagedQuery<T> = {
  range(
    from: number,
    to: number,
  ): PromiseLike<{
    data: T[] | null;
    error: unknown;
  }>;
};

type Count = {
  completed: number;
  total: number;
};

export type CourseOverview = {
  id: string;
  title: string;
  slug: string;
  started: boolean;
  completed_units: number;
  total_units: number;
  percentage: number;
  lessons: Count;
  quizzes: Count;
  code: Count;
  completed_lesson_ids: string[];
  last_activity_at: string | null;
  next: ContinueItem | null;
};

function newer(
  current: string | null,
  candidate: string | null | undefined,
): string | null {
  if (!candidate) return current;
  if (!current) return candidate;

  return Date.parse(candidate) > Date.parse(current) ? candidate : current;
}

function percentage(done: number, total: number): number {
  if (total === 0) return 0;

  return Math.round((done / total) * 100);
}

function toContinue(unit: Unit): ContinueItem {
  return {
    kind: unit.kind,
    title: unit.title,
    course_title: unit.course_title,
    course_slug: unit.course_slug,
    href: unit.href,
    last_activity_at: unit.last_activity_at,
  };
}

@Injectable()
export class LearnerOverviewService {
  constructor(private readonly supabase: SupabaseService) {}

  private async readAll<T>(
    build: () => PagedQuery<T>,
    message: string,
  ): Promise<T[]> {
    const rows: T[] = [];
    for (;;) {
      const { data, error } = await build().range(
        rows.length,
        rows.length + 499,
      );
      if (error) throw new InternalServerErrorException(message);
      if (!data?.length) return rows;
      rows.push(...data);
      // Đọc đến trang rỗng; không giả định giới hạn Data API bằng cỡ trang.
    }
  }

  private async readByIds<T>(
    ids: string[],
    build: (batch: string[]) => PagedQuery<T>,
    message: string,
  ): Promise<T[]> {
    const rows: T[] = [];
    // Tránh URL quá dài khi dùng .in() với nhiều UUID.
    for (let offset = 0; offset < ids.length; offset += 100) {
      const batch = ids.slice(offset, offset + 100);
      rows.push(...(await this.readAll(() => build(batch), message)));
    }
    return rows;
  }

  async recordLesson(
    learnerId: string,
    lessonId: string,
    action: 'view' | 'complete',
  ) {
    const { data, error } = await this.supabase
      .getClient()
      .rpc('record_learner_lesson_activity', {
        p_actor_id: learnerId,
        p_lesson_id: lessonId,
        p_complete: action === 'complete',
      });

    if (error) {
      if (error.code === 'P0002') {
        throw new NotFoundException('Bài học không khả dụng');
      }

      if (error.code === '42501') {
        throw new ForbiddenException('Không có quyền cập nhật tiến độ');
      }

      throw new InternalServerErrorException('Không thể lưu tiến độ bài học');
    }

    return data;
  }

  async getOverview(learnerId: string) {
    const db = this.supabase.getClient();

    // 1. Chỉ lấy khóa học đang xuất bản.
    const courses = await this.readAll<CourseRow>(
      () =>
        db
          .from('courses')
          .select('id, title, slug')
          .eq('status', 'published')
          .order('title', { ascending: true })
          .order('id'),
      'Không thể tải khóa học',
    );
    const courseIds = courses.map((c) => c.id);

    if (!courses.length) {
      return this.emptyOverview();
    }

    // 2. Chỉ lấy chương đã xuất bản.
    const chapters = await this.readByIds<ChapterRow>(
      courseIds,
      (batch) =>
        db
          .from('chapters')
          .select('id, course_id, order_index')
          .in('course_id', batch)
          .eq('status', 'published')
          .order('order_index', { ascending: true })
          .order('id'),
      'Không thể tải chương học',
    );
    chapters.sort(
      (a, b) => a.order_index - b.order_index || a.id.localeCompare(b.id),
    );

    const chapterIds = chapters.map((c) => c.id);

    // 3. Lấy lesson, quiz đang hoạt động.
    const lessons = await this.readByIds<LessonRow>(
      chapterIds,
      (batch) =>
        db
          .from('lessons')
          .select('id, chapter_id, title, order_index, counts_toward_progress')
          .in('chapter_id', batch)
          .eq('status', 'published')
          .order('order_index', { ascending: true })
          .order('id'),
      'Không thể tải bài học',
    );
    lessons.sort(
      (a, b) => a.order_index - b.order_index || a.id.localeCompare(b.id),
    );

    const quizRows = await this.readByIds<QuizRow>(
      courseIds,
      (batch) =>
        db
          .from('quizzes')
          .select('id, course_id, chapter_id, title, counts_toward_progress')
          .in('course_id', batch)
          .eq('is_active', true)
          .order('id'),
      'Không thể tải bài kiểm tra',
    );

    // Quiz gắn với chương chỉ hợp lệ nếu chương
    // đó đang xuất bản và thuộc đúng khóa học.
    const publishedChapterIds = new Set(chapterIds);
    const chapterCourse = new Map(chapters.map((c) => [c.id, c.course_id]));

    const quizzes = quizRows.filter(
      (q) =>
        !q.chapter_id ||
        (publishedChapterIds.has(q.chapter_id) &&
          chapterCourse.get(q.chapter_id) === q.course_id),
    );

    const lessonIds = lessons.map((l) => l.id);
    const quizIds = quizzes.map((q) => q.id);

    // 4. Lấy bài code có published revision.
    const exerciseCandidates = await this.readByIds<ExerciseRow>(
      lessonIds,
      (batch) =>
        db
          .from('code_exercises')
          .select('id, lesson_id, published_revision_id')
          .in('lesson_id', batch)
          .is('archived_at', null)
          .not('published_revision_id', 'is', null)
          .order('id'),
      'Không thể tải bài thực hành C#',
    );

    // Xác nhận revision được trỏ tới thực sự
    // có trạng thái published.
    const revisionIds = exerciseCandidates.map((e) => e.published_revision_id);

    const revisions = await this.readByIds<{ id: string; title: string }>(
      revisionIds,
      (batch) =>
        db
          .from('code_exercise_revisions')
          .select('id, title')
          .in('id', batch)
          .eq('status', 'published')
          .order('id'),
      'Không thể tải phiên bản bài code',
    );

    const revisionTitle = new Map(revisions.map((r) => [r.id, r.title]));

    const exercises = exerciseCandidates.filter((e) =>
      revisionTitle.has(e.published_revision_id),
    );

    const exerciseIds = exercises.map((e) => e.id);

    // 5. Lấy tiến độ CHỈ CỦA học viên đăng nhập.
    const lessonProgressRows = await this.readByIds<LessonProgressRow>(
      lessonIds,
      (batch) =>
        db
          .from('learner_lesson_progress')
          .select('lesson_id, last_opened_at, completed_at')
          .eq('learner_id', learnerId)
          .in('lesson_id', batch)
          .order('lesson_id'),
      'Không thể tải tiến độ bài học',
    );

    const quizProgressRows = await this.readByIds<QuizAttemptRow>(
      quizIds,
      (batch) =>
        db
          .from('quiz_attempts')
          .select('quiz_id, started_at, completed_at, is_passed')
          .eq('user_id', learnerId)
          .in('quiz_id', batch)
          .order('id'),
      'Không thể tải tiến độ bài kiểm tra',
    );

    const codeProgressRows = await this.readByIds<CodeProgressRow>(
      exerciseIds,
      (batch) =>
        db
          .from('code_exercise_progress')
          .select('exercise_id, completed_revision_id, updated_at')
          .eq('learner_id', learnerId)
          .in('exercise_id', batch)
          .order('exercise_id'),
      'Không thể tải tiến độ bài code',
    );

    const lessonProgress = new Map(
      lessonProgressRows.map((p) => [p.lesson_id, p]),
    );

    const codeProgress = new Map(
      codeProgressRows.map((p) => [p.exercise_id, p]),
    );

    // Một quiz đạt nếu có ít nhất một attempt
    // đã nộp và is_passed = true.
    const quizProgress = new Map<
      string,
      { passed: boolean; last_at: string | null }
    >();

    for (const attempt of quizProgressRows) {
      const previous = quizProgress.get(attempt.quiz_id);

      quizProgress.set(attempt.quiz_id, {
        passed:
          Boolean(previous?.passed) ||
          Boolean(attempt.completed_at && attempt.is_passed),
        last_at: newer(
          previous?.last_at ?? null,
          attempt.completed_at ?? attempt.started_at,
        ),
      });
    }

    const coursesOverview: CourseOverview[] = [];

    // 6. Tính theo từng khóa học.
    for (const course of courses) {
      const courseChapters = chapters.filter((c) => c.course_id === course.id);

      const courseQuizzes = quizzes.filter((q) => q.course_id === course.id);

      const units: Unit[] = [];

      // Lesson và bài code được đặt cạnh nhau
      // theo thứ tự chương -> bài học.
      for (const chapter of courseChapters) {
        const chapterLessons = lessons.filter(
          (l) => l.chapter_id === chapter.id,
        );

        for (const lesson of chapterLessons) {
          const progress = lessonProgress.get(lesson.id);

          units.push({
            id: lesson.id,
            kind: 'lesson',
            counts_toward_progress: lesson.counts_toward_progress !== false,
            title: lesson.title,
            course_title: course.title,
            course_slug: course.slug,
            href:
              `/learner/courses/${encodeURIComponent(course.slug)}` +
              `/lessons/${encodeURIComponent(lesson.id)}`,
            completed: Boolean(progress?.completed_at),
            last_activity_at: progress?.last_opened_at ?? null,
          });

          for (const exercise of exercises.filter(
            (e) => e.lesson_id === lesson.id,
          )) {
            const code = codeProgress.get(exercise.id);

            units.push({
              id: exercise.id,
              kind: 'code',
              counts_toward_progress: true,
              title:
                revisionTitle.get(exercise.published_revision_id) ??
                'Bài thực hành C#',
              course_title: course.title,
              course_slug: course.slug,
              href:
                '/learner/code-exercises/' + encodeURIComponent(exercise.id),
              completed:
                code?.completed_revision_id === exercise.published_revision_id,
              last_activity_at: code?.updated_at ?? null,
            });
          }
        }

        // Quiz của chương được xếp sau các lesson
        // và bài code trong chương đó.
        for (const quiz of courseQuizzes.filter(
          (q) => q.chapter_id === chapter.id,
        )) {
          const progress = quizProgress.get(quiz.id);

          units.push({
            id: quiz.id,
            kind: 'quiz',
            counts_toward_progress: quiz.counts_toward_progress !== false,
            title: quiz.title,
            course_title: course.title,
            course_slug: course.slug,
            href:
              `/learner/courses/${encodeURIComponent(course.slug)}` +
              `/tests/${encodeURIComponent(quiz.id)}/take`,
            completed: progress?.passed ?? false,
            last_activity_at: progress?.last_at ?? null,
          });
        }
      }

      // Quiz toàn khóa không gắn chương.
      for (const quiz of courseQuizzes.filter((q) => !q.chapter_id)) {
        const progress = quizProgress.get(quiz.id);

        units.push({
          id: quiz.id,
          kind: 'quiz',
          counts_toward_progress: quiz.counts_toward_progress !== false,
          title: quiz.title,
          course_title: course.title,
          course_slug: course.slug,
          href:
            `/learner/courses/${encodeURIComponent(course.slug)}` +
            `/tests/${encodeURIComponent(quiz.id)}/take`,
          completed: progress?.passed ?? false,
          last_activity_at: progress?.last_at ?? null,
        });
      }

      const countedUnits = units.filter((unit) => unit.counts_toward_progress);

      const count = (kind: UnitKind): Count => {
        const selected = countedUnits.filter((u) => u.kind === kind);

        return {
          completed: selected.filter((u) => u.completed).length,
          total: selected.length,
        };
      };

      const completedUnits = countedUnits.filter((u) => u.completed).length;

      let lastActivity: string | null = null;

      for (const unit of units) {
        lastActivity = newer(lastActivity, unit.last_activity_at);
      }

      // Dùng cùng lựa chọn cho trang khóa học và dashboard. Lesson/quiz
      // không tính phần trăm vẫn có thể là hoạt động đang học dở.
      const recentUnfinished = units
        .filter((unit) => !unit.completed && unit.last_activity_at !== null)
        .sort(
          (a, b) =>
            Date.parse(b.last_activity_at!) - Date.parse(a.last_activity_at!),
        )[0];
      const nextUnit =
        recentUnfinished ??
        countedUnits.find((unit) => !unit.completed) ??
        null;

      // Trạng thái hoàn thành lesson để cập nhật
      // giao diện mục lục khóa học.
      const completedLessonIds = lessons
        .filter((l) => courseChapters.some((c) => c.id === l.chapter_id))
        .filter((l) => Boolean(lessonProgress.get(l.id)?.completed_at))
        .map((l) => l.id);

      coursesOverview.push({
        id: course.id,
        title: course.title,
        slug: course.slug,
        started: lastActivity !== null,
        completed_units: completedUnits,
        total_units: countedUnits.length,
        percentage: percentage(completedUnits, countedUnits.length),
        lessons: count('lesson'),
        quizzes: count('quiz'),
        code: count('code'),
        completed_lesson_ids: completedLessonIds,
        last_activity_at: lastActivity,
        next: nextUnit ? toContinue(nextUnit) : null,
      });
    }

    // 7. Chọn khóa học có hoạt động gần nhất
    // và còn đơn vị học tập chưa hoàn thành.
    const startedCourses = coursesOverview
      .filter((course) => course.started && course.next)
      .sort(
        (a, b) =>
          Date.parse(b.last_activity_at ?? '') -
          Date.parse(a.last_activity_at ?? ''),
      );

    const selectedCourse = startedCourses[0] ?? null;

    const continueLearning = selectedCourse?.next ?? null;

    const totals = {
      lessons: { completed: 0, total: 0 },
      quizzes: { completed: 0, total: 0 },
      code: { completed: 0, total: 0 },
    };

    for (const course of coursesOverview) {
      for (const kind of ['lessons', 'quizzes', 'code'] as const) {
        totals[kind].completed += course[kind].completed;
        totals[kind].total += course[kind].total;
      }
    }

    const completed =
      totals.lessons.completed +
      totals.quizzes.completed +
      totals.code.completed;

    const total =
      totals.lessons.total + totals.quizzes.total + totals.code.total;

    return {
      summary: {
        started_courses: coursesOverview.filter((c) => c.started).length,
        completed_courses: coursesOverview.filter(
          (c) =>
            c.started &&
            c.total_units > 0 &&
            c.completed_units === c.total_units,
        ).length,
        completed_units: completed,
        total_units: total,
        percentage: percentage(completed, total),
        ...totals,
      },
      continue_learning: continueLearning,
      courses: coursesOverview,
    };
  }

  private emptyOverview() {
    return {
      summary: {
        started_courses: 0,
        completed_courses: 0,
        completed_units: 0,
        total_units: 0,
        percentage: 0,
        lessons: { completed: 0, total: 0 },
        quizzes: { completed: 0, total: 0 },
        code: { completed: 0, total: 0 },
      },
      continue_learning: null,
      courses: [] as CourseOverview[],
    };
  }
}
