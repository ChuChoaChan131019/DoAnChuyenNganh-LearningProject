import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class QuizResultDto {
  @IsString()
  id: string;

  @IsString()
  quiz_name: string;

  @IsNumber()
  score: number;

  @IsNumber()
  total_questions: number;

  @IsString()
  completed_at: string;
}

export class RecentResultsResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizResultDto)
  quizzes: QuizResultDto[];

  @IsEnum(['improving', 'stable', 'declining', 'insufficient_data'])
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
}
