import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
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
