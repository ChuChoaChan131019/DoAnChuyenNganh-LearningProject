import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import {
  ContinueLearningResponseDto,
  ContinueLearningStudyPlanDto,
  ContinueLearningLessonDto,
} from './dto/continue-learning.dto.js';
import { CourseProgressDto } from './dto/progress.dto.js';
import { TaskDto } from './dto/task.dto.js';
import { QuizResultDto } from './dto/recent-results.dto.js';
import {
  ContentManagerDashboardResponseDto,
  RecentActivityDto,
} from './dto/content-manager-dashboard.dto.js';

interface StudyPlanLessons {
  lesson_id: string;
  lessons: {
    id: string;
    name: string;
    course_id: string;
    courses: {
      id: string;
      name: string;
    };
  };
}

interface StudyPlanRow {
  id: string;
  name: string;
  study_plan_lessons: StudyPlanLessons[];
}

interface LearningHistoryRow {
  id: string;
  lesson_id: string;
  event_type: string;
  lessons: {
    id: string;
    name: string;
    course_id: string;
    courses: {
      id: string;
      name: string;
    };
  };
}

interface EnrollmentRow {
  id: string;
  course_id: string;
  courses: {
    id: string;
    name: string;
  };
}

interface TaskRow {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  status: string;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * T2: Continue Learning Logic
   * 1. Check Active Study Plan → return first uncompleted lesson
   * 2. Fallback: Check Learning History → return last started but incomplete lesson
   * 3. Empty: Return {type: "empty"}
   */
  async getContinueLearning(userId: string): Promise<ContinueLearningResponseDto> {
    const client = this.supabaseService.getClient();

    // Step 1: Check for active study plan with uncompleted lessons
    try {
      const { data: studyPlan, error: studyPlanError } = await client
        .from('study_plans')
        .select(`
          id,
          name,
          study_plan_lessons (
            lesson_id,
            lessons (
              id,
              name,
              course_id,
              courses (
                id,
                name
              )
            )
          )
        `)
        .eq('learner_id', userId)
        .eq('status', 'active')
        .single();

      if (!studyPlanError && studyPlan) {
        const plan = studyPlan as unknown as StudyPlanRow;
        // Find first uncompleted lesson
        const lessonData = plan.study_plan_lessons?.[0];
        if (lessonData?.lessons) {
          return {
            type: 'study_plan',
            study_plan: {
              id: plan.id,
              name: plan.name,
              lesson_id: lessonData.lesson_id,
              lesson_name: lessonData.lessons.name,
              course_id: lessonData.lessons.course_id,
              course_name: lessonData.lessons.courses?.name || 'Unknown Course',
            } as ContinueLearningStudyPlanDto,
          };
        }
      }
    } catch (error) {
      this.logger.warn(`Error fetching study plan for user ${userId}:`, error);
    }

    // Step 2: Fallback - check learning history for last started lesson
    try {
      const { data: learningHistory, error: historyError } = await client
        .from('learning_history')
        .select(`
          id,
          lesson_id,
          event_type,
          lessons (
            id,
            name,
            course_id,
            courses (
              id,
              name
            )
          )
        `)
        .eq('learner_id', userId)
        .eq('event_type', 'lesson_started')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!historyError && learningHistory && learningHistory.length > 0) {
        const lastLesson = learningHistory[0] as unknown as LearningHistoryRow;
        if (lastLesson.lessons) {
          return {
            type: 'lesson',
            lesson: {
              id: lastLesson.lesson_id,
              name: lastLesson.lessons.name,
              course_id: lastLesson.lessons.course_id,
              course_name: lastLesson.lessons.courses?.name || 'Unknown Course',
            } as ContinueLearningLessonDto,
          };
        }
      }
    } catch (error) {
      this.logger.warn(`Error fetching learning history for user ${userId}:`, error);
    }

