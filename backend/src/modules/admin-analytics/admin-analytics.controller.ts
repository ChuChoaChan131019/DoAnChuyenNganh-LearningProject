import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import type {
  AdminAnalyticsFilters,
  AdminAnalyticsRole,
  AdminFeatureAnalyticsResponse,
  AdminUsageResponse,
} from './admin-analytics.types.js';

const DAY_MS = 86_400_000;
const ROLES: AdminAnalyticsRole[] = [
  'all',
  'learner',
  'content_manager',
  'admin',
];

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get('usage')
  getUsage(
    @Query('days') days?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('role') role?: string,
  ): Promise<AdminUsageResponse> {
    return this.analyticsService.getUsage(
      this.parseFilters(days, from, to, role, 7),
    );
  }

  @Get('analytics')
  getFeatures(
    @Query('days') days?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('role') role?: string,
  ): Promise<AdminFeatureAnalyticsResponse> {
    return this.analyticsService.getFeatures(
      this.parseFilters(days, from, to, role, 30),
    );
  }

  private parseFilters(
    rawDays: string | undefined,
    from: string | undefined,
    to: string | undefined,
    rawRole: string | undefined,
    defaultDays: 7 | 30,
  ): AdminAnalyticsFilters {
    const role = rawRole ?? 'all';
    if (!ROLES.includes(role as AdminAnalyticsRole)) {
      throw new BadRequestException(
        'role must be all, learner, content_manager, or admin',
      );
    }
    const today = new Date(Date.now() + 7 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const dayNumber = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
      const parsed = Date.parse(`${value}T00:00:00.000Z`);
      return Number.isFinite(parsed) &&
        new Date(parsed).toISOString().slice(0, 10) === value
        ? parsed / DAY_MS
        : NaN;
    };

    if (from !== undefined || to !== undefined) {
      if (rawDays !== undefined || !from || !to) {
        throw new BadRequestException('Provide both from and to, without days');
      }
      const first = dayNumber(from);
      const last = dayNumber(to);
      const length = last - first + 1;
      if (!Number.isFinite(length) || length < 1 || length > 90 || to > today) {
        throw new BadRequestException(
          'Date range must be valid, at most 90 days, and not in the future',
        );
      }
      return {
        role: role as AdminAnalyticsRole,
        range: { from, to, days: length, timezone: 'Asia/Ho_Chi_Minh' },
      };
    }

    const days = rawDays === undefined ? defaultDays : Number(rawDays);
    if (days !== 7 && days !== 30 && days !== 90) {
      throw new BadRequestException('days must be 7, 30, or 90');
    }
    const start = new Date((dayNumber(today) - days + 1) * DAY_MS)
      .toISOString()
      .slice(0, 10);
    return {
      role: role as AdminAnalyticsRole,
      range: { from: start, to: today, days, timezone: 'Asia/Ho_Chi_Minh' },
    };
  }
}
