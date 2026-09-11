import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CoursesService } from './courses.service.js';

@Controller('api/v1/learner/courses')
@UseGuards(JwtAuthGuard)
export class LearnerCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get(':slug/lessons')
  findLessons(@Param('slug') slug: string) {
    return this.coursesService.findLearnerLessons(slug);
  }
}