import { Controller } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service.js';

@Controller('api/v1/enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  // TODO: Implement endpoint handlers
}
