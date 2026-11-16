import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { DiscussionNotificationsService } from './discussion-notifications.service.js';

@Controller('api/v1/discussion/notifications')
@UseGuards(JwtAuthGuard)
export class DiscussionNotificationsController {
  constructor(private readonly service: DiscussionNotificationsService) {}

  @Get()
  list(@Req() req: { user: { id: string } }, @Query('offset') offset?: string) {
    return this.service.list(req.user.id, offset);
  }

  @Patch(':id/read')
  read(@Req() req: { user: { id: string } }, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.read(req.user.id, id);
  }
}
