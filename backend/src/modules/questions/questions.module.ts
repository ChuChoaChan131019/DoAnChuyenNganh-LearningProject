import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../config/supabase.module.js';
import { QuestionsController } from './questions.controller.js';
import { QuestionsService } from './questions.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}