import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { DiscussionReportsService } from './discussion-reports.service.js';
import { CreateDiscussionReportDto, ResolveDiscussionReportDto } from './dto/discussion-report.dto.js';

@Controller('api/v1/discussion/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('learner')
export class LearnerDiscussionReportsController {
  constructor(private readonly service: DiscussionReportsService) {}

  @Post()
  create(@Body() dto: CreateDiscussionReportDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }
}

@Controller('api/v1/admin/discussion/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminDiscussionReportsController {
  constructor(private readonly service: DiscussionReportsService) {}

  @Get()
  list(@Query('status') status?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.service.list(status, limit, offset);
  }

  @Patch(':id')
  resolve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveDiscussionReportDto, @Req() req: any) {
    return this.service.resolve(id, dto, req.user.id);
  }
}
