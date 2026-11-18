import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RunCsharpDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64000)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16000)
  stdin?: string;
}
