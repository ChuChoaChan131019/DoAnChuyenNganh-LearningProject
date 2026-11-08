import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

import { DiscussionHelpfulService } from './discussion-helpful.service.js';

@Controller('api/v1/discussion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('learner')
export class DiscussionHelpfulController {
  constructor(
    private readonly service: DiscussionHelpfulService,
  ) {}

  // Lấy thống kê hữu ích cho danh sách bài đăng và bình luận
  @Post('helpful/summary')
  summary(
    @Body()
    body: {
      post_ids?: string[];
      comment_ids?: string[];
    },
    @Req() req: any,
  ) {
    return this.service.summary(body, req.user.id);
  }

  // Đánh dấu bài đăng hữu ích
  @Put('posts/:id/helpful')
  markPost(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.service.markPost(id, req.user.id);
  }

  // Bỏ đánh dấu bài đăng
  @Delete('posts/:id/helpful')
  unmarkPost(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.service.unmarkPost(id, req.user.id);
  }

  // Đánh dấu bình luận hữu ích
  @Put('comments/:id/helpful')
  markComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.service.markComment(id, req.user.id);
  }

  // Bỏ đánh dấu bình luận
  @Delete('comments/:id/helpful')
  unmarkComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.service.unmarkComment(id, req.user.id);
  }
}