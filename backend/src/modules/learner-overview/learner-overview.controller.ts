import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

import { LearnerOverviewService } from './learner-overview.service.js';
import { LessonActivityDto } from './dto/lesson-activity.dto.js';

@Controller('api/v1/learner/overview')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('learner')
export class LearnerOverviewController {
  constructor(private readonly overviewService: LearnerOverviewService) {}

  // GET /api/v1/learner/overview
  @Get()
  getOverview(@Req() req: any) {
    return this.overviewService.getOverview(req.user.id);
  }

  // POST /api/v1/learner/overview/lessons/:lessonId/activity
  @Post('lessons/:lessonId/activity')
  recordLessonActivity(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: LessonActivityDto,
    @Req() req: any,
  ) {
    return this.overviewService.recordLesson(req.user.id, lessonId, dto.action);
  }
}