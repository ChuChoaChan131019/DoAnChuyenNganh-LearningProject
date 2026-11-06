import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAiPracticeSetDto {
  @IsUUID()
  lesson_id!: string;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  count?: number;

  @IsOptional()
  @IsIn(['easy', 'medium', 'hard', 'mixed'])
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  prompt?: string;
}
