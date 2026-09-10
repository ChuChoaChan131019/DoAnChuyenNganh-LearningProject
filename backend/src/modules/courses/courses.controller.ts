import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { CoursesService } from './courses.service.js';

@Controller('api/v1/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('content_manager', 'admin')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  create(@Body() createCourseDto: CreateCourseDto, @Req() request: any) {
    return this.coursesService.create(createCourseDto, request.user.id);
  }
}
