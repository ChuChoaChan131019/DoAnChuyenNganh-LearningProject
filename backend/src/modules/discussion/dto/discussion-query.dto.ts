import { Type } from 'class-transformer';
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

import type { DiscussionPostType } from './discussion-post.dto.js';

export class ListDiscussionPostsQueryDto {
  @IsOptional()
  @IsIn(['all'])
  scope?: 'all';

  @IsOptional()
  @IsUUID()
  course_id?: string;

  @IsOptional()
  @IsUUID()
  chapter_id?: string;

  @IsOptional()
  @IsUUID()
  lesson_id?: string;

  @IsOptional()
  @IsIn(['question', 'note', 'resource'])
  post_type?: DiscussionPostType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;
}

export class ListDiscussionCommentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 30;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;
}
