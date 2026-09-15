import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFeedbackDto {
  @IsString({ message: 'Learner ID must be a string' })
  @IsNotEmpty({ message: 'Learner ID is required' })
  learnerId!: string;

  @IsString({ message: 'Course ID must be a string' })
  @IsNotEmpty({ message: 'Course ID is required' })
  courseId!: string;

  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Content is required' })
  content!: string;

  @IsOptional()
  @IsIn(['general', 'progress', 'result', 'task'], {
    message: 'Context type must be one of: general, progress, result, task',
  })
  contextType?: 'general' | 'progress' | 'result' | 'task';

  @IsOptional()
  @IsString({ message: 'Context ID must be a string' })
  contextId?: string;

  @IsOptional()
  contextSnapshot?: Record<string, any>;

  @IsOptional()
  @IsIn(['draft', 'sent'], {
    message: 'Status must be either draft or sent',
  })
  status?: 'draft' | 'sent';
}
