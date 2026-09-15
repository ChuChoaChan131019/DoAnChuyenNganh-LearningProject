import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../config/supabase.module.js';
import { AiModule } from '../ai/ai.module.js';
import { PracticeController } from './practice.controller.js';
import { PracticeService } from './practice.service.js';

@Module({
  imports: [SupabaseModule, AiModule],
  controllers: [PracticeController],
  providers: [PracticeService],
})
export class PracticeModule {}