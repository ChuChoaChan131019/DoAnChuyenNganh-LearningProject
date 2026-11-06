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
} from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ListLearnerCodeExercisesDto } from './dto/list-learner-code-exercises.dto.js';
import { SaveLearnerCodeDto } from './dto/save-learner-code.dto.js';
import { LearnerCodeExercisesService } from './learner-code-exercises.service.js';

@Controller('api/v1/learner/code-exercises')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('learner')
export class LearnerCodeExercisesController {
  constructor(private readonly service: LearnerCodeExercisesService) {}

  @Get()
  findAll(
    @Query() query: ListLearnerCodeExercisesDto,
    @Req() req: any,
  ) {
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
}
