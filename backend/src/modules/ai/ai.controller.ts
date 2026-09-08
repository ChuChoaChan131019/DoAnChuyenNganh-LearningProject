import { Controller, Post, Body, UseGuards } from '@nestjs/common';
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
}
