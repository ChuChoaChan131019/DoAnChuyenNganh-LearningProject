import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Lấy danh sách học viên trong một khóa học để chọn người nhận
   */
  @Get('courses/:courseId/learners')
  @Roles('content_manager', 'admin')
  async getCourseLearners(@Param('courseId') courseId: string) {
    return this.notificationsService.getCourseLearners(courseId);
  }

  /**
   * Lấy danh sách các thông báo do Content Manager này đã gửi
   */
  @Get('sent')
  @Roles('content_manager', 'admin')
  async getSentNotifications(@Request() req: any) {
    return this.notificationsService.getSentNotifications(req.user.id);
  }

  /**
   * Tạo và gửi thông báo mới
   */
  @Post()
  @Roles('content_manager', 'admin')
  async createNotification(
    @Request() req: any,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationsService.sendNotification(req.user.id, dto);
  }
}

