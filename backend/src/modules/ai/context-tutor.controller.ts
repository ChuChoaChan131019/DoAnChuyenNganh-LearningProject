import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

import { ContextTutorDto } from './dto/context-tutor.dto.js';
import { ContextTutorService } from './context-tutor.service.js';

@Controller('api/v1/ai/tutor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('learner')
export class ContextTutorController {
  constructor(private readonly contextTutorService: ContextTutorService) {}

  @Post('context-message')
  async sendContextMessage(@Body() dto: ContextTutorDto) {
    return this.contextTutorService.chat(dto);
  }
}