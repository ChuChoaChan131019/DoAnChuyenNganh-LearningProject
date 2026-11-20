import { IsIn } from 'class-validator';

export class LessonActivityDto {
  @IsIn(['view', 'complete'])
  action!: 'view' | 'complete';
}