import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ContinueLearningResponseDto } from './continue-learning.dto.js';
import { ProgressResponseDto } from './progress.dto.js';
import { TasksResponseDto } from './task.dto.js';
import { RecentResultsResponseDto } from './recent-results.dto.js';

export class DashboardResponseDto {
  @ValidateNested()
  @Type(() => ContinueLearningResponseDto)
  continue_learning: ContinueLearningResponseDto;

  @ValidateNested()
  @Type(() => ProgressResponseDto)
  progress: ProgressResponseDto;

  @ValidateNested()
  @Type(() => TasksResponseDto)
  tasks: TasksResponseDto;

  @ValidateNested()
  @Type(() => RecentResultsResponseDto)
  recent_results: RecentResultsResponseDto;
}
