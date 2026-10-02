import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAdminNotificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsIn(['General', 'Warning', 'Maintenance'])
  type!: 'General' | 'Warning' | 'Maintenance';

  @IsIn(['all', 'learner', 'content_manager'])
  audience!: 'all' | 'learner' | 'content_manager';

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}
