import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthoringNotificationsService } from './authoring-notifications.service.js';

@Controller('api/v1/authoring-notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('content_manager')
export class AuthoringNotificationsController {
  constructor(private readonly service: AuthoringNotificationsService) {}

  @Get()
  list(@Req() request: { user: { id: string } }, @Query('offset') offset?: string) {
    return this.service.list(request.user.id, offset);
  }

  @Get('unread-count')
  unreadCount(@Req() request: { user: { id: string } }) {
    return this.service.unreadCount(request.user.id);
  }

  @Patch(':id/read')
  read(@Req() request: { user: { id: string } }, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.markRead(request.user.id, id);
  }
}
