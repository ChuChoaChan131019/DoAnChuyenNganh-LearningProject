import { IsArray, IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class LearningPlanSuggestionDto {
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsString()
  @IsNotEmpty()
  goal!: string;

  @IsArray()
  @IsNumber({}, { each: true })
  availableDays!: number[];

  @IsInt()
  sessionDurationMinutes!: number;
}
