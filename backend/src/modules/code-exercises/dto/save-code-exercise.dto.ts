import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export enum CodeDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export class CodeTestCaseDto {
  // Cho phép chuỗi rỗng và xuống dòng
  @IsString()
  @MaxLength(20000)
  input!: string;

  @IsString()
  @MaxLength(20000)
  expected_output!: string;

  @IsBoolean()
  is_public!: boolean;
}

export class SaveCodeExerciseDto {
  @IsUUID()
  lesson_id!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsEnum(CodeDifficulty)
  difficulty!: CodeDifficulty;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  objective?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  input_format?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  output_format?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  starter_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  hint_1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  hint_2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  hint_3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30000)
  solution_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  solution_explanation?: string;

  // Khi đang là nháp, có thể chưa nhập test case
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CodeTestCaseDto)
  test_cases?: CodeTestCaseDto[];
}

export class UpdateCodeExerciseDto extends SaveCodeExerciseDto {
  @IsInt()
  @Min(0)
  edit_version!: number;
}