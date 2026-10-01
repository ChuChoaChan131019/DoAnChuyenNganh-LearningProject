import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookmarksService } from './bookmarks.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { IsNotEmpty, IsString } from 'class-validator';

export class ToggleBookmarkDto {
  @IsString()
  @IsNotEmpty()
  lessonId: string;
}

@Controller('api/v1/bookmarks')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  /**
   * POST /api/v1/bookmarks/toggle
   * Lưu hoặc bỏ lưu bài học
   */
  @Post('toggle')
  @HttpCode(HttpStatus.OK)
  async toggle(@Request() req: any, @Body() body: ToggleBookmarkDto) {
    const learnerId = req.user.id;
    return this.bookmarksService.toggleBookmark(learnerId, body.lessonId);
  }

  /**
   * GET /api/v1/bookmarks/check/:lessonId
   * Kiểm tra bài học đã bookmark chưa
   */
  @Get('check/:lessonId')
  async check(@Request() req: any, @Param('lessonId') lessonId: string) {
    const learnerId = req.user.id;
    return this.bookmarksService.checkBookmark(learnerId, lessonId);
  }

  /**
   * GET /api/v1/bookmarks
   * Danh sách tất cả bài học đã bookmark của học viên
   */
  @Get()
  async list(@Request() req: any) {
    const learnerId = req.user.id;
    return this.bookmarksService.listBookmarks(learnerId);
  }
}
