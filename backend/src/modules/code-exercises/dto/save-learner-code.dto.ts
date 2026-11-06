import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class SaveLearnerCodeDto {
  @IsString()
  @MaxLength(100000)
  code!: string;

  @IsInt()
  @Min(0)
  expected_save_version!: number;
}
