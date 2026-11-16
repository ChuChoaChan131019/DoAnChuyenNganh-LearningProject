import { BadRequestException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DiscussionReportsService } from './discussion-reports.service.js';

const dto = {
  target_type: 'post' as const,
  target_id: '00000000-0000-4000-8000-000000000001',
  reason: 'Nội dung cần được xem xét',
};

function serviceWithError(code: string) {
  const single = vi.fn().mockResolvedValue({ data: null, error: { code, message: 'database error' } });
  const db = { from: () => ({ insert: () => ({ select: () => ({ single }) }) }) };
  const posts = { assertPostAccessible: vi.fn().mockResolvedValue({ id: dto.target_id }) };
  return new DiscussionReportsService({ getClient: () => db } as never, posts as never);
}

describe('D04 report submission errors', () => {
  it('explains when the reports migration is missing', async () => {
    await expect(serviceWithError('PGRST205').create(dto, 'learner'))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('identifies an already pending report', async () => {
    await expect(serviceWithError('23505').create(dto, 'learner'))
      .rejects.toBeInstanceOf(ConflictException);
  });
});

describe('Admin report filters and context', () => {
  it('rejects invalid content filters before querying', async () => {
    await expect(serviceWithError('unused').list('all', '20', '0', 'invalid'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['post', 'comment'] as const)('filters %s before pagination and retains parent context', async (target) => {
    const query = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [{
        id: 'report', post_id: target === 'post' ? 'parent' : null,
        comment_id: target === 'comment' ? 'comment' : null,
        post: target === 'post' ? { id: 'parent', title: 'Title', content: 'Parent content' } : null,
        comment: target === 'comment' ? { id: 'comment', post_id: 'parent', content: 'Reported comment' } : null,
      }], count: 1, error: null }),
    };
    const parentQuery = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({
      data: [{ id: 'parent', title: 'Title', content: 'Parent content' }], error: null,
    }) };
    const db = { from: (table: string) => table === 'discussion_reports' ? query : parentQuery };
    const service = new DiscussionReportsService({ getClient: () => db } as never, {} as never);
    const result = await service.list('pending', '20', '0', target);
    expect(query.eq).toHaveBeenCalledWith('status', 'pending');
    expect(query.not).toHaveBeenCalledWith(`${target}_id`, 'is', null);
    expect(query.not.mock.invocationCallOrder[0]).toBeLessThan(query.range.mock.invocationCallOrder[0]);
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({ target_type: target, post_content: 'Parent content' });
  });
});
