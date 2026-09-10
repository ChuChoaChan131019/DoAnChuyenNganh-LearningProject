import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../config/supabase.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [CoursesController],
  providers: [CoursesService, JwtAuthGuard, RolesGuard],
})
export class CoursesModule {}
