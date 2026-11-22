import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
    const result = await this.runner.run(dto.code, dto.stdin ?? '');
    await this.service.recordRun(exerciseId, req.user.id);
    return result;
  }

  // C07: mở gợi ý mức 1, 2, 3 lần lượt.
  @Post(':exerciseId/hints/:level')
  openHint(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Param('level', ParseIntPipe) level: number,
    @Req() req: any,
  ) {
    return this.service.openHint(exerciseId, level, req.user.id);
  }

  // C07: nộp bài, chấm toàn bộ test và lưu trạng thái hoàn thành.
  @Post(':exerciseId/submit')
  submit(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: GradeCodeExerciseDto,
    @Req() req: any,
  ) {
    return this.grading.submit(
      exerciseId,
      req.user.id,
      dto.code,
      dto.revision_id,
    );
  }

  // C05: Chạy thử các bộ kiểm tra công khai
  @Post(':exerciseId/check-public')
  async checkPublicTests(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: GradeCodeExerciseDto,
    @Req() req: any,
  ) {
    const result = await this.grading.grade(
      exerciseId,
      req.user.id,
      dto.code,
      'public',
      dto.revision_id,
    );
    await this.service.recordRun(exerciseId, req.user.id);
    return result;
  }

  // C05: Chấm tất cả bộ kiểm tra, kể cả test ẩn.
  // Không lưu kết quả; lần nộp chính thức dùng POST :exerciseId/submit (C07).
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
