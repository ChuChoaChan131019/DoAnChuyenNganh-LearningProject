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

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

import { DiscussionPostsService } from './discussion-posts.service.js';
import {
  CreateDiscussionPostDto,
  UpdateDiscussionPostDto,
} from './dto/discussion-post.dto.js';
import { ListDiscussionPostsQueryDto } from './dto/discussion-query.dto.js';

@Controller('api/v1/discussion/posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('learner')
export class DiscussionPostsController {
  constructor(
    private readonly service: DiscussionPostsService,
  ) {}

  // Danh sách, tìm và lọc bài đăng trong một chương hoặc bài học
  @Get()
  findAll(
    @Query() query: ListDiscussionPostsQueryDto,
    @Req() req: any,
  ) {
    return this.service.findAll(query, req.user.id);
  }

  // Mở chi tiết một bài đăng còn hiển thị
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.service.findOne(id, req.user.id);
  }

  // Tạo bài đăng
  @Post()
  create(
    @Body() dto: CreateDiscussionPostDto,
    @Req() req: any,
  ) {
    return this.service.create(dto, req.user.id);
  }

  // Sửa bài của chính mình
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDiscussionPostDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user.id);
  }

  // Xóa bài của chính mình
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.service.remove(id, req.user.id);
  }
}
