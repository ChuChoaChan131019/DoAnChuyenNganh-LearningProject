import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class GenerateLessonDto {
  @IsUUID()
  course_id!: string;

  @IsUUID()
  chapter_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  topic!: string;

  @IsIn(['basic', 'intermediate', 'advanced'])
  level!: 'basic' | 'intermediate' | 'advanced';

  @IsIn(['lesson', 'exercise', 'checklist'])
  content_type!: 'lesson' | 'exercise' | 'checklist';

  @IsInt()
  @Min(300)
  @Max(1500)
  word_count!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;
}
