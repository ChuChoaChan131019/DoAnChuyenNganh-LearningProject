import { Controller } from '@nestjs/common';
import { RemindersService } from './reminders.service.js';

@Controller('api/v1/reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  // TODO: Implement endpoint handlers
}
