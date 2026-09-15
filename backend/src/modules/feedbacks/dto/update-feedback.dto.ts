import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateFeedbackDto {
  @IsOptional()
  @IsString({ message: 'Content must be a string' })
  content?: string;

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
}
