import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
  UseGuards,
  Post,
} from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ListLearnerCodeExercisesDto } from './dto/list-learner-code-exercises.dto.js';
import { SaveLearnerCodeDto } from './dto/save-learner-code.dto.js';
import { LearnerCodeExercisesService } from './learner-code-exercises.service.js';
import { RunCsharpDto } from './dto/run-csharp.dto.js';
import { CsharpRunnerService } from './csharp-runner.service.js';
import { GradeCodeExerciseDto } from './dto/grade-code-exercise.dto.js';
import { CodeExerciseGradingService } from './code-exercise-grading.service.js';

@Controller('api/v1/learner/code-exercises')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('learner')
export class LearnerCodeExercisesController {
  constructor(
    private readonly service: LearnerCodeExercisesService,
    private readonly runner: CsharpRunnerService,
    private readonly grading: CodeExerciseGradingService,
  ) {}

  @Get()
  findAll(@Query() query: ListLearnerCodeExercisesDto, @Req() req: any) {
    return this.service.findAll(query, req.user.id);
  }

  @Get(':exerciseId')
  findOne(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Req() req: any,
  ) {
    return this.service.findOne(exerciseId, req.user.id);
  }

  @Put(':exerciseId/code')
  saveCode(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: SaveLearnerCodeDto,
    @Req() req: any,
  ) {
    return this.service.saveCode(exerciseId, dto, req.user.id);
  }

  @Post(':exerciseId/run')
  async runCode(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: RunCsharpDto,
    @Req() req: any,
  ) {
    // Kiểm tra bài có tồn tại và đã xuất bản.
    // Tận dụng logic kiểm tra C06 đang có.
    await this.service.findOne(exerciseId, req.user.id);

    // Chỉ gửi mã và stdin tới sandbox.
    // Không truy xuất test case ẩn.
    return this.runner.run(dto.code, dto.stdin ?? '');
  }

  // C05: Chạy thử các bộ kiểm tra công khai
  @Post(':exerciseId/check-public')
  checkPublicTests(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: GradeCodeExerciseDto,
    @Req() req: any,
  ) {
    return this.grading.grade(
      exerciseId,
      req.user.id,
      dto.code,
      'public',
      dto.revision_id,
    );
  }

  // C05: Chấm tất cả bộ kiểm tra, kể cả test ẩn.
  // Chưa phải thao tác lưu lần nộp chính thức C07.
  @Post(':exerciseId/grade')
  gradeAllTests(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: GradeCodeExerciseDto,
    @Req() req: any,
  ) {
    return this.grading.grade(
      exerciseId,
      req.user.id,
      dto.code,
      'all',
      dto.revision_id,
    );
  }
}
