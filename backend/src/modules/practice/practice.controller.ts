import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { PracticeService } from './practice.service.js';
import { GenerateAiPracticeDto } from './dto/generate-ai-practice.dto.js';
import { CreatePracticeAttemptDto } from './dto/create-practice-attempt.dto.js';
import { CheckAnswerDto } from './dto/check-answer.dto.js';

@Controller('api/v1/practice')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('learner')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Get('overview')
  getOverview(@Req() request: any) {
    return this.practiceService.getOverview(request.user.id);
  }

  @Get('questions')
  getQuestions(
    @Req() request: any,
    @Query('mode') mode: 'quick' | 'weak' | 'course' = 'quick',
    @Query('course_id') courseId?: string,
  ) {
    return this.practiceService.getQuestions(request.user.id, mode, courseId);
  }

  @Post('ai')
  generateAiPractice(
    @Req() request: any,
    @Body() body: GenerateAiPracticeDto,
  ) {
    return this.practiceService.generateAiPractice(request.user.id, body);
  }

  @Post('attempts')
  createAttempt(
    @Req() request: any,
    @Body() body: CreatePracticeAttemptDto,
  ) {
    return this.practiceService.createAttempt(request.user.id, body);
  }

  @Post('attempts/:attemptId/complete')
  completeAttempt(@Param('attemptId') attemptId: string, @Req() request: any) {
    return this.practiceService.completeAttempt(request.user.id, attemptId);
  }

  @Post('check')
  checkAnswer(
    @Req() request: any,
    @Body() body: CheckAnswerDto,
  ) {
    return this.practiceService.checkAnswer(request.user.id, body);
  }
}