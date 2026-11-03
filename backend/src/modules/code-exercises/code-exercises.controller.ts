import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

import { CodeExercisesService } from './code-exercises.service.js';
import {
  SaveCodeExerciseDto,
  UpdateCodeExerciseDto,
} from './dto/save-code-exercise.dto.js';

@Controller('api/v1/code-exercises')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('content_manager', 'admin')
export class CodeExercisesController {
  constructor(
    private readonly service: CodeExercisesService,
  ) {}

  // GET /api/v1/code-exercises
  @Get()
  findAll(
    @Req() req: any,
    @Query('lesson_id') lessonId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(
      req.user,
      lessonId,
      search,
    );
  }

  // GET /api/v1/code-exercises/:id
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.service.findOne(id, req.user);
  }

  // POST /api/v1/code-exercises
  @Post()
  create(
    @Body() dto: SaveCodeExerciseDto,
    @Req() req: any,
  ) {
    return this.service.create(dto, req.user);
  }

  // PUT /api/v1/code-exercises/:id/draft
  @Put(':id/draft')
  updateDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCodeExerciseDto,
    @Req() req: any,
  ) {
    return this.service.updateDraft(
      id,
      dto,
      req.user,
    );
  }

  // POST /api/v1/code-exercises/:id/copy
  @Post(':id/copy')
  copy(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.service.copy(id, req.user);
  }

  // DELETE /api/v1/code-exercises/:id
  // Thực tế là soft delete (archive)
  @Delete(':id')
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.service.archive(id, req.user);
  }
}