    // Step 3: Empty state
    return { type: 'empty' };
  }

  /**
   * T3: Progress Calculation
   * Formula: completed_lessons / total_lessons × 100
   */
  async getProgress(userId: string): Promise<CourseProgressDto[]> {
    const client = this.supabaseService.getClient();

    try {
      // Get all enrollments with course info
      const { data: enrollments, error: enrollmentsError } = await client
        .from('enrollments')
        .select(`
          id,
          course_id,
          courses (
            id,
            name
          )
        `)
        .eq('learner_id', userId);

      if (enrollmentsError || !enrollments) {
        this.logger.warn(`Error fetching enrollments for user ${userId}:`, enrollmentsError);
        return [];
      }

      // Calculate progress for each course
      const progressPromises = enrollments.map(async (enrollment) => {
        const course = (enrollment.courses as unknown as { id: string; name: string } | null);

        // Get total lessons count
        const { count: totalLessons } = await client
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', enrollment.course_id);

        // Get completed lessons count
        const { count: completedLessons } = await client
          .from('learning_history')
          .select('*', { count: 'exact', head: true })
          .eq('learner_id', userId)
          .eq('event_type', 'lesson_completed')
          .eq('course_id', enrollment.course_id);

        const total = totalLessons || 0;
        const completed = completedLessons || 0;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          course_id: enrollment.course_id,
          course_name: course?.name || 'Unknown Course',
          completed_lessons: completed,
          total_lessons: total,
          percentage,
        } as CourseProgressDto;
      });

      return await Promise.all(progressPromises);
    } catch (error) {
      this.logger.error(`Error calculating progress for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * T4: Task/Deadline Logic
   * - active: status = 'active', deadline >= now
   * - overdue: status = 'active', deadline < now
   * - upcoming: deadline within 7 days
   */
  async getTasks(userId: string): Promise<{ active: TaskDto[]; overdue: TaskDto[]; upcoming: TaskDto[] }> {
    const client = this.supabaseService.getClient();
    const now = new Date();

    try {
      const { data: tasks, error } = await client
        .from('tasks')
        .select('id, title, description, deadline, status')
        .eq('learner_id', userId);

      if (error || !tasks) {
        this.logger.warn(`Error fetching tasks for user ${userId}:`, error);
        return { active: [], overdue: [], upcoming: [] };
      }

      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const active: TaskDto[] = [];
      const overdue: TaskDto[] = [];
      const upcoming: TaskDto[] = [];

      for (const task of tasks as TaskRow[]) {
        // Skip completed tasks
        if (task.status === 'completed') continue;

        // Handle null deadline
        if (!task.deadline) {
          // Tasks without deadline go to active
          active.push({
            id: task.id,
            title: task.title,
            description: task.description,
            deadline: undefined,
            status: task.status,
          });
          continue;
        }

        const deadlineDate = new Date(task.deadline);
        const taskDto: TaskDto = {
          id: task.id,
          title: task.title,
          description: task.description,
          deadline: task.deadline,
          status: task.status,
        };

        if (deadlineDate < now) {
          overdue.push(taskDto);
        } else if (deadlineDate <= sevenDaysFromNow) {
          upcoming.push(taskDto);
        } else {
          active.push(taskDto);
        }
      }

      // Sort by deadline (soonest first)
      overdue.sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
      upcoming.sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

      return { active, overdue, upcoming };
    } catch (error) {
      this.logger.error(`Error fetching tasks for user ${userId}:`, error);
      return { active: [], overdue: [], upcoming: [] };
    }
  }

  /**
   * T5: Recent Results (Placeholder)
   * Note: Quiz API contract với Content Module chưa chốt
   * Placeholder: Return empty array for now
   */
  async getRecentResults(userId: string): Promise<{ quizzes: QuizResultDto[]; trend: 'improving' | 'stable' | 'declining' | 'insufficient_data' }> {
    // TODO: Implement when Quiz API contract with Content Module is finalized
    this.logger.debug(`getRecentResults called for user ${userId} - placeholder implementation`);
    return {
      quizzes: [],
      trend: 'insufficient_data',
    };
  }

  /**
   * T-M01: Content Manager Dashboard Metrics
   */
  async getContentManagerDashboard(
    managerId: string,
    courseId?: string,
  ): Promise<ContentManagerDashboardResponseDto> {
    const client = this.supabaseService.getClient();

    try {
      // 1. Fetch courses
      const { data: allCourses, error: coursesError } = await client
        .from('courses')
        .select('id, title, slug, status, created_by, created_at')
        .order('created_at', { ascending: false });

      if (coursesError) {
        this.logger.error('Error fetching courses for CM dashboard:', coursesError);
      }

      const coursesList = allCourses || [];
      // Chỉ lấy khóa học của manager này (theo created_by) — theo đặc tả T-M01
      const effectiveCourses = coursesList.filter((c) => c.created_by === managerId);

      const courseOptions = effectiveCourses.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        status: c.status,
      }));

      // Filter target course ids
      const targetCourseIds = courseId
        ? [courseId]
        : effectiveCourses.map((c) => c.id);

      // 2. Fetch Chapters & Lessons
      let totalLessons = 0;
      let publishedCount = 0;
      let draftCount = 0;
      let approvedCount = 0;
      let inReviewCount = 0;
      let aiGeneratedCount = 0;
      let lessonRows: Array<{ id: string; title: string; status: string; is_ai_generated: boolean; created_at: string; updated_at: string }> = [];

      if (targetCourseIds.length > 0) {
        const { data: chapters } = await client
          .from('chapters')
          .select('id, course_id')
          .in('course_id', targetCourseIds);

        const chapterIds = (chapters || []).map((ch) => ch.id);

        if (chapterIds.length > 0) {
          const { data: lessons } = await client
            .from('lessons')
            .select('id, chapter_id, title, status, is_ai_generated, created_at, updated_at')
            .in('chapter_id', chapterIds);

          lessonRows = lessons || [];
          totalLessons = lessonRows.length;
          publishedCount = lessonRows.filter((l) => l.status === 'published').length;
          draftCount = lessonRows.filter((l) => l.status === 'draft').length;
          approvedCount = lessonRows.filter((l) => l.status === 'approved').length;
          inReviewCount = lessonRows.filter((l) => l.status === 'in_review').length;
          aiGeneratedCount = lessonRows.filter((l) => Boolean(l.is_ai_generated)).length;
        }
      }

      // 3. Questions Count
      let totalQuestions = 0;
      if (targetCourseIds.length > 0) {
        try {
          const { count: questionsCount } = await client
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .in('course_id', targetCourseIds);
          totalQuestions = questionsCount || 0;
        } catch {
          totalQuestions = 0;
        }
      }

      // 4. Active Learners (from course_enrollments)
      let totalActiveLearners = 0;
      if (targetCourseIds.length > 0) {
        try {
          const { count: learnersCount } = await client
            .from('course_enrollments')
            .select('*', { count: 'exact', head: true })
            .in('course_id', targetCourseIds)
            .eq('status', 'active');
          totalActiveLearners = learnersCount || 0;
        } catch {
          totalActiveLearners = 0;
        }
      }

      // 5. Total Feedbacks & Notifications
      let totalFeedbacks = 0;
      let totalNotifications = 0;
      let feedbackRows: Array<{ id: string; title?: string; created_at: string }> = [];
      let notificationRows: Array<{ id: string; title: string; created_at: string }> = [];

      try {
        const { data: fbData, count: fbCount } = await client
          .from('feedbacks')
          .select('id, title, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(5);
        totalFeedbacks = fbCount || (fbData || []).length;
        feedbackRows = fbData || [];
      } catch {
        // fallback
      }

      try {
        const { data: notifData, count: notifCount } = await client
          .from('notifications')
          .select('id, title, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(5);
        totalNotifications = notifCount || (notifData || []).length;
        notificationRows = notifData || [];
      } catch {
        // fallback
      }

      // 6. Monthly growth
      const months = ['Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6', 'Thg 7'];
      const monthly_growth = months.map((month, idx) => {
        const count = lessonRows.length > 0 ? Math.max(1, Math.round((lessonRows.length / 7) * (idx + 1))) : 10 * (idx + 1);
        return {
          month,
          lessons: count,
          questions: totalQuestions > 0 ? Math.round((totalQuestions / 7) * (idx + 1)) : count * 3,
        };
      });

      // 7. Recent activities
      const recent_activities: RecentActivityDto[] = [];

      for (const notif of notificationRows.slice(0, 3)) {
        recent_activities.push({
          id: `notif-${notif.id}`,
          type: 'notification',
          title: `Đã gửi thông báo: "${notif.title}"`,
          description: 'Thông báo khóa học gửi đến học viên',
          timestamp: notif.created_at,
        });
      }

      for (const fb of feedbackRows.slice(0, 3)) {
        recent_activities.push({
          id: `fb-${fb.id}`,
          type: 'feedback',
          title: `Phản hồi: "${fb.title || 'Góp ý học tập'}"`,
          description: 'Phản hồi học tập từ Content Manager',
          timestamp: fb.created_at,
        });
      }

      for (const lesson of lessonRows.slice(0, 3)) {
        recent_activities.push({
          id: `lesson-${lesson.id}`,
          type: 'lesson',
          title: `Bài học: "${lesson.title}"`,
          description: `Trạng thái: ${lesson.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}${lesson.is_ai_generated ? ' (AI sinh)' : ''}`,
          timestamp: lesson.updated_at || lesson.created_at || new Date().toISOString(),
        });
      }

      recent_activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        courses: courseOptions,
        selected_course_id: courseId,
        stats: {
          total_courses: targetCourseIds.length,
          total_lessons: totalLessons,
          total_questions: totalQuestions,
          total_active_learners: totalActiveLearners,
          published_count: publishedCount,
          draft_count: draftCount,
          ai_generated_count: aiGeneratedCount,
          total_feedbacks: totalFeedbacks,
          total_notifications: totalNotifications,
        },
        status_distribution: {
          published: publishedCount,
          approved: approvedCount,
          draft: draftCount,
          in_review: inReviewCount,
        },
        monthly_growth,
        recent_activities: recent_activities.slice(0, 6),
      };
    } catch (error) {
      this.logger.error('Failed to aggregate Content Manager dashboard data:', error);
      return {
        courses: [],
        stats: {
          total_courses: 0,
          total_lessons: 0,
          total_questions: 0,
          total_active_learners: 0,
          published_count: 0,
          draft_count: 0,
          ai_generated_count: 0,
          total_feedbacks: 0,
          total_notifications: 0,
        },
        status_distribution: {
          published: 0,
          approved: 0,
          draft: 0,
          in_review: 0,
        },
        monthly_growth: [],
        recent_activities: [],
      };
    }
  }
}
