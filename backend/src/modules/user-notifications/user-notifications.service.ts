import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';

@Injectable()
export class UserNotificationsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(userId: string, rawOffset = '0', unreadOnly = false) {
    const offset = Number(rawOffset);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new BadRequestException('Offset không hợp lệ.');
    const db = this.supabase.getAdminClient();
    let query = db.from('user_notifications')
      .select('id,event_type,target_type,target_id,title,body,href,created_at,read_at,metadata', { count: 'exact' })
      .eq('recipient_id', userId);
    if (unreadOnly) query = query.is('read_at', null);
    const [{ data, error, count }, { count: unread, error: unreadError }] = await Promise.all([
      query.order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 29),
      db.from('user_notifications').select('id', { head: true, count: 'exact' }).eq('recipient_id', userId).is('read_at', null),
    ]);
    if (error || unreadError) throw new InternalServerErrorException('Không thể tải thông báo.');
    return { items: data ?? [], total: count ?? 0, unread: unread ?? 0, offset, limit: 30 };
  }

  async unreadCount(userId: string) {
    const { count, error } = await this.supabase.getAdminClient().from('user_notifications')
      .select('id', { head: true, count: 'exact' }).eq('recipient_id', userId).is('read_at', null);
    if (error) throw new InternalServerErrorException('Không thể tải số thông báo chưa đọc.');
    return { count: count ?? 0 };
  }

  async markRead(userId: string, id: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db.from('user_notifications')
      .update({ read_at: new Date().toISOString() }).eq('id', id).eq('recipient_id', userId)
      .select('id,read_at').maybeSingle();
    if (error) throw new InternalServerErrorException('Không thể cập nhật thông báo.');
    if (!data) throw new NotFoundException('Không tìm thấy thông báo.');
    return data;
  }

  async follows(userId: string, courseId: string) {
    const { data, error } = await this.supabase.getAdminClient().from('user_course_follows')
      .select('course_id').eq('learner_id', userId).eq('course_id', courseId).maybeSingle();
    if (error) throw new InternalServerErrorException('Không thể kiểm tra theo dõi khóa học.');
    return { following: Boolean(data) };
  }

  async follow(userId: string, courseId: string) {
    const db = this.supabase.getAdminClient();
    const [{ data: profile, error: profileError }, { data: course, error: courseError }] = await Promise.all([
      db.from('profiles').select('role').eq('id', userId).maybeSingle(),
      db.from('courses').select('id').eq('id', courseId).eq('status', 'published').maybeSingle(),
    ]);
    if (profileError || courseError) throw new InternalServerErrorException('Không thể theo dõi khóa học.');
    if (!course) throw new NotFoundException('Không tìm thấy khóa học.');
    if (profile?.role !== 'learner') throw new BadRequestException('Chỉ học viên mới có thể theo dõi khóa học.');
    const { error } = await db.from('user_course_follows').upsert({ learner_id: userId, course_id: courseId }, { onConflict: 'learner_id,course_id', ignoreDuplicates: true });
    if (error) throw new InternalServerErrorException('Không thể theo dõi khóa học.');
    return { following: true };
  }

  async unfollow(userId: string, courseId: string) {
    const { error } = await this.supabase.getAdminClient().from('user_course_follows')
      .delete().eq('learner_id', userId).eq('course_id', courseId);
    if (error) throw new InternalServerErrorException('Không thể bỏ theo dõi khóa học.');
    return { following: false };
  }
}
