import { Module } from '@nestjs/common';
import { AdminNotificationsController } from './admin-notifications.controller.js';
import { LearnerNotificationsController } from './learner-notifications.controller.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  controllers: [
    NotificationsController,
    AdminNotificationsController,
    LearnerNotificationsController,
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
