import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(Beginner|Intermediate|Advanced)$/)
  level?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;
}
