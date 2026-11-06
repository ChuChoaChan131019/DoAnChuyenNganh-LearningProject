import { Module } from '@nestjs/common';

import { SupabaseModule } from '../../config/supabase.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

import { CodeExercisesController } from './code-exercises.controller.js';
import { CodeExercisesService } from './code-exercises.service.js';
import { LearnerCodeExercisesController } from './learner-code-exercises.controller.js';
import { LearnerCodeExercisesService } from './learner-code-exercises.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [CodeExercisesController, LearnerCodeExercisesController],
  providers: [
    CodeExercisesService,
    LearnerCodeExercisesService,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class CodeExercisesModule {}
