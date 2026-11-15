import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { DiscussionPostsService } from './discussion-posts.service.js';
import { CreateDiscussionReportDto, ResolveDiscussionReportDto } from './dto/discussion-report.dto.js';

type ReportRow = {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  moderator_reason: string | null;
  post?: { id: string; title: string; content: string; chapter_id: string; lesson_id: string | null; status: string } | null;
  comment?: { id: string; content: string; post_id: string; status: string } | null;
};

@Injectable()
export class DiscussionReportsService {
  private readonly logger = new Logger(DiscussionReportsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly postsService: DiscussionPostsService,
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  private dbError(error: { code?: string; message?: string }): never {
    this.logger.error(`Discussion report database error ${error.code ?? 'unknown'}: ${error.message ?? 'No details'}`);
    if (error.code === '23505') throw new ConflictException('Bạn đã báo cáo nội dung này và đang chờ xử lý');
    if (['PGRST205', 'PGRST202', '42P01', '42883'].includes(error.code ?? '')) {
      throw new ServiceUnavailableException('Chức năng báo cáo chưa được cập nhật trên cơ sở dữ liệu');
    }
    if (['23502', '23503', '23514', '22P02', '22023'].includes(error.code ?? '')) {
      throw new BadRequestException('Dữ liệu báo cáo không hợp lệ');
    }
    throw new InternalServerErrorException('Không thể xử lý báo cáo');
  }

  async create(dto: CreateDiscussionReportDto, reporterId: string) {
    const reason = dto.reason?.trim();
    if (!reason || reason.length < 10 || reason.length > 1000) {
      throw new BadRequestException('Lý do báo cáo phải có từ 10 đến 1000 ký tự');
    }
    if (dto.target_type === 'post') {
      await this.postsService.assertPostAccessible(dto.target_id);
    } else if (dto.target_type === 'comment') {
      const { data, error } = await this.db.from('discussion_comments')
        .select('post_id').eq('id', dto.target_id)
        .eq('status', 'visible').is('deleted_at', null).maybeSingle();
      if (error) this.dbError(error);
      if (!data) throw new NotFoundException('Không tìm thấy bình luận');
      await this.postsService.assertPostAccessible(data.post_id);
    } else {
      throw new BadRequestException('Loại nội dung báo cáo không hợp lệ');
    }

    const { data, error } = await this.db.from('discussion_reports').insert({
      post_id: dto.target_type === 'post' ? dto.target_id : null,
      comment_id: dto.target_type === 'comment' ? dto.target_id : null,
      reporter_id: reporterId,
      reason,
    }).select('id, status, created_at').single();
    if (error) this.dbError(error);
    return data;
  }

  async list(status = 'pending', rawLimit?: string, rawOffset?: string) {
    if (!['pending', 'dismissed', 'hidden', 'removed', 'all'].includes(status)) {
      throw new BadRequestException('Trạng thái báo cáo không hợp lệ');
    }
    const limit = rawLimit === undefined ? 30 : Number(rawLimit);
    const offset = rawOffset === undefined ? 0 : Number(rawOffset);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50 ||
        !Number.isInteger(offset) || offset < 0) {
      throw new BadRequestException('Phân trang báo cáo không hợp lệ');
    }

    let query = this.db.from('discussion_reports')
      .select(`id, post_id, comment_id, reason, status, created_at, resolved_at,
        moderator_reason,
        post:discussion_posts!discussion_reports_post_id_fkey(id, title, content, chapter_id, lesson_id, status),
        comment:discussion_comments!discussion_reports_comment_id_fkey(id, content, post_id, status)`, { count: 'exact' });
    if (status !== 'all') query = query.eq('status', status);
    const { data, error, count } = await query.order('created_at', { ascending: false })
      .order('id', { ascending: false }).range(offset, offset + limit - 1);
    if (error) this.dbError(error);
    const rows = (data ?? []) as unknown as ReportRow[];

    const postIds = [...new Set(rows.map((row) => row.comment?.post_id).filter((id): id is string => Boolean(id)))];
    const { data: parentPosts, error: parentsError } = postIds.length
      ? await this.db.from('discussion_posts').select('id, title, chapter_id, lesson_id').in('id', postIds)
      : { data: [], error: null };
    if (parentsError) this.dbError(parentsError);
    const parents = new Map((parentPosts ?? []).map((row) => [row.id, row]));
    const chapterIds = [...new Set(rows.map((row) => row.post?.chapter_id ?? parents.get(row.comment?.post_id ?? '')?.chapter_id).filter((id): id is string => Boolean(id)))];
    const lessonIds = [...new Set(rows.map((row) => row.post?.lesson_id ?? parents.get(row.comment?.post_id ?? '')?.lesson_id).filter((id): id is string => Boolean(id)))];
    const [{ data: chapters, error: chapterError }, { data: lessons, error: lessonError }] = await Promise.all([
      chapterIds.length ? this.db.from('chapters').select('id, title').in('id', chapterIds) : Promise.resolve({ data: [], error: null }),
      lessonIds.length ? this.db.from('lessons').select('id, title').in('id', lessonIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (chapterError) this.dbError(chapterError);
    if (lessonError) this.dbError(lessonError);
    const chapterNames = new Map((chapters ?? []).map((row) => [row.id, row.title]));
    const lessonNames = new Map((lessons ?? []).map((row) => [row.id, row.title]));

    return {
      items: rows.map((row) => {
        const parent = row.post ?? parents.get(row.comment?.post_id ?? '') ?? null;
        return {
          id: row.id,
          target_type: row.post_id ? 'post' : 'comment',
          target_id: row.post_id ?? row.comment_id,
          reason: row.reason,
          status: row.status,
          created_at: row.created_at,
          resolved_at: row.resolved_at,
          moderator_reason: row.moderator_reason,
          content: row.post?.content ?? row.comment?.content ?? null,
          content_status: row.post?.status ?? row.comment?.status ?? null,
          post_id: row.post_id ?? row.comment?.post_id ?? null,
          post_title: parent?.title ?? null,
          chapter_id: parent?.chapter_id ?? null,
          chapter_title: parent?.chapter_id ? chapterNames.get(parent.chapter_id) ?? null : null,
          lesson_id: parent?.lesson_id ?? null,
          lesson_title: parent?.lesson_id ? lessonNames.get(parent.lesson_id) ?? null : null,
        };
      }),
      total: count ?? 0,
      limit,
      offset,
    };
  }

  async resolve(id: string, dto: ResolveDiscussionReportDto, moderatorId: string) {
    const reason = dto.reason?.trim();
    if (!['dismissed', 'hidden', 'removed'].includes(dto.decision) ||
        !reason || reason.length < 10 || reason.length > 1000) {
      throw new BadRequestException('Quyết định và lý do xử lý không hợp lệ');
    }
    const { data, error } = await this.db.rpc('resolve_discussion_report', {
      p_report_id: id,
      p_moderator_id: moderatorId,
      p_decision: dto.decision,
      p_reason: reason,
    });
    if (error?.code === 'P0002') throw new NotFoundException('Không tìm thấy báo cáo');
    if (error?.code === 'P0001') throw new ConflictException('Báo cáo hoặc nội dung đã được xử lý');
    if (error) this.dbError(error);
    return data;
  }
}
