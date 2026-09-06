import { Controller } from '@nestjs/common';
import { StudyPlansService } from './study-plans.service.js';

@Controller('api/v1/study-plans')
export class StudyPlansController {
  constructor(private readonly studyPlansService: StudyPlansService) {}

  // TODO: Implement endpoint handlers
}
