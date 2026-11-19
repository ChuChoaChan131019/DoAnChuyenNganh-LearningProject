import { IsInt, Min } from 'class-validator';

export class CheckCodeExerciseDto {
  @IsInt()
  @Min(1)
  edit_version!: number;
}