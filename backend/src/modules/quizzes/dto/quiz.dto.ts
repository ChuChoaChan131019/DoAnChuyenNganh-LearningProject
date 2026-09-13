import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum QuizStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum QuizVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

export enum QuizType {
  EXAM = 'exam',
  EXERCISE = 'exercise',
}

export class CreateQuizDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() description?: string | null;
  @IsUUID() course_id!: string;
  @IsOptional() @IsUUID() chapter_id?: string | null;
  @IsEnum(QuizType) quiz_type!: QuizType;
  @IsOptional() @IsInt() @Min(1) duration_minutes?: number | null;
  @IsInt() @Min(0) @Max(100) pass_score!: number;
  @IsEnum(QuizVisibility) visibility!: QuizVisibility;
  @IsOptional() @IsEnum(QuizStatus) status?: QuizStatus;
  @IsBoolean() shuffle_questions!: boolean;
  @IsBoolean() shuffle_options!: boolean;
}

export class UpdateQuizDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsUUID() course_id?: string;
  @IsOptional() @IsUUID() chapter_id?: string | null;
  @IsOptional() @IsEnum(QuizType) quiz_type?: QuizType;
  @IsOptional() @IsInt() @Min(1) duration_minutes?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(100) pass_score?: number;
  @IsOptional() @IsEnum(QuizVisibility) visibility?: QuizVisibility;
  @IsOptional() @IsEnum(QuizStatus) status?: QuizStatus;
  @IsOptional() @IsBoolean() shuffle_questions?: boolean;
  @IsOptional() @IsBoolean() shuffle_options?: boolean;
}

export class QuizQuestionConfigurationDto {
  @IsUUID() question_id!: string;
  @IsNumber() @Min(0.1) score_weight!: number;
}

export class ConfigureQuizQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionConfigurationDto)
  questions!: QuizQuestionConfigurationDto[];
}

export class QuizAnswerDto {
  @IsUUID() question_id!: string;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) selected_option_ids?: string[];
  @IsOptional() @IsString() answer?: string;
}

export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];
}