import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { DashboardResponseDto } from './dto/dashboard-response.dto.js';
import { ContentManagerDashboardResponseDto } from './dto/content-manager-dashboard.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Request() req: any): Promise<DashboardResponseDto> {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const [continueLearning, progress, tasks, recentResults] = await Promise.all([
      this.dashboardService.getContinueLearning(userId),
      this.dashboardService.getProgress(userId),
      this.dashboardService.getTasks(userId),
      this.dashboardService.getRecentResults(userId),
    ]);

    return {
      continue_learning: continueLearning,
      progress: { courses: progress },
      tasks: tasks,
      recent_results: recentResults,
    };
  }

  @Get('content-manager')
  @Roles('content_manager', 'admin')
  async getContentManagerDashboard(
    @Request() req: any,
    @Query('course_id') courseId?: string,
  ): Promise<ContentManagerDashboardResponseDto> {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error('User ID not found in request');
    }

    return this.dashboardService.getContentManagerDashboard(userId, courseId);
  }
}
