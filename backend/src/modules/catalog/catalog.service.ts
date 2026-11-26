import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';

export type CatalogActor = { id: string; role: string };
export type CatalogKind =
  'courses' | 'lessons' | 'questions' | 'quizzes' | 'code' | 'review';
const KINDS: CatalogKind[] = [
  'courses',
  'lessons',
  'questions',
  'quizzes',
  'code',
  'review',
];

@Injectable()
export class CatalogService {
  constructor(private readonly supabase: SupabaseService) {}

  async page(
    kind: string,
    actor: CatalogActor,
    filters: Record<string, string>,
  ) {
    if (!KINDS.includes(kind as CatalogKind))
      throw new BadRequestException('Danh sách không hợp lệ');
    if (
      !['admin', 'content_manager'].includes(actor.role) &&
      !(actor.role === 'learner' && ['courses', 'lessons'].includes(kind))
    ) {
      throw new ForbiddenException('Không có quyền xem danh sách');
    }
    const page = Number(filters.page ?? 1);
    const pageSize = Number(filters.page_size ?? 10);
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 1000000 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 50
    ) {
      throw new BadRequestException('Thông số phân trang không hợp lệ');
    }
    const allowed = [
      'search',
      'course_id',
      'chapter_id',
      'lesson_id',
      'difficulty',
      'question_type',
      'status',
      'source',
      'level',
      'sort',
      'exclude_ids',
    ];
    if (Object.values(filters).some((value) => typeof value !== 'string'))
      throw new BadRequestException('Bộ lọc không hợp lệ');
    const query = Object.fromEntries(
      allowed
        .filter((key) => filters[key] !== undefined)
        .map((key) => [key, filters[key]]),
    );
    if (
      (query.search?.length ?? 0) > 500 ||
      (query.exclude_ids?.length ?? 0) > 50000
    )
      throw new BadRequestException('Bộ lọc quá dài');
    // Scope is taken from the authenticated request, never from query parameters.
    const { data, error } = await this.supabase
      .getAdminClient()
      .rpc('content_catalog_page', {
        p_kind: kind,
        p_actor_id: actor.id,
        p_filters: query,
        p_page: page,
        p_page_size: pageSize,
      });
    if (error) {
      if (error.code === '42501')
        throw new ForbiddenException('Không có quyền xem danh sách');
      if (error.code === '22023' || error.code === '22P02')
        throw new BadRequestException('Bộ lọc không hợp lệ');
      throw new InternalServerErrorException(
        'Không thể tải danh sách nội dung',
      );
    }
    return data;
  }
}
