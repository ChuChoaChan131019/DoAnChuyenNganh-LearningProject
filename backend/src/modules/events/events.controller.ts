import { Controller } from '@nestjs/common';
import { EventsService } from './events.service.js';

@Controller('api/v1/internal')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // TODO: Implement endpoint handlers
}
