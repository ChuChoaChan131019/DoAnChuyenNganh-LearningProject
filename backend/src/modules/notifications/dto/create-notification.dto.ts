import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  title!: string;

  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Content is required' })
  content!: string;

  @IsIn(['course', 'individual'], { message: 'Scope type must be either course or individual' })
  scopeType!: 'course' | 'individual';

  @IsString({ message: 'Course ID must be a string' })
  @IsNotEmpty({ message: 'Course ID is required' })
  courseId!: string;

  @IsOptional()
  @IsArray({ message: 'Recipient IDs must be an array' })
  @IsString({ each: true, message: 'Each recipient ID must be a string' })
  recipientIds?: string[];
}
