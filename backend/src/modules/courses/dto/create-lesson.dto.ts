import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  estimated_duration_minutes?: number;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  code_example?: string;

  @IsOptional()
  @IsIn(['draft', 'in_review', 'approved', 'published'])
  status?: string;
}