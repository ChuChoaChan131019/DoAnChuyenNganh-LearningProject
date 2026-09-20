import { IsArray, IsOptional, IsString } from 'class-validator';

export class CheckAnswerDto {
  @IsString()
  question_id!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  option_ids?: string[];

  @IsOptional()
  @IsString()
  answer_text?: string;

  @IsOptional()
  @IsString()
  attempt_id?: string;
}
