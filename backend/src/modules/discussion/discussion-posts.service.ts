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
import { ListDiscussionPostsQueryDto } from './dto/discussion-query.dto.js';
import {
  decodeDiscussionCursor,
  encodeDiscussionCursor,
} from './discussion-cursor.js';

type DiscussionPostRow = {
  id: string;
  chapter_id: string;
  lesson_id: string | null;
  author_id: string;
  post_type: DiscussionPostType;
  title: string;
  content: string;
  resource_url: string | null;
  status: 'visible' | 'hidden' | 'removed';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

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
    hideExistence = false,
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
        if (hideExistence) {
          throw new NotFoundException('Không tìm thấy nội dung thảo luận');
        }
        throw new BadRequestException('Bài học không tồn tại hoặc chưa xuất bản');
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
      if (hideExistence) {
        throw new NotFoundException('Không tìm thấy nội dung thảo luận');
      }
      throw new BadRequestException('Chương không tồn tại hoặc chưa xuất bản');
    }

    const { data: course, error: courseError } = await this.db
      .from('courses')
      .select('id, status')
      .eq('id', chapter.course_id)
      .maybeSingle();

    if (courseError) this.databaseError(courseError);

    if (!course || course.status !== 'published') {
      if (hideExistence) {
        throw new NotFoundException('Không tìm thấy nội dung thảo luận');
      }
      throw new BadRequestException('Khóa học chưa được xuất bản');
    }

    return { chapterId, lessonId };
  }

  async findAll(queryDto: ListDiscussionPostsQueryDto, userId: string) {
    let chapterIds: string[];
    let lessonId: string | null = null;
    const courseLocations = new Map<
      string,
      { title: string; slug: string }
    >();
    const chapterLocations = new Map<
      string,
      { title: string; course_id: string }
    >();

    if (queryDto.scope === 'all') {
      if (queryDto.course_id || queryDto.chapter_id || queryDto.lesson_id) {
        throw new BadRequestException(
          'Phạm vi tất cả không được kèm khóa học, chương hoặc bài học',
        );
      }

      const { data: courses, error: courseError } = await this.db
        .from('courses')
        .select('id, title, slug')
        .eq('status', 'published');

      if (courseError) this.databaseError(courseError);
      for (const course of courses ?? []) {
        courseLocations.set(course.id, {
          title: course.title,
          slug: course.slug,
        });
      }

      const courseIds = [...courseLocations.keys()];
      if (courseIds.length === 0) {
        return { items: [], next_cursor: null };
      }

      const { data: chapters, error: chapterError } = await this.db
        .from('chapters')
        .select('id, title, course_id')
        .in('course_id', courseIds)
        .eq('status', 'published');

      if (chapterError) this.databaseError(chapterError);
      for (const chapter of chapters ?? []) {
        chapterLocations.set(chapter.id, {
          title: chapter.title,
          course_id: chapter.course_id,
        });
      }

      chapterIds = [...chapterLocations.keys()];
      if (chapterIds.length === 0) {
        return { items: [], next_cursor: null };
      }
    } else if (queryDto.course_id) {
      if (queryDto.lesson_id) {
        throw new BadRequestException(
          'Không thể lọc đồng thời theo khóa học và bài học',
        );
      }

      const { data: course, error: courseError } = await this.db
        .from('courses')
        .select('id, status')
        .eq('id', queryDto.course_id)
        .maybeSingle();

      if (courseError) this.databaseError(courseError);
      if (!course || course.status !== 'published') {
        throw new NotFoundException('Không tìm thấy khóa học đã xuất bản');
      }

      let chapterQuery = this.db
        .from('chapters')
        .select('id')
        .eq('course_id', queryDto.course_id)
        .eq('status', 'published');

      if (queryDto.chapter_id) {
        chapterQuery = chapterQuery.eq('id', queryDto.chapter_id);
      }

      const { data: chapters, error: chapterError } = await chapterQuery;
      if (chapterError) this.databaseError(chapterError);

      chapterIds = (chapters ?? []).map((chapter) => chapter.id);
      if (queryDto.chapter_id && chapterIds.length === 0) {
        throw new NotFoundException(
          'Không tìm thấy chương đã xuất bản trong khóa học',
        );
      }
      if (chapterIds.length === 0) {
        return { items: [], next_cursor: null };
      }
    } else {
      const location = await this.validateLocation(
        {
          chapter_id: queryDto.chapter_id,
          lesson_id: queryDto.lesson_id,
        },
        true,
      );
      chapterIds = [location.chapterId];
      lessonId = location.lessonId;
    }

    const limit = queryDto.limit ?? 20;
    const cursor = decodeDiscussionCursor(queryDto.cursor);
    const search = queryDto.search?.trim();

    let query = this.db
      .from('discussion_posts')
      .select(`
        id,
        chapter_id,
        lesson_id,
        author_id,
        post_type,
        title,
        content,
        resource_url,
        status,
        created_at,
        updated_at,
        deleted_at
      `)
      .in('chapter_id', chapterIds)
      .eq('status', 'visible')
      .is('deleted_at', null);

    if (lessonId) query = query.eq('lesson_id', lessonId);
    if (queryDto.post_type) query = query.eq('post_type', queryDto.post_type);
    if (search) {
      query = query.textSearch('search_vector', search, {
        config: 'simple',
        type: 'websearch',
      });
    }
    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (error) this.databaseError(error);

    const rows = (data ?? []) as DiscussionPostRow[];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const commentCounts = await this.getCommentCounts(
      pageRows.map((post) => post.id),
    );
    const lessonLocations = new Map<string, string>();

    if (queryDto.scope === 'all') {
      const lessonIds = [
        ...new Set(
          pageRows
            .map((post) => post.lesson_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      if (lessonIds.length > 0) {
        const { data: lessons, error: lessonError } = await this.db
          .from('lessons')
          .select('id, title')
          .in('id', lessonIds);

        if (lessonError) this.databaseError(lessonError);
        for (const lesson of lessons ?? []) {
          lessonLocations.set(lesson.id, lesson.title);
        }
      }
    }

    return {
      items: pageRows.map((post) => {
        const chapter = chapterLocations.get(post.chapter_id);
        const course = chapter
          ? courseLocations.get(chapter.course_id)
          : undefined;

        return {
          id: post.id,
          chapter_id: post.chapter_id,
          lesson_id: post.lesson_id,
          author_id: post.author_id,
          post_type: post.post_type,
          title: post.title,
          content_preview:
            post.content.length > 240
              ? `${post.content.slice(0, 237)}...`
              : post.content,
          resource_url: post.resource_url,
          created_at: post.created_at,
          updated_at: post.updated_at,
          is_mine: post.author_id === userId,
          comment_count: commentCounts.get(post.id) ?? 0,
          ...(chapter && course
            ? {
                course_id: chapter.course_id,
                course_title: course.title,
                course_slug: course.slug,
                chapter_title: chapter.title,
                lesson_title: post.lesson_id
                  ? lessonLocations.get(post.lesson_id) ?? null
                  : null,
              }
            : {}),
        };
      }),
      next_cursor:
        hasMore && pageRows.length > 0
          ? encodeDiscussionCursor(pageRows[pageRows.length - 1])
          : null,
    };
  }

  async findOne(id: string, userId: string) {
    const post = await this.assertPostAccessible(id);
    const commentCounts = await this.getCommentCounts([post.id]);

    return {
      ...post,
      is_mine: post.author_id === userId,
      comment_count: commentCounts.get(post.id) ?? 0,
    };
  }

  async assertPostAccessible(id: string): Promise<DiscussionPostRow> {
    const { data, error } = await this.db
      .from('discussion_posts')
      .select(`
        id,
        chapter_id,
        lesson_id,
        author_id,
        post_type,
        title,
        content,
        resource_url,
        status,
        created_at,
        updated_at,
        deleted_at
      `)
      .eq('id', id)
      .eq('status', 'visible')
      .is('deleted_at', null)
      .maybeSingle();

    if (error) this.databaseError(error);
    if (!data) throw new NotFoundException('Không tìm thấy bài đăng');

    const post = data as DiscussionPostRow;
    await this.validateLocation(
      post.lesson_id
        ? { lesson_id: post.lesson_id }
        : { chapter_id: post.chapter_id },
      true,
    );

    return post;
  }

  private async getCommentCounts(postIds: string[]) {
    const counts = new Map<string, number>();
    if (postIds.length === 0) return counts;

    const { data, error } = await this.db
      .from('discussion_comments')
      .select('post_id')
      .in('post_id', postIds)
      .eq('status', 'visible')
      .is('deleted_at', null);

    if (error) this.databaseError(error);

    for (const row of data ?? []) {
      counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
    }

    return counts;
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
