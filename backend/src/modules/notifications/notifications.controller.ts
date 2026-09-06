import { Controller } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // TODO: Implement endpoint handlers
}
