import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class GenerateAiPracticeDto {
  @IsOptional()
  @IsString()
  course_id?: string;

  @IsOptional()
  @IsUUID()
  chapter_id?: string;

  @IsOptional()
  @IsInt()
  count?: number;

  @IsOptional()
  @IsString()
  prompt?: string;
}
