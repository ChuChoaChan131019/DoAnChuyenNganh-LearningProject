import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDiscussionCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;
}

export class UpdateDiscussionCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;
}
