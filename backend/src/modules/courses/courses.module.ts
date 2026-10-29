import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../config/supabase.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CoursesController } from './courses.controller.js';
import { LearnerCoursesController } from './learner-courses.controller.js';
import { CoursesService } from './courses.service.js';
import { MaterialsService } from './materials.service.js';
import { MaterialsController, LessonMaterialsController, LearnerMaterialsController } from './materials.controller.js';

@Module({
  imports: [SupabaseModule],
  controllers: [CoursesController, LearnerCoursesController, MaterialsController, LessonMaterialsController, LearnerMaterialsController],
  providers: [CoursesService, MaterialsService, JwtAuthGuard, RolesGuard],
})
export class CoursesModule {}
