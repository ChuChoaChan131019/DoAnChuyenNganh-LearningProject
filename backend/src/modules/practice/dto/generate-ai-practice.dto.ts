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

export class GenerateAiPracticeDto {
  @IsOptional()
  @IsUUID()
  lesson_id?: string;

  @IsOptional()
  @IsString()
  course_id?: string;

  @IsOptional()
  @IsUUID()
  chapter_id?: string;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  count?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  prompt?: string;

  @IsOptional()
  @IsIn(['easy', 'medium', 'hard', 'mixed'])
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
}
