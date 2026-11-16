import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionDifficulty, QuestionType } from './question.dto.js';

export class AiDraftOptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  option_text!: string;

  @IsBoolean()
  is_correct!: boolean;

  @IsInt()
  @Min(0)
  @Max(7)
  order_index!: number;
}

export class AiDraftQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  client_id!: string;

  @IsUUID()
  course_id!: string;

  @IsUUID()
  chapter_id!: string;

  @IsUUID()
  lesson_id!: string;

  @IsEnum(QuestionType)
  question_type!: QuestionType;

  @IsEnum(QuestionDifficulty)
  difficulty!: QuestionDifficulty;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  explanation!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiDraftOptionDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  options!: AiDraftOptionDto[];
}

export class SaveAiDraftBatchDto {
  @IsUUID()
  batch_id!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiDraftQuestionDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  questions!: AiDraftQuestionDto[];
}
