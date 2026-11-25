import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserNotificationsService } from './user-notifications.service.js';

@Controller('api/v1/user-notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('learner', 'content_manager', 'admin')
export class UserNotificationsController {
  constructor(private readonly service: UserNotificationsService) {}

  @Get()
  list(@Req() req: any, @Query('offset') offset?: string, @Query('unread_only') unreadOnly?: string) {
    return this.service.list(req.user.id, offset, unreadOnly === 'true');
  }

  @Get('unread-count')
  unreadCount(@Req() req: any) { return this.service.unreadCount(req.user.id); }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.markRead(req.user.id, id);
  }

  @Get('follows/:courseId')
  following(@Req() req: any, @Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.service.follows(req.user.id, courseId);
  }

  @Put('follows/:courseId')
  @Roles('learner')
  follow(@Req() req: any, @Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.service.follow(req.user.id, courseId);
  }

  @Delete('follows/:courseId')
  @Roles('learner')
  unfollow(@Req() req: any, @Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.service.unfollow(req.user.id, courseId);
  }
}
