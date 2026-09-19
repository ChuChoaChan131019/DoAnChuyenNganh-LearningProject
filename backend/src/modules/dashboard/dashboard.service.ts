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
}
