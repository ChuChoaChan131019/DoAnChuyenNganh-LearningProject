import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContentGateway } from './content.gateway.js';

@Injectable()
export class HttpContentGateway extends ContentGateway {
  private readonly logger = new Logger(HttpContentGateway.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.baseUrl = this.configService.get<string>('CONTENT_MODULE_BASE_URL') || 'http://localhost:3002/api/v1';
  }


  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new HttpException('Resource not found in Content Module', HttpStatus.NOT_FOUND);
        }
        throw new HttpException(
          `Content Module error: ${response.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const result = await response.json() as any;
      return result.data ?? result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Content Module request failed: ${url}`, (error as Error).stack);
      throw new HttpException('Content Module unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async getCourse(courseId: string): Promise<any> {
    return this.request(`/courses/${courseId}`);
  }

  async getCourseStructure(courseId: string): Promise<any> {
    return this.request(`/courses/${courseId}/structure`);
  }

  async getCoursesByCreator(creatorId: string): Promise<any[]> {
    return this.request(`/courses?created_by=${creatorId}`);
  }

  async getLesson(lessonId: string): Promise<any> {
    return this.request(`/lessons/${lessonId}`);
  }

  async getMaterial(materialId: string): Promise<any> {
    return this.request(`/materials/${materialId}`);
  }

  async getCourseQuizzes(courseId: string): Promise<any[]> {
    return this.request(`/courses/${courseId}/quizzes`);
  }

  async getLatestQuizResult(learnerId: string, courseId: string): Promise<any> {
    return this.request(`/quiz-results/latest?learner_id=${learnerId}&course_id=${courseId}`);
  }

  async getQuizAttempts(learnerId: string, courseId: string): Promise<any[]> {
    return this.request(`/quiz-attempts?learner_id=${learnerId}&course_id=${courseId}`);
  }
}
