import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  FILL_IN_BLANK = 'fill_in_blank',
}

export enum QuestionDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum QuestionStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
}

export class QuestionOptionDto {
  @IsString()
  @IsNotEmpty()
  option_text!: string;

  @IsBoolean()
  is_correct!: boolean;

  @IsInt()
  @Min(0)
  order_index!: number;
}

export class QuestionDto {
  @IsUUID()
  course_id!: string;

  @IsOptional()
  @IsUUID()
  chapter_id!: string | null;

  @IsOptional()
  @IsUUID()
  lesson_id!: string | null;

  @IsEnum(QuestionType)
  question_type!: QuestionType;

  @IsEnum(QuestionDifficulty)
  difficulty!: QuestionDifficulty;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  explanation?: string | null;

  @IsEnum(QuestionStatus)
  status!: QuestionStatus;

  @IsArray()
  @IsUUID('4', { each: true })
  topic_ids!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options!: QuestionOptionDto[];
}

export class SubmitQuestionDto {
  @IsEnum(QuestionStatus)
  status!: QuestionStatus;
}

export class QuizQuestionItemDto {
  @IsUUID()
  question_id!: string;

  @IsNumber()
  @Min(0.1)
  score_weight!: number;
}

export class ConfigureQuizQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionItemDto)
  questions!: QuizQuestionItemDto[];
}