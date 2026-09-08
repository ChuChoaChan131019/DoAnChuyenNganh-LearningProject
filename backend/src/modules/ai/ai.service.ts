import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openAiApiKey: string;
  private readonly qwenApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.openAiApiKey =
      this.configService.get<string>('OPENAI_API_KEY') || '';
    this.qwenApiKey =
      this.configService.get<string>('QWEN_API_KEY') || '';

    if (!this.openAiApiKey && !this.qwenApiKey) {
      this.logger.warn(
        '⚠️ OPENAI_API_KEY / QWEN_API_KEY chưa được cấu hình. Các tính năng AI sẽ sử dụng quy tắc fallback (Rule-based).',
      );
    }
  }

  isOpenAiConfigured(): boolean {
    return Boolean(this.openAiApiKey && !this.openAiApiKey.includes('your-openai-api-key'));
  }

  isQwenConfigured(): boolean {
    return Boolean(this.qwenApiKey && !this.qwenApiKey.includes('your-qwen-api-key'));
  }

  /**
   * L-A01: Đề xuất kế hoạch học tập (AI Learning Plan)
   */
  async generateLearningPlanSuggestion(params: {
    courseId: string;
    goal: string;
    availableDays: number[];
    sessionDurationMinutes: number;
  }): Promise<any> {
    this.logger.log(`Generating AI learning plan for course: ${params.courseId}`);
    // Mock response khi chưa có API key thực tế
    return {
      suggested_sessions_per_week: params.availableDays.length,
      estimated_weeks: 4,
      pace: 'moderate',
      message: 'Kế hoạch học tập tối ưu được AI đề xuất dựa trên quỹ thời gian của bạn.',
    };
  }

  /**
   * L-A02: Cá nhân hóa lộ trình học tập (Personalized Learning Ranking)
   */
  async rankRecommendations(candidateLessons: any[]): Promise<any[]> {
    return candidateLessons;
  }

  /**
   * L-A03: Đề xuất độ khó thích ứng (Adaptive Learning)
   */
  async recommendDifficulty(recentAverageScore: number): Promise<'easy' | 'medium' | 'hard'> {
    if (recentAverageScore < 50) return 'easy';
    if (recentAverageScore >= 80) return 'hard';
    return 'medium';
  }
}
