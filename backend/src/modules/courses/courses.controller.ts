import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { CoursesService } from './courses.service.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';

@Controller('api/v1/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('content_manager', 'admin')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  @Post()
  create(@Body() createCourseDto: CreateCourseDto, @Req() request: any) {
    return this.coursesService.create(createCourseDto, request.user.id);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }
}
