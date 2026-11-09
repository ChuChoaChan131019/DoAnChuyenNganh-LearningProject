import { Module } from '@nestjs/common';

import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

import { ContextTutorController } from './context-tutor.controller.js';
import { ContextTutorService } from './context-tutor.service.js';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
  controllers: [AiController, ContextTutorController],
  providers: [AiService, ContextTutorService, JwtAuthGuard, RolesGuard],
  exports: [AiService, ContextTutorService],
})
export class AiModule {}