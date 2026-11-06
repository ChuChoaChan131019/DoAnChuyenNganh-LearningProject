import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

import { DiscussionCommentsService } from './discussion-comments.service.js';
import {
  CreateDiscussionCommentDto,
  UpdateDiscussionCommentDto,
} from './dto/discussion-comment.dto.js';
import { ListDiscussionCommentsQueryDto } from './dto/discussion-query.dto.js';

@Controller('api/v1/discussion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('learner')
export class DiscussionCommentsController {
  constructor(private readonly service: DiscussionCommentsService) {}

  @Get('posts/:postId/comments')
  findAll(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Query() query: ListDiscussionCommentsQueryDto,
    @Req() req: any,
  ) {
    return this.service.findAll(postId, query, req.user.id);
  }

  @Post('posts/:postId/comments')
  create(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: CreateDiscussionCommentDto,
    @Req() req: any,
  ) {
    return this.service.create(postId, dto, req.user.id);
  }

  @Patch('comments/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDiscussionCommentDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user.id);
  }

  @Delete('comments/:id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.service.remove(id, req.user.id);
  }
}
