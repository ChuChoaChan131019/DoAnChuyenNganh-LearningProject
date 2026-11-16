import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TutorMessageDto } from './dto/tutor-message.dto.js';
import { GenerateLessonDto } from './dto/generate-lesson.dto.js';
import { GenerateAiQuestionsDto } from './dto/generate-ai-questions.dto.js';

@Controller('api/v1/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('tutor/history')
  async getTutorHistory(@Req() request: any) {
    return this.aiService.getTutorHistory(request.user.id);
  }

  @Post('tutor/message')
  async sendTutorMessage(
    @Body() body: TutorMessageDto,
    @Req() request: any,
  ) {
    return this.aiService.sendTutorMessage(request.user.id, body);
  }

  @Post('content/generate')
  @UseGuards(RolesGuard)
  @Roles('content_manager', 'admin')
  generateLesson(@Body() body: GenerateLessonDto) {
    return this.aiService.generateLessonDraft(body);
  }

  @Post('questions/generate')
  @UseGuards(RolesGuard)
  @Roles('content_manager', 'admin')
  generateQuestions(@Body() body: GenerateAiQuestionsDto, @Req() request: any) {
    return this.aiService.generateAuthoringQuestions(body, request.user.id);
  }
}
