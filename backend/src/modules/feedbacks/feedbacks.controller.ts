import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FeedbacksService } from './feedbacks.service.js';
import { CreateFeedbackDto } from './dto/create-feedback.dto.js';
import { UpdateFeedbackDto } from './dto/update-feedback.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('api/v1/feedbacks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

  /**
   * Lấy danh sách học viên có thể nhận feedback
   */
  @Get('learners')
  @Roles('content_manager', 'admin')
  async getLearners(@Query('courseId') courseId?: string) {
    return this.feedbacksService.getLearners(courseId);
  }

  /**
   * Lấy danh sách feedback do Content Manager này quản lý
   */
  @Get()
  @Roles('content_manager', 'admin')
  async findAll(@Request() req: any, @Query('status') status?: string) {
    return this.feedbacksService.findAll(req.user.id, status);
  }

  /**
   * Xem chi tiết một feedback
   */
  @Get(':id')
  @Roles('content_manager', 'admin')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.feedbacksService.findOne(req.user.id, id);
  }

  /**
   * Tạo feedback mới (draft hoặc sent)
   */
  @Post()
  @Roles('content_manager', 'admin')
  async create(@Request() req: any, @Body() dto: CreateFeedbackDto) {
    return this.feedbacksService.create(req.user.id, dto);
  }

  /**
   * Cập nhật bản nháp feedback
   */
  @Patch(':id')
  @Roles('content_manager', 'admin')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackDto,
  ) {
    return this.feedbacksService.update(req.user.id, id, dto);
  }

  /**
   * Xóa bản nháp feedback
   */
  @Delete(':id')
  @Roles('content_manager', 'admin')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.feedbacksService.delete(req.user.id, id);
  }

  /**
   * Gửi bản nháp feedback tới học viên
   */
  @Post(':id/send')
  @Roles('content_manager', 'admin')
  async send(@Request() req: any, @Param('id') id: string) {
    return this.feedbacksService.send(req.user.id, id);
  }
}
