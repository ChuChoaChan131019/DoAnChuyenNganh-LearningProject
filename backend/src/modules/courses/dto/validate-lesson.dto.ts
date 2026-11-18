import { IsInt, Min } from 'class-validator';

export class ValidateLessonDto {
  @IsInt()
  @Min(1)
  version!: number;
}

export class RestoreLessonVersionDto {
  @IsInt()
  @Min(1)
  current_version!: number;
}
