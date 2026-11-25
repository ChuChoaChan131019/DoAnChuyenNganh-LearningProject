import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class LessonReviewActionDto {
  @IsIn(['approve', 'publish', 'unpublish'])
  action!: 'approve' | 'publish' | 'unpublish';

  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
