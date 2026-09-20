import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePracticeAttemptDto {
  @IsIn(['quick', 'weak', 'course', 'ai'])
  mode!: 'quick' | 'weak' | 'course' | 'ai';

  @IsOptional()
  @IsString()
  course_id?: string;

  @IsInt()
  total_questions!: number;
}
