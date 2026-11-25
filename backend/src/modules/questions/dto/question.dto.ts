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
  MaxLength,
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
  REJECTED = 'rejected',
}

export class QuestionOptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
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

  @IsUUID()
  chapter_id!: string;

  @IsOptional()
  @IsUUID()
  lesson_id!: string | null;

  @IsEnum(QuestionType)
  question_type!: QuestionType;

  @IsEnum(QuestionDifficulty)
  difficulty!: QuestionDifficulty;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  explanation?: string | null;

  @IsEnum(QuestionStatus)
  status!: QuestionStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options!: QuestionOptionDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  expected_version?: number;
}

export class SubmitQuestionDto {
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expected_version?: number;
}

export class RevokeQuestionApprovalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;

  @IsInt()
  @Min(1)
  expected_version!: number;
}

export class QuizQuestionItemDto {
  @IsUUID()
  question_id!: string;

  @IsInt()
  @Min(0)
  order_index!: number;

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
