import { Controller, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { NotificationsService } from './notifications.service.js';

@Controller('api/v1/learner/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('learner')
export class LearnerNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Luôn giới hạn năm thông báo mới nhất cho chuông Learner. */
  @Get()
  async list(@Request() req: any) {
    return this.notificationsService.getLearnerNotifications(req.user.id);
  }

  @Patch(':notificationId/read')
  async markRead(
    @Request() req: any,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationsService.markLearnerNotificationRead(
      req.user.id,
      notificationId,
    );
  }
}
