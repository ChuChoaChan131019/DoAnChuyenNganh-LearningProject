import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import {
  QuestionDto,
  QuestionStatus,
} from './dto/question.dto.js';
import { QuestionsService } from './questions.service.js';

@Controller('api/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('content_manager', 'admin')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('courses')
  listCourses() { return this.questionsService.listCourses(); }

  @Get('courses/:id/chapters')
  listChapters(@Param('id') id: string) { return this.questionsService.listChapters(id); }

  @Get('chapters/:id/lessons')
  listLessons(@Param('id') id: string) { return this.questionsService.listLessons(id); }

  @Get('questions')
  listQuestions(@Query() filters: Record<string, string>) {
    return this.questionsService.listQuestions(filters);
  }

  @Get('questions/:id')
  getById(@Param('id') id: string) {
    return this.questionsService.getById(id);
  }

  @Post('questions')
  create(@Body() dto: QuestionDto, @Req() request: any) {
    return this.questionsService.create(dto, request.user.id);
  }

  @Put('questions/:id')
  update(@Param('id') id: string, @Body() dto: QuestionDto, @Req() request: any) {
    return this.questionsService.update(id, dto, request.user.id);
  }

  @Patch('questions/:id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: QuestionStatus }, @Req() request: any) {
    return this.questionsService.updateStatus(id, body.status, request.user.id);
  }

  @Post('questions/:id/submit-review')
  submitForReview(@Param('id') id: string, @Req() request: any) {
    return this.questionsService.submitForReview(id, request.user.id, request.user.role);
  }

  @Delete('questions/:id')
  remove(@Param('id') id: string, @Req() request: any) {
    return this.questionsService.remove(id, request.user.id);
  }

  @Get('topics')
  listTopics() {
    return this.questionsService.listTopics();
  }

  @Post('topics')
  createTopic(@Body() body: { name: string; description?: string }) {
    if (!body.name?.trim()) {
      throw new BadRequestException('Topic name is required');
    }
    return this.questionsService.createTopic(body.name.trim(), body.description?.trim());
  }

}