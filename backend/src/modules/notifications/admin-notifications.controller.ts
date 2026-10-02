import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CreateAdminNotificationDto } from './dto/create-admin-notification.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller('api/v1/admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list() {
    return this.notificationsService.getAdminNotifications();
  }

  @Post()
  async create(@Request() req: any, @Body() dto: CreateAdminNotificationDto) {
    return this.notificationsService.createAdminNotification(req.user.id, dto);
  }

  /**
   * Thông báo không bị xóa vật lý để giữ audit trail.
   * Scheduled notification được hủy; sent notification được thu hồi khỏi inbox.
   */
  @Delete(':notificationId')
  async revoke(@Param('notificationId') notificationId: string) {
    return this.notificationsService.revokeAdminNotification(notificationId);
  }
}
