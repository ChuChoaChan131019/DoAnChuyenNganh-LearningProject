import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller('api/v1/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('plan-suggestion')
  async getPlanSuggestion(
    @Body()
    body: {
      courseId: string;
      goal: string;
      availableDays: number[];
      sessionDurationMinutes: number;
    },
  ): Promise<any> {
    return this.aiService.generateLearningPlanSuggestion(body);
  }

  @Get('tutor/history')
  async getTutorHistory(@Req() request: any) {
    return this.aiService.getTutorHistory(request.user.id);
  }

  @Post('tutor/message')
  async sendTutorMessage(
    @Body()
    body: {
      conversationId?: string;
      message: string;
    },
    @Req() request: any,
  ) {
    return this.aiService.sendTutorMessage(request.user.id, body);
  }
}
