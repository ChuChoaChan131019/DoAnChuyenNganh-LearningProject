import { describe, expect, it, vi } from 'vitest';
import { DiscussionNotificationsService } from './discussion-notifications.service.js';

function setup() {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: [], count: 0 }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  };
  const db = { from: vi.fn().mockReturnValue(query) };
  return { query, db, service: new DiscussionNotificationsService({ getClient: () => db } as never) };
}

describe('Private discussion notifications', () => {
  it('scopes both list and unread count to authenticated recipient', async () => {
    const { query, service } = setup();
    await service.list('owner');
    expect(query.eq.mock.calls).toEqual([['recipient_id', 'owner'], ['recipient_id', 'owner']]);
  });
  it('does not update another recipient notification or reveal it', async () => {
    const { query, service } = setup();
    await expect(service.read('other-user', 'notification')).rejects.toThrow('Không tìm thấy thông báo');
    expect(query.eq.mock.calls).toEqual([
      ['id', 'notification'], ['recipient_id', 'other-user'],
      ['id', 'notification'], ['recipient_id', 'other-user'],
    ]);
    expect(query.is).toHaveBeenCalledWith('read_at', null);
  });
  it('rejects invalid pagination before a database call', async () => {
    const { db, service } = setup();
    await expect(service.list('owner', '-1')).rejects.toThrow('Phân trang không hợp lệ');
    expect(db.from).not.toHaveBeenCalled();
  });
});
