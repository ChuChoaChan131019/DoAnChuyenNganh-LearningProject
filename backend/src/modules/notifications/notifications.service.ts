import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { CreateAdminNotificationDto } from './dto/create-admin-notification.dto.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';

type AdminNotificationType = 'General' | 'Warning' | 'Maintenance';
type AdminNotificationAudience = 'all' | 'learner' | 'content_manager' | 'admin';
type AdminNotificationRecipientAudience = Exclude<AdminNotificationAudience, 'admin'>;

const ADMIN_NOTIFICATION_REFERENCE_PREFIX = 'admin-system:';
const SCHEDULE_POLL_INTERVAL_MS = 30_000;

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private scheduledPublishTimer?: NodeJS.Timeout;
  private isPublishingScheduledNotifications = false;

  constructor(private readonly supabaseService: SupabaseService) {}

  onModuleInit() {
    void this.publishDueAdminNotifications();
    this.scheduledPublishTimer = setInterval(() => {
      void this.publishDueAdminNotifications();
    }, SCHEDULE_POLL_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.scheduledPublishTimer) {
      clearInterval(this.scheduledPublishTimer);
    }
  }

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

  /**
   * Admin system notifications are intentionally separate from the existing
   * Content Manager notification API. The shared table uses `system` as its
   * broad notification type; the Admin-specific subtype is kept in
   * `reference_type` so no schema migration is required.
   */
  async createAdminNotification(
    adminId: string,
    dto: CreateAdminNotificationDto,
  ) {
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
      throw new HttpException(
        {
          error: {
            code: 'INVALID_SCHEDULE_TIME',
            message: 'Scheduled time must be in the future',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const recipientIds = await this.getAdminRecipientIds(dto.audience);
    const supabase = this.supabaseService.getAdminClient();
    const now = new Date().toISOString();
    const status = scheduledAt ? 'scheduled' : 'sent';

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        created_by: adminId,
        notification_type: 'system',
        title: dto.title.trim(),
        content: dto.content.trim(),
        scope_type: dto.audience === 'all' ? 'all' : 'role',
        scope_value: dto.audience === 'all' ? null : dto.audience,
        send_email: Boolean(dto.sendEmail),
        status,
        scheduled_at: scheduledAt?.toISOString() ?? null,
        sent_at: scheduledAt ? null : now,
        reference_type: `${ADMIN_NOTIFICATION_REFERENCE_PREFIX}${dto.type}`,
        reference_id: null,
      })
      .select('*')
      .single();

    if (notificationError || !notification) {
      this.logger.error(
        `Failed to create admin notification: ${notificationError?.message}`,
      );
      throw new HttpException(
        {
          error: {
            code: 'FAILED_TO_CREATE_NOTIFICATION',
            message:
              notificationError?.message || 'Failed to create notification',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (recipientIds.length > 0) {
      const { error: recipientsError } = await supabase
        .from('notification_recipients')
        .insert(
          recipientIds.map((userId) => ({
            notification_id: notification.id,
            user_id: userId,
            read_at: null,
          })),
        );

      if (recipientsError) {
        this.logger.error(
          `Failed to create recipients for ${notification.id}: ${recipientsError.message}`,
        );
        await supabase.from('notifications').delete().eq('id', notification.id);
        throw new HttpException(
          {
            error: {
              code: 'FAILED_TO_CREATE_RECIPIENTS',
              message: 'Failed to create notification recipients',
            },
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    return {
      notification: this.mapAdminNotification(notification, recipientIds.length, 0),
      recipientCount: recipientIds.length,
    };
  }

  async getAdminNotifications() {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*, notification_recipients(id, read_at)')
      .eq('notification_type', 'system')
      .like('reference_type', `${ADMIN_NOTIFICATION_REFERENCE_PREFIX}%`)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to get admin notifications: ${error.message}`);
      throw new HttpException(
        {
          error: {
            code: 'FAILED_TO_GET_NOTIFICATIONS',
            message: 'Failed to get notifications',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return (data || []).map((notification: any) => {
      const recipients = notification.notification_recipients || [];
      const readCount = recipients.filter((recipient: any) => recipient.read_at).length;
      return this.mapAdminNotification(notification, recipients.length, readCount);
    });
  }

  async revokeAdminNotification(notificationId: string) {
    const supabase = this.supabaseService.getAdminClient();
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('id, status, sent_at')
      .eq('id', notificationId)
      .eq('notification_type', 'system')
      .like('reference_type', `${ADMIN_NOTIFICATION_REFERENCE_PREFIX}%`)
      .maybeSingle();

    if (notificationError || !notification) {
      throw new NotFoundException('Admin notification not found');
    }

    if (notification.status === 'cancelled') {
      return {
        id: notification.id,
        status: 'cancelled',
        previousStatus: 'cancelled',
      };
    }

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ status: 'cancelled' })
      .eq('id', notificationId)
      .in('status', ['scheduled', 'sent']);

    if (updateError) {
      this.logger.error(
        `Failed to revoke admin notification ${notificationId}: ${updateError.message}`,
      );
      throw new HttpException(
        {
          error: {
            code: 'FAILED_TO_REVOKE_NOTIFICATION',
            message: 'Failed to revoke notification',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      id: notification.id,
      status: 'cancelled',
      previousStatus: notification.status,
    };
  }

  async getLearnerNotifications(learnerId: string) {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('notification_recipients')
      .select(
        'id, read_at, notifications!inner(id, title, content, sent_at, status, notification_type)',
      )
      .eq('user_id', learnerId)
      .eq('notifications.status', 'sent')
      .eq('notifications.notification_type', 'system');

    if (error) {
      this.logger.error(
        `Failed to get learner notifications for ${learnerId}: ${error.message}`,
      );
      throw new HttpException(
        {
          error: {
            code: 'FAILED_TO_GET_NOTIFICATIONS',
            message: 'Failed to get notifications',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const notifications = (data || [])
      .map((recipient: any) => ({
        id: recipient.notifications.id,
        recipientId: recipient.id,
        title: recipient.notifications.title,
        content: recipient.notifications.content,
        sentAt: recipient.notifications.sent_at,
        readAt: recipient.read_at,
      }))
      .sort(
        (left, right) =>
          new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime(),
      );

    return {
      notifications: notifications.slice(0, 5),
      unreadCount: notifications.filter((notification) => !notification.readAt)
        .length,
    };
  }

  async markLearnerNotificationRead(learnerId: string, notificationId: string) {
    const supabase = this.supabaseService.getAdminClient();
    const { data: recipient, error: recipientError } = await supabase
      .from('notification_recipients')
      .select('id, read_at, notifications!inner(status, notification_type)')
      .eq('notification_id', notificationId)
      .eq('user_id', learnerId)
      .eq('notifications.status', 'sent')
      .eq('notifications.notification_type', 'system')
      .maybeSingle();

    if (recipientError || !recipient) {
      throw new NotFoundException('Notification not found');
    }

    if (recipient.read_at) {
      return { notificationId, readAt: recipient.read_at };
    }

    const readAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('notification_recipients')
      .update({ read_at: readAt })
      .eq('id', recipient.id)
      .eq('user_id', learnerId)
      .is('read_at', null);

    if (updateError) {
      this.logger.error(
        `Failed to mark notification ${notificationId} as read: ${updateError.message}`,
      );
      throw new HttpException(
        {
          error: {
            code: 'FAILED_TO_MARK_NOTIFICATION_READ',
            message: 'Failed to mark notification as read',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { notificationId, readAt };
  }

  private async getAdminRecipientIds(audience: AdminNotificationRecipientAudience) {
    const supabase = this.supabaseService.getAdminClient();
    let query = supabase.from('profiles').select('id');

    if (audience === 'all') {
      // Thông báo hệ thống của Admin chỉ dành cho các vai trò vận hành/tiếp nhận,
      // không tự gửi lại cho tài khoản Admin.
      query = query.in('role', ['learner', 'content_manager']);
    } else {
      query = query.eq('role', audience);
    }

    const { data, error } = await query;
    if (error) {
      this.logger.error(
        `Failed to resolve ${audience} notification recipients: ${error.message}`,
      );
      throw new HttpException(
        {
          error: {
            code: 'FAILED_TO_RESOLVE_RECIPIENTS',
            message: 'Failed to resolve notification recipients',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return (data || []).map((profile: { id: string }) => profile.id);
  }

  private async publishDueAdminNotifications() {
    if (this.isPublishingScheduledNotifications) return;
    this.isPublishingScheduledNotifications = true;

    try {
      const now = new Date().toISOString();
      const { error } = await this.supabaseService
        .getAdminClient()
        .from('notifications')
        .update({ status: 'sent', sent_at: now })
        .eq('notification_type', 'system')
        .like('reference_type', `${ADMIN_NOTIFICATION_REFERENCE_PREFIX}%`)
        .eq('status', 'scheduled')
        .lte('scheduled_at', now);

      if (error) {
        this.logger.error(
          `Failed to publish scheduled admin notifications: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.error('Unexpected error while publishing scheduled notifications', error);
    } finally {
      this.isPublishingScheduledNotifications = false;
    }
  }

  private mapAdminNotification(
    notification: any,
    recipientCount: number,
    readCount: number,
  ) {
    return {
      id: notification.id,
      title: notification.title,
      content: notification.content,
      type: this.getAdminNotificationType(notification.reference_type),
      audience: this.getAdminNotificationAudience(notification),
      recipients: recipientCount,
      read: readCount,
      status: notification.status,
      sentAt: notification.sent_at,
      scheduledAt: notification.scheduled_at,
      createdAt: notification.created_at,
      sendEmail: notification.send_email,
    };
  }

  private getAdminNotificationType(referenceType: string | null): AdminNotificationType {
    const type = referenceType?.replace(ADMIN_NOTIFICATION_REFERENCE_PREFIX, '');
    return type === 'Warning' || type === 'Maintenance' ? type : 'General';
  }

  private getAdminNotificationAudience(notification: any): AdminNotificationAudience {
    if (notification.scope_type === 'all') return 'all';
    return notification.scope_value === 'content_manager' || notification.scope_value === 'admin'
      ? notification.scope_value
      : 'learner';
  }
}
