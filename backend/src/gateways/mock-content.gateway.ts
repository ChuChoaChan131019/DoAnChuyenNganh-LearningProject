import { Injectable, Logger } from '@nestjs/common';
import { ContentGateway } from './content.gateway.js';

@Injectable()
export class MockContentGateway extends ContentGateway {
  private readonly logger = new Logger(MockContentGateway.name);

  private async simulateDelay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 100));
  }

  async getCourse(courseId: string): Promise<any> {
    await this.simulateDelay();
    this.logger.debug(`[Mock] getCourse: ${courseId}`);
    return {
      id: courseId,
      title: 'JavaScript Fundamentals',
      description: 'Khóa học lập trình JavaScript từ cơ bản đến nâng cao',
      status: 'active',
      created_by: 'mock-manager-id',
      total_lessons: 12,
      chapters: [
        { id: 'ch-1', title: 'Giới thiệu JavaScript', order: 1, lessons_count: 3 },
        { id: 'ch-2', title: 'Biến và Kiểu dữ liệu', order: 2, lessons_count: 4 },
        { id: 'ch-3', title: 'Hàm và Scope', order: 3, lessons_count: 5 },
      ],
    };
  }

  async getCourseStructure(courseId: string): Promise<any> {
    await this.simulateDelay();
    this.logger.debug(`[Mock] getCourseStructure: ${courseId}`);
    return {
      course_id: courseId,
      chapters: [
        {
          id: 'ch-1', title: 'Giới thiệu JavaScript', order: 1,
          lessons: [
            { id: 'ls-1', title: 'JavaScript là gì?', order: 1 },
            { id: 'ls-2', title: 'Cài đặt môi trường', order: 2 },
            { id: 'ls-3', title: 'Hello World', order: 3 },
          ],
        },
      ],
    };
  }

  async getCoursesByCreator(creatorId: string): Promise<any[]> {
    await this.simulateDelay();
    this.logger.debug(`[Mock] getCoursesByCreator: ${creatorId}`);
    return [
      { id: 'course-1', title: 'JavaScript Fundamentals', status: 'active' },
      { id: 'course-2', title: 'React Basics', status: 'active' },
    ];
  }

  async getLesson(lessonId: string): Promise<any> {
    await this.simulateDelay();
    this.logger.debug(`[Mock] getLesson: ${lessonId}`);
    return {
      id: lessonId,
      title: 'JavaScript là gì?',
      content: 'JavaScript là ngôn ngữ lập trình phổ biến nhất...',
      chapter_id: 'ch-1',
      order: 1,
    };
  }

  async getMaterial(materialId: string): Promise<any> {
    await this.simulateDelay();
    this.logger.debug(`[Mock] getMaterial: ${materialId}`);
    return {
      id: materialId,
      title: 'Tài liệu tham khảo JS',
      type: 'pdf',
      url: 'https://example.com/js-guide.pdf',
    };
  }

  async getCourseQuizzes(courseId: string): Promise<any[]> {
    await this.simulateDelay();
    this.logger.debug(`[Mock] getCourseQuizzes: ${courseId}`);
    return [
      { id: 'quiz-1', title: 'Quiz: Biến và Kiểu dữ liệu', type: 'practice', questions_count: 10 },
      { id: 'quiz-2', title: 'Bài kiểm tra giữa kỳ', type: 'exam', questions_count: 20 },
    ];
  }

  async getLatestQuizResult(learnerId: string, courseId: string): Promise<any> {
    await this.simulateDelay();
    this.logger.debug(`[Mock] getLatestQuizResult: ${learnerId}, ${courseId}`);
    return {
      quiz_id: 'quiz-1',
      score: 85,
      total: 100,
      passed: true,
      completed_at: new Date().toISOString(),
    };
  }

  async getQuizAttempts(learnerId: string, courseId: string): Promise<any[]> {
    await this.simulateDelay();
    this.logger.debug(`[Mock] getQuizAttempts: ${learnerId}, ${courseId}`);
    return [
      { id: 'attempt-1', quiz_id: 'quiz-1', score: 70, completed_at: '2024-01-15T10:00:00Z' },
      { id: 'attempt-2', quiz_id: 'quiz-1', score: 85, completed_at: '2024-01-20T14:00:00Z' },
    ];
  }
}
