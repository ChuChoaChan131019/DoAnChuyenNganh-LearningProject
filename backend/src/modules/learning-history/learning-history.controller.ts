import { Controller } from '@nestjs/common';
import { LearningHistoryService } from './learning-history.service.js';

@Controller('api/v1/analytics')
export class LearningHistoryController {
  constructor(private readonly learningHistoryService: LearningHistoryService) {}

  // TODO: Implement endpoint handlers
}
