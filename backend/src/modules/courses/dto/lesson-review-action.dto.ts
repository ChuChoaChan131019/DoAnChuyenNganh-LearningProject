import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class LessonReviewActionDto {
  @IsIn(['approve', 'publish', 'unpublish', 'request_changes'])
  action!: 'approve' | 'publish' | 'unpublish' | 'request_changes';

  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
