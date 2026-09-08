import { Controller } from '@nestjs/common';
import { TasksService } from './tasks.service.js';

@Controller('api/v1/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // TODO: Implement endpoint handlers
}
