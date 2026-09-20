import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TutorMessageDto {
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}
