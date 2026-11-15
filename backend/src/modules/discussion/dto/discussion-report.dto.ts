import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateDiscussionReportDto {
  @IsIn(['post', 'comment'])
  target_type!: 'post' | 'comment';

  @IsUUID()
  target_id!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;
}

export class ResolveDiscussionReportDto {
  @IsIn(['dismissed', 'hidden', 'removed'])
  decision!: 'dismissed' | 'hidden' | 'removed';

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;
}
