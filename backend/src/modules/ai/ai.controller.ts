import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
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

  @Get('tutor/history/paged')
  getTutorHistoryPage(
    @Req() request: any,
    @Query('page') page = '1',
    @Query('page_size') pageSize = '10',
  ) {
    return this.aiService.getTutorConversationsPage(
      request.user.id,
      Number(page),
      Number(pageSize),
    );
  }

  @Get('tutor/conversations/:conversationId/messages')
  getTutorConversationMessages(
    @Req() request: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query('page_size') pageSize = '20',
    @Query('before') before?: string,
  ) {
    return this.aiService.getTutorMessagesPage(
      request.user.id,
      conversationId,
      Number(pageSize),
      before,
    );
  }

  @Post('tutor/message')
  async sendTutorMessage(@Body() body: TutorMessageDto, @Req() request: any) {
    return this.aiService.sendTutorMessage(request.user.id, body);
  }

  @Post('content/generate')
  @UseGuards(RolesGuard)
  @Roles('content_manager')
  generateLesson(@Body() body: GenerateLessonDto) {
    return this.aiService.generateLessonDraft(body);
  }

  @Post('questions/generate')
  @UseGuards(RolesGuard)
  @Roles('content_manager')
  generateQuestions(@Body() body: GenerateAiQuestionsDto, @Req() request: any) {
    return this.aiService.generateAuthoringQuestions(body, request.user.id);
  }
}
