import { IsIn } from 'class-validator';

export class ContainerReviewActionDto {
  @IsIn(['approve', 'publish', 'unpublish'])
  action!: 'approve' | 'publish' | 'unpublish';
}
