import { Controller } from '@nestjs/common';
import { FeedbacksService } from './feedbacks.service.js';

@Controller('api/v1/feedbacks')
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

  // TODO: Implement endpoint handlers
}
