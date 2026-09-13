import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../config/supabase.module.js';
import { QuizzesController } from './quizzes.controller.js';
import { QuizzesService } from './quizzes.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [QuizzesController],
  providers: [QuizzesService],
})
export class QuizzesModule {}