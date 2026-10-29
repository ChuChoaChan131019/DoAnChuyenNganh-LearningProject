import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { MaterialsService } from './materials.service.js';
import { UpdateMaterialDto } from './dto/update-material.dto.js';

@Controller('api/v1/courses/materials')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('content_manager', 'admin')
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Get()
  list() { return this.materials.listAll(); }

  @Get(':id/access')
  access(@Param('id') id: string, @Query('download') download?: string) {
    return this.materials.access(id, false, download === 'true');
  }

  @Patch(':id')
  rename(@Param('id') id: string, @Body() body: UpdateMaterialDto) {
    return this.materials.rename(id, body.title);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.materials.remove(id); }
}

@Controller('api/v1/courses/lessons/:lessonId/materials')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('content_manager', 'admin')
export class LessonMaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Get()
  list(@Param('lessonId') lessonId: string) { return this.materials.listForLesson(lessonId); }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 6 * 1024 * 1024 } }))
  upload(
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    @Body('title') title?: string,
  ) {
    return this.materials.upload(lessonId, file, title);
  }
}

@Controller('api/v1/learner/courses')
@UseGuards(JwtAuthGuard)
export class LearnerMaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Get('lessons/:lessonId/materials')
  list(@Param('lessonId') lessonId: string) { return this.materials.listForLesson(lessonId, true); }

  @Get('materials/:id/access')
  access(@Param('id') id: string, @Query('download') download?: string) {
    return this.materials.access(id, true, download === 'true');
  }
}
