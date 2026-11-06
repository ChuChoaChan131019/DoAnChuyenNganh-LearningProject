import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../config/supabase.service.js';

import { DiscussionPostsService } from './discussion-posts.service.js';
import {
  decodeDiscussionCursor,
  encodeDiscussionCursor,
} from './discussion-cursor.js';
import {
  CreateDiscussionCommentDto,
  UpdateDiscussionCommentDto,
} from './dto/discussion-comment.dto.js';
import { ListDiscussionCommentsQueryDto } from './dto/discussion-query.dto.js';

type DiscussionCommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  status: 'visible' | 'hidden' | 'removed';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

@Injectable()
export class DiscussionCommentsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly postsService: DiscussionPostsService,
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  private databaseError(error: { code?: string }): never {
    if (['23502', '23503', '23514', '22P02'].includes(error.code ?? '')) {
      throw new BadRequestException('Dữ liệu bình luận không hợp lệ');
    }
    throw new InternalServerErrorException('Không thể xử lý dữ liệu bình luận');
  }

  private cleanContent(value: unknown) {
    if (typeof value !== 'string') {
      throw new BadRequestException('Nội dung bình luận phải là chuỗi ký tự');
    }
    const content = value.trim();
    if (content.length < 1 || content.length > 5000) {
      throw new BadRequestException(
        'Nội dung bình luận phải có từ 1 đến 5000 ký tự',
      );
    }
    return content;
  }

  async findAll(
    postId: string,
    queryDto: ListDiscussionCommentsQueryDto,
    userId: string,
  ) {
    await this.postsService.assertPostAccessible(postId);

    const limit = queryDto.limit ?? 30;
    const cursor = decodeDiscussionCursor(queryDto.cursor);
    let query = this.db
      .from('discussion_comments')
      .select('*')
      .eq('post_id', postId)
      .eq('status', 'visible')
      .is('deleted_at', null);

    if (cursor) {
      query = query.or(
        `created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`,
      );
    }

    const { data, error } = await query
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(limit + 1);

    if (error) this.databaseError(error);

    const rows = (data ?? []) as DiscussionCommentRow[];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: pageRows.map((comment) => ({
        ...comment,
        is_mine: comment.author_id === userId,
      })),
      next_cursor:
        hasMore && pageRows.length > 0
          ? encodeDiscussionCursor(pageRows[pageRows.length - 1])
          : null,
    };
  }

  async create(
    postId: string,
    dto: CreateDiscussionCommentDto,
    userId: string,
  ) {
    await this.postsService.assertPostAccessible(postId);

    const { data, error } = await this.db
      .from('discussion_comments')
      .insert({
        post_id: postId,
        author_id: userId,
        content: this.cleanContent(dto.content),
        status: 'visible',
      })
      .select('*')
      .single();

    if (error) this.databaseError(error);
    return { ...data, is_mine: true };
  }

  async update(
    id: string,
    dto: UpdateDiscussionCommentDto,
    userId: string,
  ) {
    const existing = await this.findOwnedComment(id, userId, 'sửa');
    await this.postsService.assertPostAccessible(existing.post_id);

    const { data, error } = await this.db
      .from('discussion_comments')
      .update({
        content: this.cleanContent(dto.content),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('author_id', userId)
      .eq('status', 'visible')
      .is('deleted_at', null)
      .select('*')
      .maybeSingle();

    if (error) this.databaseError(error);
    if (!data) throw new NotFoundException('Bình luận không còn có thể chỉnh sửa');
    return { ...data, is_mine: true };
  }

  async remove(id: string, userId: string) {
    const existing = await this.findOwnedComment(id, userId, 'xóa');
    await this.postsService.assertPostAccessible(existing.post_id);
    const now = new Date().toISOString();

    const { data, error } = await this.db
      .from('discussion_comments')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id)
      .eq('author_id', userId)
      .eq('status', 'visible')
      .is('deleted_at', null)
      .select('id, deleted_at')
      .maybeSingle();

    if (error) this.databaseError(error);
    if (!data) throw new NotFoundException('Bình luận không còn có thể xóa');

    return { id: data.id, deleted: true, deleted_at: data.deleted_at };
  }

  private async findOwnedComment(
    id: string,
    userId: string,
    action: 'sửa' | 'xóa',
  ): Promise<Pick<DiscussionCommentRow, 'id' | 'post_id'>> {
    const { data, error } = await this.db
      .from('discussion_comments')
      .select('id, post_id')
      .eq('id', id)
      .eq('author_id', userId)
      .eq('status', 'visible')
      .is('deleted_at', null)
      .maybeSingle();

    if (error) this.databaseError(error);
    if (!data) {
      throw new NotFoundException(
        `Bình luận không tồn tại hoặc bạn không có quyền ${action}`,
      );
    }
    return data;
  }
}
