import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';

@Injectable()
export class AuthoringNotificationsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(recipientId: string, rawOffset = '0') {
    const offset = Number(rawOffset);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new BadRequestException('Offset không hợp lệ.');
    const { data, error } = await this.supabase.getAdminClient()
      .from('authoring_notifications')
      .select('id,target_type,target_id,title,reason,created_at,read_at')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false })
      .range(offset, offset + 50);
    if (error) throw new InternalServerErrorException('Không thể tải thông báo.');
    const rows = data ?? [];
    return { items: rows.slice(0, 50), has_more: rows.length > 50 };
  }

  async unreadCount(recipientId: string) {
    const { count, error } = await this.supabase.getAdminClient()
      .from('authoring_notifications')
      .select('id', { head: true, count: 'exact' })
      .eq('recipient_id', recipientId)
      .is('read_at', null);
    if (error) throw new InternalServerErrorException('Không thể tải số thông báo chưa đọc.');
    return { count: count ?? 0 };
  }

  async markRead(recipientId: string, id: string) {
    const { data, error } = await this.supabase.getAdminClient()
      .from('authoring_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', recipientId)
      .eq('id', id)
      .select('id,read_at')
      .maybeSingle();
    if (error) throw new InternalServerErrorException('Không thể cập nhật thông báo.');
    if (!data) throw new NotFoundException('Không tìm thấy thông báo.');
    return data;
  }
}
