import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export type DiscussionPostType = 'question' | 'note' | 'resource';

export class CreateDiscussionPostDto {
  @IsOptional()
  @IsUUID()
  chapter_id?: string;

  @IsOptional()
  @IsUUID()
  lesson_id?: string;

  @IsIn(['question', 'note', 'resource'])
  post_type!: DiscussionPostType;

  @IsString()
  @MinLength(5)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    require_tld: true,
  })
  resource_url?: string;
}

export class UpdateDiscussionPostDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(5)
  @MaxLength(160)
  title?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(10)
  @MaxLength(20000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    require_tld: true,
  })
  resource_url?: string;
}
