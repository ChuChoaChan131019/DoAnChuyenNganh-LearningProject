import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../config/supabase.service.js';
import { DiscussionPostsService } from './discussion-posts.service.js';

type HelpfulKind = 'post' | 'comment';

type HelpfulStatRow = {
  target_id: string;
  helpful_count: number;
  is_helpful: boolean;
};

type HelpfulState = {
  helpful_count: number;
  is_helpful: boolean;
};

@Injectable()
export class DiscussionHelpfulService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly postsService: DiscussionPostsService,
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  private readonly uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Kiểm tra danh sách ID gửi lên
  private validateIds(value: unknown): string[] {
    const ids = value ?? [];

    if (
      !Array.isArray(ids) ||
      ids.length > 50 ||
      ids.some(
        (id) =>
          typeof id !== 'string' ||
          !this.uuidPattern.test(id),
      )
    ) {
      throw new BadRequestException(
        'Danh sách ID không hợp lệ hoặc vượt quá 50 phần tử',
      );
    }

    return [...new Set(ids)] as string[];
  }

  // Lấy số lượt hữu ích và trạng thái của người dùng
  private async getStats(
    kind: HelpfulKind,
    ids: string[],
    userId: string,
  ): Promise<HelpfulStatRow[]> {
    if (ids.length === 0) return [];

    const functionName =
      kind === 'post'
        ? 'discussion_post_helpful_stats'
        : 'discussion_comment_helpful_stats';

    const { data, error } = await this.db.rpc(functionName, {
      p_ids: ids,
      p_user_id: userId,
    });

    if (error) {
      throw new InternalServerErrorException(
        'Không thể lấy thống kê hữu ích',
      );
    }

    return (data ?? []).map((row: HelpfulStatRow) => ({
      target_id: row.target_id as string,
      helpful_count: Number(row.helpful_count),
      is_helpful: Boolean(row.is_helpful),
    }));
  }

  // API trả thống kê hàng loạt, dùng cho danh sách thảo luận
  async summary(
    body: {
      post_ids?: unknown;
      comment_ids?: unknown;
    },
    userId: string,
  ) {
    const postIds = this.validateIds(body?.post_ids);
    const commentIds = this.validateIds(body?.comment_ids);

    const [postStats, commentStats] = await Promise.all([
      this.getStats('post', postIds, userId),
      this.getStats('comment', commentIds, userId),
    ]);

    const toRecord = (rows: HelpfulStatRow[]) =>
      Object.fromEntries(
        rows.map((row) => [
          row.target_id,
          {
            helpful_count: row.helpful_count,
            is_helpful: row.is_helpful,
          },
        ]),
      );

    return {
      posts: toRecord(postStats),
      comments: toRecord(commentStats),
    };
  }

  // Chỉ cho đánh dấu nội dung còn hiển thị
  private async assertAccessible(
    kind: HelpfulKind,
    targetId: string,
  ) {
    if (kind === 'post') {
      await this.postsService.assertPostAccessible(targetId);
      return;
    }

    const { data, error } = await this.db
      .from('discussion_comments')
      .select('id, post_id')
      .eq('id', targetId)
      .eq('status', 'visible')
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'Không thể kiểm tra bình luận',
      );
    }

    if (!data) {
      throw new NotFoundException(
        'Không tìm thấy bình luận',
      );
    }

    await this.postsService.assertPostAccessible(data.post_id);
  }

  // Đánh dấu hoặc bỏ đánh dấu hữu ích
  private async changeHelpful(
    kind: HelpfulKind,
    targetId: string,
    userId: string,
    mark: boolean,
  ): Promise<HelpfulState> {
    await this.assertAccessible(kind, targetId);

    const table =
      kind === 'post'
        ? 'discussion_post_helpful_votes'
        : 'discussion_comment_helpful_votes';

    const idColumn =
      kind === 'post' ? 'post_id' : 'comment_id';

    if (mark) {
      // ignoreDuplicates:
      // Cùng tài khoản bấm nhiều lần cũng chỉ có 1 dòng.
      const { error } = await this.db
        .from(table)
        .upsert(
          {
            [idColumn]: targetId,
            user_id: userId,
          },
          {
            onConflict: `${idColumn},user_id`,
            ignoreDuplicates: true,
          },
        );

      if (error) {
        throw new InternalServerErrorException(
          'Không thể đánh dấu hữu ích',
        );
      }
    } else {
      // Chỉ xóa lượt đánh dấu của chính tài khoản.
      const { error } = await this.db
        .from(table)
        .delete()
        .eq(idColumn, targetId)
        .eq('user_id', userId);

      if (error) {
        throw new InternalServerErrorException(
          'Không thể bỏ đánh dấu hữu ích',
        );
      }
    }

    // Đọc lại thống kê từ database
    const rows = await this.getStats(
      kind,
      [targetId],
      userId,
    );

    const row = rows[0];

    if (!row) {
      throw new NotFoundException(
        'Nội dung không còn khả dụng',
      );
    }

    return {
      helpful_count: row.helpful_count,
      is_helpful: row.is_helpful,
    };
  }

  markPost(postId: string, userId: string) {
    return this.changeHelpful('post', postId, userId, true);
  }

  unmarkPost(postId: string, userId: string) {
    return this.changeHelpful('post', postId, userId, false);
  }

  markComment(commentId: string, userId: string) {
    return this.changeHelpful('comment', commentId, userId, true);
  }

  unmarkComment(commentId: string, userId: string) {
    return this.changeHelpful('comment', commentId, userId, false);
  }
}