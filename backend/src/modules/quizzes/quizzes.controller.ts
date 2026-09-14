import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import {
  ConfigureQuizQuestionsDto,
  CreateQuizDto,
  SubmitQuizDto,
  UpdateQuizDto,
} from './dto/quiz.dto.js';
import { QuizzesService } from './quizzes.service.js';

@Controller('api/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get('quizzes')
  @Roles('content_manager', 'admin', 'learner')
  list(@Query() filters: { course_id?: string; status?: string; visibility?: string }, @Req() request: any) {
    return this.quizzesService.list(request.user.role === 'learner' ? { ...filters, status: 'published', visibility: 'public' } : filters);
  }

  @Get('quizzes/:id')
  @Roles('content_manager', 'admin', 'learner')
  getById(@Param('id') id: string, @Req() request: any) { return this.quizzesService.getById(id, request.user.role); }

  @Post('quizzes')
  @Roles('content_manager', 'admin')
  create(@Body() dto: CreateQuizDto, @Req() request: any) {
    return this.quizzesService.create(dto, request.user.id);
  }

  @Patch('quizzes/:id')
  @Roles('content_manager', 'admin')
  update(@Param('id') id: string, @Body() dto: UpdateQuizDto) {
    return this.quizzesService.update(id, dto);
  }

  @Post('quizzes/:id/publish')
  @Roles('content_manager', 'admin')
  publish(@Param('id') id: string) { return this.quizzesService.setStatus(id, 'published'); }

  @Post('quizzes/:id/archive')
  @Roles('content_manager', 'admin')
  archive(@Param('id') id: string) { return this.quizzesService.setStatus(id, 'archived'); }

  @Delete('quizzes/:id')
  @Roles('content_manager', 'admin')
  remove(@Param('id') id: string) { return this.quizzesService.setStatus(id, 'archived'); }

  @Get('quizzes/:id/questions')
  @Roles('content_manager', 'admin', 'learner')
  getQuestions(@Param('id') id: string, @Req() request: any) { return this.quizzesService.getQuestions(id, request.user.role); }

  @Put('quizzes/:id/questions')
  @Roles('content_manager', 'admin')
  configureQuestions(@Param('id') id: string, @Body() dto: ConfigureQuizQuestionsDto) {
    return this.quizzesService.configureQuestions(id, dto);
  }

  @Post('quizzes/:id/attempts')
  @Roles('learner')
  startAttempt(@Param('id') id: string, @Req() request: any) {
    return this.quizzesService.startAttempt(id, request.user.id);
  }

  @Post('quiz-attempts/:attemptId/submit')
  @Roles('learner')
  submitAttempt(@Param('attemptId') attemptId: string, @Body() dto: SubmitQuizDto, @Req() request: any) {
    return this.quizzesService.submitAttempt(attemptId, dto, request.user.id);
  }

  @Get('quiz-results/latest')
  @Roles('learner')
  latestResult(@Query('quiz_id') quizId: string, @Req() request: any) {
    return this.quizzesService.latestResult(quizId, request.user.id);
  }
}