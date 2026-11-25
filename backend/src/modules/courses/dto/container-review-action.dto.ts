import { IsIn } from 'class-validator';

export class ContainerReviewActionDto {
  @IsIn(['publish', 'unpublish'])
  action!: 'publish' | 'unpublish';
}
