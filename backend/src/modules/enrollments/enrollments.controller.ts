import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller('api/v1/enrollments')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  /**
   * POST /api/v1/enrollments/:courseId
   * Đăng ký khóa học
   */
  @Post(':courseId')
  @HttpCode(HttpStatus.OK)
  async enroll(
    @Request() req: any,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    const learnerId = req.user.id;
    return this.enrollmentsService.enroll(learnerId, courseId);
  }

  /**
   * GET /api/v1/enrollments/:courseId/check
   * Kiểm tra trạng thái đăng ký
   */
  @Get(':courseId/check')
  async checkEnrollment(
    @Request() req: any,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    const learnerId = req.user.id;
    return this.enrollmentsService.checkEnrollment(learnerId, courseId);
  }

  /**
   * GET /api/v1/enrollments/:courseId/progress
   * Lấy danh sách lesson_id đã hoàn thành
   */
  @Get(':courseId/progress')
  async getProgress(
    @Request() req: any,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    const learnerId = req.user.id;
    const completedLessons = await this.enrollmentsService.getCompletedLessons(learnerId, courseId);
    return { completedLessons };
  }

  /**
   * POST /api/v1/enrollments/lessons/:lessonId/complete
   * Đánh dấu hoàn thành bài học
   */
  @Post('lessons/:lessonId/complete')
  @HttpCode(HttpStatus.OK)
  async completeLesson(
    @Request() req: any,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() body: { courseId: string },
  ) {
    const learnerId = req.user.id;
    return this.enrollmentsService.completeLesson(learnerId, lessonId, body.courseId);
  }
}
