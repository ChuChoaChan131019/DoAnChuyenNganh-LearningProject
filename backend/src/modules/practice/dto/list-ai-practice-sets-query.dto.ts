import { IsUUID } from 'class-validator';

export class ListAiPracticeSetsQueryDto {
  @IsUUID()
  chapter_id!: string;
}
