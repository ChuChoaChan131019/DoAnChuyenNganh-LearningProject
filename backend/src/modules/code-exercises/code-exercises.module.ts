import { Module } from '@nestjs/common';

import { SupabaseModule } from '../../config/supabase.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

import { CodeExercisesController } from './code-exercises.controller.js';
import { CodeExercisesService } from './code-exercises.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [CodeExercisesController],
  providers: [
    CodeExercisesService,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class CodeExercisesModule {}