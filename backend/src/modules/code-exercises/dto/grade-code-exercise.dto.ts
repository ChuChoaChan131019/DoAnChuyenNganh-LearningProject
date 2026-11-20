import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class GradeCodeExerciseDto {
  @IsUUID()
  revision_id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64000)
  code!: string;
}
