import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListLearnerCodeExercisesDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsUUID()
  course_id?: string;

  @IsOptional()
  @IsUUID()
  chapter_id?: string;

  @IsOptional()
  @IsUUID()
  lesson_id?: string;

  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';

  @IsOptional()
  @IsIn(['not_started', 'in_progress', 'completed'])
  progress_status?: 'not_started' | 'in_progress' | 'completed';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;
}
