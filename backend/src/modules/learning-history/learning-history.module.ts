import { Module } from '@nestjs/common';
import { LearningHistoryController } from './learning-history.controller.js';
import { LearningHistoryService } from './learning-history.service.js';

@Module({
  controllers: [LearningHistoryController],
  providers: [LearningHistoryService],
  exports: [LearningHistoryService],
})
export class LearningHistoryModule {}
