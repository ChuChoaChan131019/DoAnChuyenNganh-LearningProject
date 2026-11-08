import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../../config/supabase.service.js';

type ContentStatus = 'draft' | 'approved' | 'published';

interface CountFilters {
  status?: ContentStatus;
  aiOnly?: boolean;
  sharedOnly?: boolean;
  from?: string;
  to?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  level?: 'beginner' | 'intermediate' | 'advanced';
}

@Injectable()
export class StatisticsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // Đếm bản ghi trực tiếp từ database.
  private async countRows(
    db: SupabaseClient,
    table: string,
    filters: CountFilters = {},
  ): Promise<number> {
    let query = db.from(table).select('id', { count: 'exact', head: true });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.aiOnly) {
      query = query.eq('is_ai_generated', true);
    }

    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }

    if (filters.level) {
      // Database values are lowercase; also support older title-case values.
      const titleCase = filters.level[0].toUpperCase() + filters.level.slice(1);
      query = query.in('level', [filters.level, titleCase]);
    }

    // Không tính câu hỏi AI riêng của Learner.
    if (filters.sharedOnly) {
      query = query.is('generated_for_user_id', null);
    }

    if (filters.from) {
      query = query.gte('created_at', filters.from);
    }

    if (filters.to) {
      query = query.lt('created_at', filters.to);
    }

    const { count, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `Không thể thống kê bảng ${table}`,
      );
    }

    return count ?? 0;
  }

  // Đếm trạng thái của khóa học, chương, bài học.
  private async getContentStatuses(db: SupabaseClient) {
    const tables = ['courses', 'chapters', 'lessons'];
    const statuses: ContentStatus[] = ['draft', 'approved', 'published'];

    const counts = await Promise.all(
      statuses.map(async (status) => {
        const values = await Promise.all(
          tables.map((table) => this.countRows(db, table, { status })),
        );

        return values.reduce((sum, value) => sum + value, 0);
      }),
    );

    return {
      draft: counts[0],
      approved: counts[1],
      published: counts[2],
    };
  }

  // Lấy ranh giới tháng theo giờ Việt Nam (UTC+7).
  private monthStart(year: number, month: number): string {
    return new Date(Date.UTC(year, month, 1, -7)).toISOString();
  }

  private async getQuestionDifficulty(db: SupabaseClient) {
    const [easy, medium, hard] = await Promise.all(
      (['easy', 'medium', 'hard'] as const).map((difficulty) =>
        this.countRows(db, 'questions', { difficulty, sharedOnly: true }),
      ),
    );
    return { easy, medium, hard };
  }

  private async getCourseLevels(db: SupabaseClient) {
    const [beginner, intermediate, advanced] = await Promise.all(
      (['beginner', 'intermediate', 'advanced'] as const).map((level) =>
        this.countRows(db, 'courses', { level }),
      ),
    );
    return { beginner, intermediate, advanced };
  }

  // Thống kê số nội dung được tạo trong 6 tháng.
  private async getMonthlyGrowth(db: SupabaseClient) {
    const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);

    return Promise.all(
      Array.from({ length: 6 }, async (_, index) => {
        const date = new Date(
          Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth() - 5 + index, 1),
        );

        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();

        const from = this.monthStart(year, month);
        const to = this.monthStart(year, month + 1);

        const [courses, lessons, questions, aiQuestions] = await Promise.all([
          this.countRows(db, 'courses', { from, to }),
          this.countRows(db, 'lessons', { from, to }),
          this.countRows(db, 'questions', {
            from,
            to,
            sharedOnly: true,
          }),
          this.countRows(db, 'questions', {
            from,
            to,
            sharedOnly: true,
            aiOnly: true,
          }),
        ]);

        return {
          month: `${String(month + 1).padStart(2, '0')}/${year}`,
          courses,
          lessons,
          questions,
          aiQuestions,
          manualQuestions: questions - aiQuestions,
        };
      }),
    );
  }

  // API chính của Dashboard Content Manager.
  async getContentManagerDashboard() {
    const db = this.supabaseService.getClient();

    const [
      totalCourses,
      totalLessons,
      totalQuestions,
      aiLessons,
      aiQuestions,
      status,
      growth,
      questionDifficulty,
      courseLevels,
    ] = await Promise.all([
      this.countRows(db, 'courses'),
      this.countRows(db, 'lessons'),
      this.countRows(db, 'questions', {
        sharedOnly: true,
      }),
      this.countRows(db, 'lessons', {
        aiOnly: true,
      }),
      this.countRows(db, 'questions', {
        aiOnly: true,
        sharedOnly: true,
      }),
      this.getContentStatuses(db),
      this.getMonthlyGrowth(db),
      this.getQuestionDifficulty(db),
      this.getCourseLevels(db),
    ]);

    return {
      overview: {
        totalCourses,
        totalLessons,
        totalQuestions,
        totalAiGenerated: aiLessons + aiQuestions,
        aiLessons,
        aiQuestions,
      },
      status,
      growth,
      questionDifficulty,
      courseLevels,
    };
  }
}
