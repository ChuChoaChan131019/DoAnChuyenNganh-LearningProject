import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';

@Injectable()
export class DiscussionNotificationsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(userId: string, rawOffset = '0') {
    const offset = Number(rawOffset);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new BadRequestException('Phân trang không hợp lệ');
    const db = this.supabase.getClient();
    const [items, unread] = await Promise.all([
      db.from('discussion_notifications')
        .select('id, target_type, decision, post_title, content_excerpt, reason, created_at, read_at', { count: 'exact' })
        .eq('recipient_id', userId).order('created_at', { ascending: false }).order('id', { ascending: false })
        .range(offset, offset + 19),
      db.from('discussion_notifications').select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId).is('read_at', null),
    ]);
    if (items.error || unread.error) throw new InternalServerErrorException('Không thể tải thông báo');
    return { items: items.data ?? [], total: items.count ?? 0, unread: unread.count ?? 0, offset, limit: 20 };
  }

  async read(userId: string, id: string) {
    const db = this.supabase.getClient();
    const result = await db.from('discussion_notifications').update({ read_at: new Date().toISOString() })
      .eq('id', id).eq('recipient_id', userId).is('read_at', null);
    if (result.error) throw new InternalServerErrorException('Không thể cập nhật thông báo');
    const { data, error } = await db.from('discussion_notifications').select('id, read_at')
      .eq('id', id).eq('recipient_id', userId).maybeSingle();
    if (error) throw new InternalServerErrorException('Không thể cập nhật thông báo');
    if (!data) throw new NotFoundException('Không tìm thấy thông báo');
    return data;
  }
}
