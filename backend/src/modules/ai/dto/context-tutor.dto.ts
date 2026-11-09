import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ContextTutorHistoryDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

export class ContextTutorDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsIn(['lesson', 'practice', 'quiz'])
  mode!: 'lesson' | 'practice' | 'quiz';

  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsOptional()
  @IsUUID()
  chapterId?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  courseSlug?: string;

  @IsOptional()
  @IsUUID()
  quizId?: string;

  @IsOptional()
  @IsUUID()
  questionId?: string;

  // Chỉ là ngữ cảnh câu hỏi học viên nhìn thấy, không phải tài liệu nguồn.
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  questionText?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ContextTutorHistoryDto)
  history?: ContextTutorHistoryDto[];
}
