import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../config/supabase.service.js';
import {
  CreateDiscussionPostDto,
  UpdateDiscussionPostDto,
  DiscussionPostType,
} from './dto/discussion-post.dto.js';

@Injectable()
export class DiscussionPostsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  private databaseError(error: { code?: string }): never {
    if (['23502', '23503', '23514', '22P02'].includes(error.code ?? '')) {
      throw new BadRequestException('Dữ liệu bài đăng không hợp lệ');
    }

    throw new InternalServerErrorException('Không thể xử lý dữ liệu thảo luận');
  }

  private cleanText(value: unknown, field: string, min: number, max: number) {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} phải là chuỗi ký tự`);
    }

    const result = value.trim();

    if (result.length < min || result.length > max) {
      throw new BadRequestException(
        `${field} phải có từ ${min} đến ${max} ký tự`,
      );
    }

    return result;
  }

  private checkResource(
    type: DiscussionPostType,
    value?: string | null,
  ): string | null {
    if (type !== 'resource') {
      if (value != null) {
        throw new BadRequestException(
          'Chỉ bài chia sẻ tài liệu mới có resource_url',
        );
      }

      return null;
    }

    if (!value || typeof value !== 'string') {
      throw new BadRequestException('Bài chia sẻ tài liệu cần đường dẫn HTTPS');
    }

    try {
      const url = new URL(value.trim());

      if (url.protocol !== 'https:' || url.username || url.password) {
        throw new Error('Invalid URL');
      }

      return value.trim();
    } catch {
      throw new BadRequestException('Đường dẫn tài liệu không hợp lệ');
    }
  }

  // Kiểm tra và xác định chương từ bài học
  private async validateLocation(
    dto: Pick<CreateDiscussionPostDto, 'chapter_id' | 'lesson_id'>,
  ) {
    if (Boolean(dto.chapter_id) === Boolean(dto.lesson_id)) {
      throw new BadRequestException(
        'Chỉ chọn một trong chapter_id hoặc lesson_id',
      );
    }

    let chapterId = dto.chapter_id!;
    const lessonId = dto.lesson_id ?? null;

    if (lessonId) {
      const { data: lesson, error } = await this.db
        .from('lessons')
        .select('id, chapter_id, status')
        .eq('id', lessonId)
        .maybeSingle();

      if (error) this.databaseError(error);

      if (!lesson || lesson.status !== 'published') {
        throw new BadRequestException(
          'Bài học không tồn tại hoặc chưa xuất bản',
        );
      }

      chapterId = lesson.chapter_id;
    }

    const { data: chapter, error: chapterError } = await this.db
      .from('chapters')
      .select('id, course_id, status')
      .eq('id', chapterId)
      .maybeSingle();

    if (chapterError) this.databaseError(chapterError);

    if (!chapter || chapter.status !== 'published') {
      throw new BadRequestException('Chương không tồn tại hoặc chưa xuất bản');
    }

    const { data: course, error: courseError } = await this.db
      .from('courses')
      .select('id, status')
      .eq('id', chapter.course_id)
      .maybeSingle();

    if (courseError) this.databaseError(courseError);

    if (!course || course.status !== 'published') {
      throw new BadRequestException('Khóa học chưa được xuất bản');
    }

    return { chapterId, lessonId };
  }

  // POST - Tạo bài đăng mới
  async create(dto: CreateDiscussionPostDto, userId: string) {
    const { chapterId, lessonId } = await this.validateLocation(dto);

    const resourceUrl = this.checkResource(dto.post_type, dto.resource_url);

    const { data, error } = await this.db
      .from('discussion_posts')
      .insert({
        chapter_id: chapterId,
        lesson_id: lessonId,
        author_id: userId,
        post_type: dto.post_type,
        title: this.cleanText(dto.title, 'Tiêu đề', 5, 160),
        content: this.cleanText(dto.content, 'Nội dung', 10, 20000),
        resource_url: resourceUrl,
        status: 'visible',
      })
      .select('*')
      .single();

    if (error) this.databaseError(error);

    return data;
  }

  // PATCH - Chỉ tác giả được sửa bài
  async update(id: string, dto: UpdateDiscussionPostDto, userId: string) {
    const { data: existing, error: findError } = await this.db
      .from('discussion_posts')
      .select('id, post_type, chapter_id, lesson_id')
      .eq('id', id)
      .eq('author_id', userId)
      .eq('status', 'visible')
      .is('deleted_at', null)
      .maybeSingle();

    if (findError) this.databaseError(findError);

    if (!existing) {
      throw new NotFoundException(
        'Bài đăng không tồn tại hoặc bạn không có quyền sửa',
      );
    }

    // Recheck the existing target: a withdrawal also ends participation.
    await this.validateLocation(
      existing.lesson_id
        ? { lesson_id: existing.lesson_id }
        : { chapter_id: existing.chapter_id },
    );

    const changes: Record<string, unknown> = {};

    if (dto.title !== undefined) {
      changes.title = this.cleanText(dto.title, 'Tiêu đề', 5, 160);
    }

    if (dto.content !== undefined) {
      changes.content = this.cleanText(dto.content, 'Nội dung', 10, 20000);
    }

    if (dto.resource_url !== undefined) {
      changes.resource_url = this.checkResource(
        existing.post_type as DiscussionPostType,
        dto.resource_url,
      );
    }

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('Cần cung cấp nội dung muốn chỉnh sửa');
    }

    changes.updated_at = new Date().toISOString();

    const { data, error } = await this.db
      .from('discussion_posts')
      .update(changes)
      .eq('id', id)
      .eq('author_id', userId)
      .eq('status', 'visible')
      .is('deleted_at', null)
      .select('*')
      .maybeSingle();

    if (error) this.databaseError(error);

    if (!data) {
      throw new NotFoundException('Bài đăng không còn có thể chỉnh sửa');
    }

    return data;
  }

  // DELETE - Xóa mềm, giữ dữ liệu để kiểm duyệt
  async remove(id: string, userId: string) {
    const now = new Date().toISOString();

    const { data, error } = await this.db
      .from('discussion_posts')
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .eq('author_id', userId)
      .eq('status', 'visible')
      .is('deleted_at', null)
      .select('id, deleted_at')
      .maybeSingle();

    if (error) this.databaseError(error);

    if (!data) {
      throw new NotFoundException(
        'Bài đăng không tồn tại hoặc bạn không có quyền xóa',
      );
    }

    return {
      id: data.id,
      deleted: true,
      deleted_at: data.deleted_at,
    };
  }
}
