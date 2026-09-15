import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Lấy danh sách học viên active thuộc một khóa học để chọn người nhận
   */
  async getCourseLearners(courseId: string): Promise<any[]> {
    const supabase = this.supabaseService.getAdminClient();

    try {
      // 1. Lấy danh sách ghi danh có trạng thái active
      const { data: enrollments, error: enrollError } = await supabase
        .from('course_enrollments')
        .select('learner_id')
        .eq('course_id', courseId)
        .eq('status', 'active');

      let targetLearnerIds: string[] = [];

      if (!enrollError && enrollments && enrollments.length > 0) {
        targetLearnerIds = enrollments.map((e: any) => e.learner_id);
      }
      // Không có enrollment → không gửi cho ai (không fallback toàn hệ thống)

      if (targetLearnerIds.length === 0) {
        return [];
      }

      // 2. Lấy thông tin email và full_name từ Supabase Auth
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
      this.logger.error(`Error fetching course learners: ${err?.message}`);
      return [];
    }
  }

  /**
   * Tạo và gửi thông báo mới cho học viên
   */
  async sendNotification(
    managerId: string,
    dto: CreateNotificationDto,
  ): Promise<{ notification: any; recipientCount: number }> {
    const supabase = this.supabaseService.getAdminClient();

    // 1. Xác định danh sách học viên nhận thông báo
    let recipientIds: string[] = [];

    if (dto.scopeType === 'individual') {
      recipientIds = dto.recipientIds || [];
    } else {
      // Gửi toàn khóa học: lấy danh sách học viên active
      const learners = await this.getCourseLearners(dto.courseId);
      recipientIds = learners.map((l) => l.id);
    }

    // 2. Kiểm tra định dạng UUID cho reference_id nếu courseId là UUID chuẩn
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.courseId);

    // 3. Tạo bản ghi thông báo trong bảng notifications
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        created_by: managerId,
        notification_type: 'learning',
        title: dto.title.trim(),
        content: dto.content.trim(),
        scope_type: dto.scopeType,
        scope_value: dto.courseId,
        send_email: false,
        status: 'sent',
        sent_at: new Date().toISOString(),
        reference_type: 'course',
        reference_id: isUuid ? dto.courseId : null,
      })
      .select('*')
      .single();

    if (notifError || !notification) {
      this.logger.error(`Failed to create notification: ${notifError?.message}`);
      throw new HttpException(
        { error: { code: 'FAILED_TO_CREATE_NOTIFICATION', message: notifError?.message || 'Failed to create notification' } },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // 4. Lưu từng người nhận vào bảng notification_recipients
    if (recipientIds.length > 0) {
      const recipientRecords = recipientIds.map((recId) => ({
        notification_id: notification.id,
        user_id: recId,
        read_at: null,
      }));

      const { error: recError } = await supabase
        .from('notification_recipients')
        .insert(recipientRecords);

      if (recError) {
        this.logger.warn(`Failed to insert recipients for notification ${notification.id}: ${recError.message}`);
      }
    }

    return {
      notification,
      recipientCount: recipientIds.length,
    };
  }

  /**
   * Lấy danh sách các thông báo do Content Manager này đã gửi
   */
  async getSentNotifications(managerId: string): Promise<any[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('*, notification_recipients(id, user_id, read_at)')
      .eq('created_by', managerId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to get sent notifications: ${error.message}`);
      return [];
    }

    return (data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      scopeType: n.scope_type,
      courseId: n.scope_value,
      recipientCount: n.notification_recipients?.length || 0,
      sentAt: n.sent_at || n.created_at,
      createdAt: n.created_at,
    }));
  }
}
