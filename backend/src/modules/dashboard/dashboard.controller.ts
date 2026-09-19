import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { DashboardResponseDto } from './dto/dashboard-response.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard)
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
}
