import {
  IsArray,
  ArrayMaxSize,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { QuestionDifficulty, QuestionType } from '../../questions/dto/question.dto.js';

export class GenerateAiQuestionsDto {
  @IsUUID()
  course_id!: string;

  @IsOptional()
  @IsUUID()
  chapter_id?: string;

  @IsOptional()
  @IsUUID()
  lesson_id?: string;

  @IsEnum(QuestionType)
  question_type!: QuestionType;

  @IsEnum(QuestionDifficulty)
  difficulty!: QuestionDifficulty;

  @IsInt()
  @Min(1)
  @Max(10)
  count!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  exclude_contents?: string[];
}
