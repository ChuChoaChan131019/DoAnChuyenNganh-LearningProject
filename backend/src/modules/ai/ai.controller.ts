import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { LearningPlanSuggestionDto } from './dto/learning-plan-suggestion.dto.js';
import { TutorMessageDto } from './dto/tutor-message.dto.js';

@Controller('api/v1/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('plan-suggestion')
  async getPlanSuggestion(
    @Body() body: LearningPlanSuggestionDto,
  ): Promise<any> {
    return this.aiService.generateLearningPlanSuggestion(body);
  }

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
}
