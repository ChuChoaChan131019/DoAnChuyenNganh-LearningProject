import { IsString, IsNumber, Min, Max } from 'class-validator';

export class CourseProgressDto {
  @IsString()
  course_id: string;

  @IsString()
  course_name: string;

  @IsNumber()
  completed_lessons: number;

  @IsNumber()
  @Min(1)
  total_lessons: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}

export class ProgressResponseDto {
  @IsString()
  courses: CourseProgressDto[];
}
