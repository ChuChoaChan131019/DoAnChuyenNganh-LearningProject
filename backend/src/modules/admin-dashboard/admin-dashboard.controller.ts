import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AdminDashboardService } from './admin-dashboard.service.js';
import type { AdminDashboardResponse } from './admin-dashboard.types.js';

@Controller('api/v1/admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get()
  getDashboard(@Query('days') rawDays?: string): Promise<AdminDashboardResponse> {
    const days = rawDays === undefined ? 7 : Number(rawDays);
    if (days !== 7 && days !== 30 && days !== 90) {
      throw new BadRequestException('days must be 7, 30, or 90');
    }
    return this.dashboardService.getDashboard(days);
  }
}
