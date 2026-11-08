import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../config/supabase.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { StatisticsController } from './statistics.controller.js';
import { StatisticsService } from './statistics.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [StatisticsController],
  providers: [
    StatisticsService,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class StatisticsModule {}