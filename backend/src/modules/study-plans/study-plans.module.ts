import { Module } from '@nestjs/common';
import { StudyPlansController } from './study-plans.controller.js';
import { StudyPlansService } from './study-plans.service.js';

@Module({
  controllers: [StudyPlansController],
  providers: [StudyPlansService],
  exports: [StudyPlansService],
})
export class StudyPlansModule {}
