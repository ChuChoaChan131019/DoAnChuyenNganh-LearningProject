import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderChaptersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  chapter_ids!: string[];
}