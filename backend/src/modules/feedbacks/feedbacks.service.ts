import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { CreateFeedbackDto } from './dto/create-feedback.dto.js';
import { UpdateFeedbackDto } from './dto/update-feedback.dto.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class FeedbacksService {
  private readonly logger = new Logger(FeedbacksService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Đảm bảo chuỗi truyền vào là UUID hợp lệ cho cột course_id trong Postgres
   */
  private async ensureValidCourseUuid(courseId: string): Promise<string> {
    if (UUID_REGEX.test(courseId)) {
      return courseId;
    }

    const supabase = this.supabaseService.getAdminClient();
    const { data: firstCourse } = await supabase
      .from('courses')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (firstCourse?.id) {
      return firstCourse.id;
    }

    return 'a0000000-0000-0000-0000-000000000001';
  }

  /**
   * Lấy danh sách học viên có thể gửi Feedback.
   * Ưu tiên học viên ghi danh vào khóa học; nếu chưa có enrollment thì lấy danh sách learner trong hệ thống.
   */
  async getLearners(courseId?: string): Promise<any[]> {
    const supabase = this.supabaseService.getAdminClient();

    try {
      let targetLearnerIds: string[] = [];

      // 1. Nếu có courseId và là UUID hợp lệ, thử tìm trong course_enrollments
      if (courseId && UUID_REGEX.test(courseId)) {
        const { data: enrollments, error: enrollError } = await supabase
          .from('course_enrollments')
          .select('learner_id')
          .eq('course_id', courseId)
          .eq('status', 'active');

        if (!enrollError && enrollments && enrollments.length > 0) {
          targetLearnerIds = enrollments.map((e: any) => e.learner_id);
        }
      }

      // 2. Nếu chưa có học viên nào từ enrollment, fallback lấy toàn bộ profiles có role = 'learner'
      if (targetLearnerIds.length === 0) {
        const { data: learnerProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'learner');

        targetLearnerIds = (learnerProfiles || []).map((p: any) => p.id);
      }

      if (targetLearnerIds.length === 0) {
        return [];
      }

      // 3. Lấy thông tin họ tên & email từ Supabase Auth
      const { data: userListData } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      const usersMap = new Map<string, { name: string; email: string }>();
      if (userListData?.users) {
        for (const u of userListData.users) {
          usersMap.set(u.id, {
            name: (u.user_metadata?.full_name as string) || u.email || 'Learner',
            email: u.email || '',
          });
        }
      }

      return targetLearnerIds.map((id) => {
        const userInfo = usersMap.get(id);
        return {
          id,
          name: userInfo?.name || 'Learner',
          email: userInfo?.email || '',
        };
      });
    } catch (err: any) {
      this.logger.error(`Error fetching learners for feedback: ${err?.message}`);
      return [];
    }
  }

  /**
   * Lấy danh sách Feedback do Content Manager này tạo
   */
  async findAll(managerId: string, statusFilter?: string): Promise<any[]> {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('feedbacks')
      .select('*')
      .eq('manager_id', managerId)
      .order('created_at', { ascending: false });

    if (statusFilter && (statusFilter === 'draft' || statusFilter === 'sent')) {
      query = query.eq('status', statusFilter);
    }

    const { data: feedbacks, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch feedbacks: ${error.message}`);
      return [];
    }

    // Lấy thông tin user để enrich learnerName & learnerEmail
    const { data: userListData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    const usersMap = new Map<string, { name: string; email: string }>();
    if (userListData?.users) {
      for (const u of userListData.users) {
        usersMap.set(u.id, {
          name: (u.user_metadata?.full_name as string) || u.email || 'Learner',
          email: u.email || '',
        });
      }
    }

    // Lấy tên khóa học nếu có
    const { data: courses } = await supabase.from('courses').select('id, title');
    const coursesMap = new Map<string, string>();
    if (courses) {
      for (const c of courses) {
        coursesMap.set(c.id, c.title);
      }
    }

    return (feedbacks || []).map((f: any) => {
      const learner = usersMap.get(f.learner_id);
      return {
        id: f.id,
        managerId: f.manager_id,
        learnerId: f.learner_id,
        learnerName: learner?.name || 'Learner',
        learnerEmail: learner?.email || '',
        courseId: f.course_id,
        courseTitle: coursesMap.get(f.course_id) || f.course_id,
        content: f.content,
        contextType: f.context_type || 'general',
        contextId: f.context_id,
        contextSnapshot: f.context_snapshot,
        status: f.status,
        sentAt: f.sent_at,
        readAt: f.read_at,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      };
    });
  }

  /**
   * Lấy chi tiết một Feedback
   */
  async findOne(managerId: string, id: string): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('id', id)
      .eq('manager_id', managerId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Feedback not found');
    }

    return data;
  }

  /**
   * Tạo Feedback mới (status: draft hoặc sent)
   */
  async create(managerId: string, dto: CreateFeedbackDto): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();
    const validCourseId = await this.ensureValidCourseUuid(dto.courseId);
    const status = dto.status || 'draft';
    const sentAt = status === 'sent' ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from('feedbacks')
      .insert({
        manager_id: managerId,
        learner_id: dto.learnerId,
        course_id: validCourseId,
        content: dto.content.trim(),
        context_type: dto.contextType || 'general',
        context_id: dto.contextId && UUID_REGEX.test(dto.contextId) ? dto.contextId : null,
        context_snapshot: dto.contextSnapshot || null,
        status,
        sent_at: sentAt,
        read_at: null,
      })
      .select('*')
      .single();

    if (error || !data) {
      this.logger.error(`Failed to create feedback: ${error?.message}`);
      throw new HttpException(
        { error: { code: 'FAILED_TO_CREATE_FEEDBACK', message: error?.message || 'Failed to create feedback' } },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // AC-T29: Nếu gửi luôn (status === 'sent'), tự động tạo In-app Notification cho Learner
    if (status === 'sent') {
      await this.createNotificationForFeedback(managerId, data);
    }

    return data;
  }

  /**
   * Cập nhật Feedback (chỉ cho phép khi status === 'draft')
   */
  async update(managerId: string, id: string, dto: UpdateFeedbackDto): Promise<any> {
    const existing = await this.findOne(managerId, id);

    if (existing.status !== 'draft') {
      throw new HttpException(
        { error: { code: 'FEEDBACK_IMMUTABLE', message: 'Feedback đã gửi không thể chỉnh sửa (AC-T28)' } },
        HttpStatus.BAD_REQUEST,
      );
    }

    const supabase = this.supabaseService.getAdminClient();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.content !== undefined) updatePayload.content = dto.content.trim();
    if (dto.contextType !== undefined) updatePayload.context_type = dto.contextType;
    if (dto.contextId !== undefined) {
      updatePayload.context_id = dto.contextId && UUID_REGEX.test(dto.contextId) ? dto.contextId : null;
    }
    if (dto.contextSnapshot !== undefined) updatePayload.context_snapshot = dto.contextSnapshot;

    const { data, error } = await supabase
      .from('feedbacks')
      .update(updatePayload)
      .eq('id', id)
      .eq('manager_id', managerId)
      .select('*')
      .single();

    if (error || !data) {
      throw new HttpException(
        { error: { code: 'FAILED_TO_UPDATE_FEEDBACK', message: error?.message || 'Failed to update feedback' } },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return data;
  }

  /**
   * Xóa Feedback (chỉ cho phép khi status === 'draft')
   */
  async delete(managerId: string, id: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.findOne(managerId, id);

    if (existing.status !== 'draft') {
      throw new HttpException(
        { error: { code: 'FEEDBACK_IMMUTABLE', message: 'Feedback đã gửi không thể xóa (AC-T28)' } },
        HttpStatus.BAD_REQUEST,
      );
    }

    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from('feedbacks')
      .delete()
      .eq('id', id)
      .eq('manager_id', managerId);

    if (error) {
      throw new HttpException(
        { error: { code: 'FAILED_TO_DELETE_FEEDBACK', message: error.message } },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { success: true, message: 'Đã xóa bản nháp phản hồi thành công' };
  }

  /**
   * Chuyển Feedback từ draft sang sent
   */
  async send(managerId: string, id: string): Promise<any> {
    const existing = await this.findOne(managerId, id);

    if (existing.status === 'sent') {
      return existing;
    }

    const supabase = this.supabaseService.getAdminClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('feedbacks')
      .update({
        status: 'sent',
        sent_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .eq('manager_id', managerId)
      .select('*')
      .single();

    if (error || !data) {
      throw new HttpException(
        { error: { code: 'FAILED_TO_SEND_FEEDBACK', message: error?.message || 'Failed to send feedback' } },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // AC-T29: Tự động tạo In-app Notification cho Learner
    await this.createNotificationForFeedback(managerId, data);

    return data;
  }

  /**
   * Helper: Tạo In-app Notification cho Learner khi nhận được Feedback mới
   */
  private async createNotificationForFeedback(managerId: string, feedback: any) {
    try {
      const supabase = this.supabaseService.getAdminClient();
      const snippet = feedback.content.length > 120
        ? `${feedback.content.slice(0, 120)}...`
        : feedback.content;

      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert({
          created_by: managerId,
          notification_type: 'feedback',
          title: 'Bạn có phản hồi mới từ Content Manager',
          content: snippet,
          scope_type: 'individual',
          scope_value: feedback.learner_id,
          send_email: false,
          status: 'sent',
          sent_at: new Date().toISOString(),
          reference_type: 'feedback',
          reference_id: feedback.id,
        })
        .select('id')
        .single();

      if (!notifError && notification?.id) {
        await supabase.from('notification_recipients').insert({
          notification_id: notification.id,
          user_id: feedback.learner_id,
          read_at: null,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed to generate notification for feedback ${feedback.id}: ${err?.message}`);
    }
  }
}
