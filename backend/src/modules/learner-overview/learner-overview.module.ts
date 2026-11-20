import { Module } from '@nestjs/common';

import { SupabaseModule } from '../../config/supabase.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

import { LearnerOverviewController } from './learner-overview.controller.js';
import { LearnerOverviewService } from './learner-overview.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [LearnerOverviewController],
  providers: [LearnerOverviewService, JwtAuthGuard, RolesGuard],
})
export class LearnerOverviewModule {}