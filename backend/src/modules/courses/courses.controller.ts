import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { CoursesService } from './courses.service.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CreateChapterDto } from './dto/create-chapter.dto.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateChapterDto } from './dto/update-chapter.dto.js';
import { ReorderChaptersDto } from './dto/reorder-chapters.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { LessonReviewActionDto } from './dto/lesson-review-action.dto.js';
import { ContainerReviewActionDto } from './dto/container-review-action.dto.js';

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

  @Post(':courseId/chapters')
  createChapter(
    @Param('courseId') courseId: string,
    @Body() createChapterDto: CreateChapterDto,
  ) {
    return this.coursesService.createChapter(courseId, createChapterDto);
  }

  @Get(':courseId/chapters')
  findChapters(@Param('courseId') courseId: string) {
    return this.coursesService.findChapters(courseId);
  }

  @Get(':courseId/chapters/:chapterId/lessons')
  findLessonsByChapter(
    @Param('chapterId') chapterId: string,
  ) {
    return this.coursesService.findLessonsByChapter(chapterId);
  }

  @Patch(':courseId/chapters/reorder')
  reorderChapters(
    @Param('courseId') courseId: string,
    @Body() reorderChaptersDto: ReorderChaptersDto,
  ) {
    return this.coursesService.reorderChapters(courseId, reorderChaptersDto.chapter_ids);
  }

  @Patch(':courseId/chapters/:chapterId/lessons/reorder')
  reorderLessons(
    @Param('courseId') courseId: string,
    @Param('chapterId') chapterId: string,
    @Body() reorderLessonsDto: ReorderChaptersDto,
  ) {
    return this.coursesService.reorderLessons(courseId, chapterId, reorderLessonsDto.chapter_ids);
  }

  @Post(':courseId/chapters/:chapterId/lessons')
  createLesson(
    @Param('courseId') courseId: string,
    @Param('chapterId') chapterId: string,
    @Body() createLessonDto: CreateLessonDto,
    @Req() request: any,
  ) {
    return this.coursesService.createLesson(courseId, chapterId, createLessonDto, request.user.id);
  }

  @Get('lessons/review-queue')
  reviewQueue() {
    return this.coursesService.reviewQueue();
  }

  @Get('review-tree')
  reviewTree() {
    return this.coursesService.reviewTree();
  }

  @Post('chapters/:chapterId/review-action')
  reviewChapterAction(@Param('chapterId') chapterId: string, @Body() body: ContainerReviewActionDto) {
    return this.coursesService.reviewChapterAction(chapterId, body.action);
  }

  @Post(':courseId/review-action')
  reviewCourseAction(@Param('courseId') courseId: string, @Body() body: ContainerReviewActionDto) {
    return this.coursesService.reviewCourseAction(courseId, body.action);
  }

  @Get('lessons/:lessonId/review-history')
  reviewHistory(@Param('lessonId') lessonId: string) {
    return this.coursesService.reviewHistory(lessonId);
  }

  @Post('lessons/:lessonId/review-action')
  reviewAction(@Param('lessonId') lessonId: string, @Body() body: LessonReviewActionDto, @Req() request: any) {
    return this.coursesService.reviewAction(lessonId, request.user.id, body);
  }

  @Patch(':courseId/chapters/:chapterId')
  updateChapter(
    @Param('courseId') courseId: string,
    @Param('chapterId') chapterId: string,
    @Body() updateChapterDto: UpdateChapterDto,
  ) {
    return this.coursesService.updateChapter(courseId, chapterId, updateChapterDto);
  }

  @Delete(':courseId/chapters/:chapterId')
  removeChapter(
    @Param('courseId') courseId: string,
    @Param('chapterId') chapterId: string,
  ) {
    return this.coursesService.removeChapter(courseId, chapterId);
  }

  @Get('lessons/:lessonId')
  findLesson(@Param('lessonId') lessonId: string) {
    return this.coursesService.findLesson(lessonId);
  }

  @Patch('lessons/:lessonId')
  updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @Req() request: any,
  ) {
    return this.coursesService.updateLesson(lessonId, updateLessonDto, request.user.id);
  }

  @Delete('lessons/:lessonId')
  removeLesson(@Param('lessonId') lessonId: string) {
    return this.coursesService.removeLesson(lessonId);
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
