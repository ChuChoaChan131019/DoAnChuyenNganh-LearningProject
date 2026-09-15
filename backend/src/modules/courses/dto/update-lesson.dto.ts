import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  estimated_duration_minutes?: number;

  @IsOptional()
  @IsString()
  content?: string | null;

  @IsOptional()
  @IsString()
  code_example?: string | null;

  @IsOptional()
  @IsIn(['draft', 'in_review', 'approved', 'published'])
  status?: string;
}
