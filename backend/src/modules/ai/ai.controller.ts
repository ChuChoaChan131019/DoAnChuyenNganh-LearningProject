import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TutorMessageDto } from './dto/tutor-message.dto.js';

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
}
