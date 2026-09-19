import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ContinueLearningStudyPlanDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  lesson_id: string;

  @IsString()
  lesson_name: string;

  @IsString()
  course_id: string;

  @IsString()
  course_name: string;
}

export class ContinueLearningLessonDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  course_id: string;

  @IsString()
  course_name: string;
}

export class ContinueLearningEnrollmentDto {
  @IsString()
  id: string;

  @IsString()
  course_id: string;

  @IsString()
  course_name: string;
}

export class ContinueLearningResponseDto {
  @IsString()
  type: 'study_plan' | 'lesson' | 'empty';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ContinueLearningStudyPlanDto)
  study_plan?: ContinueLearningStudyPlanDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ContinueLearningLessonDto)
  lesson?: ContinueLearningLessonDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ContinueLearningEnrollmentDto)
  enrollment?: ContinueLearningEnrollmentDto;
}
